import { describe, expect, it } from "vitest";
import { Validator, type Schema } from "@cfworker/json-schema";
import fixture from "../../../../../../docs/contracts/hardware-asset-linking-v1.json";
import {
  buildCatalog,
  canonicalJson,
  compareUtf16,
  hasValidUnicode,
  normalizeTelemetryIdentifier,
  resolveBatch,
  sha256Revision,
  TELEMETRY_LIMITS,
  TELEMETRY_TTL_MS,
} from "./domain";
import {
  TelemetryCatalogReq,
  TelemetryResolveBatchReq,
  type TelemetryCatalogContent,
  type TelemetryResolveItem,
} from "./model";
import { TelemetryError } from "./errors";

const {
  hostA,
  hostB,
  diskD,
  diskE,
  transitionTimeUtc: transition,
  nowTimeUtc: now,
} = fixture.catalogFixture;

function content(host = hostA): TelemetryCatalogContent {
  // The shared JSON fixture is validated by buildCatalog at this boundary.
  return structuredClone({
    ...fixture.catalogFixture.contentA,
    host: { ...fixture.catalogFixture.contentA.host, assetId: host },
  }) as TelemetryCatalogContent;
}
function item(
  overrides: Partial<TelemetryResolveItem> = {}
): TelemetryResolveItem {
  return {
    requestId: "sample-1",
    observedTimeUtc: transition - 1,
    identifiers: [
      {
        identifierType: "wwn",
        namespace: "storage.wwn",
        value: "5000000000000001",
      },
    ],
    ...overrides,
  };
}
const sn = () => ({
  identifierType: "sn",
  namespace: "storage.serial",
  value: '00-SN/中😀:\n"\\',
});
async function one(input = item(), source = content(), clock = now) {
  return resolveBatch(await buildCatalog(source, now), [input], clock)
    .results[0];
}

describe("telemetry canonical JSON cross-language contract", () => {
  it.each(fixture.canonicalVectors)(
    "matches frozen $name JSON and SHA-256",
    async ({ value, canonical, revision }) => {
      expect(canonicalJson(value)).toBe(canonical);
      expect(await sha256Revision(value)).toBe(revision);
    }
  );
  it("serializes numeric object keys manually rather than using JSON.stringify object ordering", () => {
    const value = { "2": "two", "10": "ten", "01": "one" };
    expect(canonicalJson(value)).toBe('{"01":"one","10":"ten","2":"two"}');
    expect(canonicalJson(value)).not.toBe(JSON.stringify(value));
    expect(compareUtf16("😀", "\ue000")).toBe(-1);
  });
  it.each([
    undefined,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    9007199254740992,
    1n,
    Symbol("key"),
    () => 1,
    new Date(0),
    new String("boxed"),
    "\ud800",
    "\udc00",
    "a\ud800b",
  ])(
    "rejects unsupported or noncanonical values without coercion (%#)",
    (value) => {
      expect(() => canonicalJson(value)).toThrow(TypeError);
    }
  );
  it("rejects sparse arrays, accessors, symbols and hidden properties without invoking a getter", () => {
    expect(() => canonicalJson(new Array(2))).toThrow(TypeError);
    let invoked = false;
    const accessor = Object.defineProperty({}, "private", {
      enumerable: true,
      get: () => {
        invoked = true;
        return "not for serialization";
      },
    });
    expect(() => canonicalJson(accessor)).toThrow(TypeError);
    expect(invoked).toBe(false);
    expect(() => canonicalJson({ [Symbol("private")]: 1 })).toThrow(TypeError);
    expect(() =>
      canonicalJson(Object.defineProperty({}, "hidden", { value: 1 }))
    ).toThrow(TypeError);
  });
  it("rejects cycles and nonplain objects, allows shared values, and normalizes negative zero", () => {
    const cycle: { self?: unknown } = {};
    cycle.self = cycle;
    expect(() => canonicalJson(cycle)).toThrow(TypeError);
    expect(() => canonicalJson(Object.create({ inherited: true }))).toThrow(
      TypeError
    );
    const shared = { value: 1 };
    expect(canonicalJson([shared, shared, -0])).toBe(
      '[{"value":1},{"value":1},0]'
    );
    expect(hasValidUnicode("中文😀")).toBe(true);
  });
});

describe("telemetry complete catalog", () => {
  it.each(fixture.normalizationVectors)(
    "mirrors ECMAScript whitespace normalization for $identifierType (%#)",
    ({ identifierType, value, normalized }) => {
      expect(normalizeTelemetryIdentifier(identifierType, value)).toBe(
        normalized
      );
    }
  );
  it("has the shared frozen revision, a fixed lease and no dependency on output clock in its hash", async () => {
    const first = await buildCatalog(content(), now);
    const later = await buildCatalog(content(), now + 1);
    expect(first.revision).toBe(fixture.catalogFixture.expectedRevisionA);
    expect((await buildCatalog(content(hostB), now)).revision).toBe(
      fixture.catalogFixture.expectedRevisionB
    );
    expect(later.revision).toBe(first.revision);
    expect(first.expiresTimeUtc).toBe(now + TELEMETRY_TTL_MS);
    expect(later.expiresTimeUtc).toBe(first.expiresTimeUtc + 1);
  });
  it("sorts every array without mutating its input and hashes real content changes", async () => {
    const source = content();
    source.assets.reverse();
    for (const asset of source.assets) {
      asset.identifiers.reverse();
      asset.assignments.reverse();
    }
    const before = structuredClone(source);
    const catalog = await buildCatalog(source, now);
    expect(source).toEqual(before);
    expect(catalog.revision).toBe(fixture.catalogFixture.expectedRevisionA);
    source.assets[0].model = "changed model";
    expect((await buildCatalog(source, now)).revision).not.toBe(
      catalog.revision
    );
  });
  it("normalizes a WWN before publishing its canonical value", async () => {
    const source = content();
    source.assets[0].identifiers[0].value = "0x50:00-00 00 00 00 00 01";
    expect((await buildCatalog(source, now)).revision).toBe(
      fixture.catalogFixture.expectedRevisionA
    );
  });
  it.each([Number.NaN, -1, Number.MAX_SAFE_INTEGER])(
    "rejects invalid lease clocks (%s)",
    async (clock) => {
      await expect(buildCatalog(content(), clock)).rejects.toMatchObject({
        code: TelemetryError.INVALID_CATALOG,
      });
    }
  );
  it("rejects inconsistent state, duplicate assets, invalid intervals and unpaired Unicode", async () => {
    const retired = content();
    retired.assets[0].status = "retired";
    const duplicate = content();
    duplicate.assets.push(structuredClone(duplicate.assets[0]));
    const interval = content();
    interval.assets[0].assignments[0].validToUtc =
      interval.assets[0].assignments[0].validFromUtc;
    const unicode = content();
    unicode.assets[0].model = "\ud800";
    for (const source of [retired, duplicate, interval, unicode])
      await expect(buildCatalog(source, now)).rejects.toMatchObject({
        code: TelemetryError.INVALID_CATALOG,
      });
  });
  it.each(["assets", "identifiers", "assignments"] as const)(
    "rejects an oversized %s collection as a whole",
    async (field) => {
      const source = content();
      if (field === "assets")
        source.assets = Array.from(
          { length: TELEMETRY_LIMITS.assets + 1 },
          () => structuredClone(source.assets[0])
        );
      if (field === "identifiers")
        source.assets[0].identifiers = Array.from(
          { length: TELEMETRY_LIMITS.identifiers + 1 },
          () => structuredClone(source.assets[0].identifiers[0])
        );
      if (field === "assignments")
        source.assets[0].assignments = Array.from(
          { length: TELEMETRY_LIMITS.assignments + 1 },
          () => structuredClone(source.assets[0].assignments[0])
        );
      await expect(buildCatalog(source, now)).rejects.toMatchObject({
        code: TelemetryError.CATALOG_TOO_LARGE,
      });
    }
  );
  it("applies the UTF-8 response byte budget independently of row counts", async () => {
    const source = content();
    source.assets = [source.assets[0]];
    source.assets[0].identifiers = Array.from(
      { length: TELEMETRY_LIMITS.identifiers },
      (_, index) => ({
        identifierType: "sn",
        namespace: "storage.serial",
        value: `SN-${"中".repeat(100)}-${index}`,
        effectiveFromUtc: transition - 1,
      })
    );
    await expect(buildCatalog(source, now)).rejects.toMatchObject({
      code: TelemetryError.CATALOG_TOO_LARGE,
    });
  });
});

describe("telemetry observations across a disk migration", () => {
  it.each(fixture.resolveCases)(
    "matches shared migration result: $name",
    async (sample) => {
      const result = await one(
        item({
          observedTimeUtc: sample.observedTimeUtc,
          identifiers: [
            {
              identifierType: "wwn",
              namespace: "storage.wwn",
              value: sample.wwn,
            },
          ],
        }),
        content(sample.hostAssetId)
      );
      expect(result.reasonCode).toBe(sample.expectedReason);
      expect(result.mapping?.assetId ?? null).toBe(sample.expectedAssetId);
      expect(result.mapping?.assignmentId ?? null).toBe(
        sample.expectedAssignmentId
      );
    }
  );
  it("keeps independent metrics for multiple disks and a previously frozen decision unchanged", async () => {
    const catalog = await buildCatalog(content(), now);
    const first = resolveBatch(
      catalog,
      [
        item({ requestId: "disk-d" }),
        item({
          requestId: "disk-e",
          identifiers: [
            {
              identifierType: "wwn",
              namespace: "storage.wwn",
              value: "5000000000000002",
            },
          ],
        }),
      ],
      now
    );
    expect(first.results.map((entry) => entry.mapping?.assetId)).toEqual([
      diskD,
      diskE,
    ]);
    const frozen = canonicalJson(first);
    const changed = content();
    changed.assets[0].identifiers[0].value = "5000000000000003";
    await buildCatalog(changed, now + 1);
    expect(canonicalJson(first)).toBe(frozen);
    expect(resolveBatch(catalog, [item()], now).results[0]).toEqual(
      first.results[0] && { ...first.results[0], requestId: "sample-1" }
    );
  });
  it("accepts the last millisecond of the lease and expires exactly at its boundary", async () => {
    const catalog = await buildCatalog(content(), now);
    expect(
      resolveBatch(catalog, [item()], catalog.expiresTimeUtc - 1).results[0]
        .reasonCode
    ).toBe("MATCHED");
    expect(
      resolveBatch(
        catalog,
        [item({ observedTimeUtc: Number.NaN, identifiers: [] })],
        catalog.expiresTimeUtc
      ).results[0].reasonCode
    ).toBe("CATALOG_EXPIRED");
    expect(catalog.expiresTimeUtc).toBe(now + TELEMETRY_TTL_MS);
  });
  it("checks observation clock before identifiers with an inclusive five-minute tolerance", async () => {
    const source = content();
    source.assets[0].assignments[0].validToUtc = null;
    source.assets[0].assignments.pop();
    expect(
      (await one(item({ observedTimeUtc: now + 300000 }), source)).reasonCode
    ).toBe("MATCHED");
    expect(
      (await one(item({ observedTimeUtc: now + 300001, identifiers: [] })))
        .reasonCode
    ).toBe("INVALID_OBSERVATION_TIME");
    for (const value of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect((await one(item({ observedTimeUtc: value }))).reasonCode).toBe(
        "INVALID_OBSERVATION_TIME"
      );
  });
  it("uses fixed namespace-before-format priority independent of identifier order", async () => {
    const aliases = [
      { identifierType: "wwn", namespace: "storage.wwn", value: "unknown" },
      { identifierType: "sid", namespace: "unsupported", value: "value" },
    ];
    expect((await one(item({ identifiers: aliases }))).reasonCode).toBe(
      "UNSUPPORTED_NAMESPACE"
    );
    expect(
      (await one(item({ identifiers: aliases.reverse() }))).reasonCode
    ).toBe("UNSUPPORTED_NAMESPACE");
    expect((await one(item({ identifiers: [] }))).reasonCode).toBe(
      "MISSING_IDENTIFIER"
    );
  });
  it.each([
    "",
    "unknown",
    "0000000000000000",
    "ffffffffffffffff",
    "not available",
    "1234",
    "a".repeat(32),
    "\ud800",
  ])("rejects unreliable WWN %j without guessing", async (value) => {
    expect(
      (
        await one(
          item({
            identifiers: [
              { identifierType: "wwn", namespace: "storage.wwn", value },
            ],
          })
        )
      ).reasonCode
    ).toBe("INVALID_IDENTIFIER");
  });
  it("keeps serial case, separators and leading zeroes and requires an exact trimmed model", async () => {
    const serial = sn();
    expect(normalizeTelemetryIdentifier("sn", ` ${serial.value} `)).toBe(
      serial.value
    );
    expect((await one(item({ identifiers: [serial] }))).reasonCode).toBe(
      "MODEL_REQUIRED"
    );
    expect(
      (await one(item({ identifiers: [serial], model: "different" })))
        .reasonCode
    ).toBe("MODEL_MISMATCH");
    expect(
      (
        await one(
          item({
            identifiers: [serial],
            model: ` ${content().assets[0].model} `,
          })
        )
      ).reasonCode
    ).toBe("MATCHED");
    expect(
      (
        await one(
          item({
            identifiers: [{ ...serial, value: serial.value.toLowerCase() }],
            model: content().assets[0].model,
          })
        )
      ).reasonCode
    ).toBe("IDENTIFIER_UNMAPPED");
  });
  it("never falls back from an unknown WWN to a known serial", async () => {
    expect(
      (
        await one(
          item({
            identifiers: [
              {
                identifierType: "wwn",
                namespace: "storage.wwn",
                value: "5000000000000099",
              },
              sn(),
            ],
            model: content().assets[0].model,
          })
        )
      ).reasonCode
    ).toBe("WWN_UNMAPPED");
  });
  it("checks all identity contradictions before missing WWNs and before model checks", async () => {
    const aliases = [
      item().identifiers[0],
      {
        identifierType: "wwn",
        namespace: "storage.wwn",
        value: "5000000000000002",
      },
      {
        identifierType: "wwn",
        namespace: "storage.wwn",
        value: "5000000000000099",
      },
    ];
    const result = await one(item({ identifiers: aliases }));
    expect(result).toMatchObject({
      status: "conflict",
      reasonCode: "IDENTIFIERS_DISAGREE",
      mapping: null,
    });
    expect(
      (await one(item({ identifiers: aliases.reverse() }))).reasonCode
    ).toBe("IDENTIFIERS_DISAGREE");
  });
  it("detects the same identity unexpectedly assigned to two assets", async () => {
    const source = content();
    source.assets[1].identifiers[0].value =
      source.assets[0].identifiers[0].value;
    expect((await one(item(), source)).reasonCode).toBe("IDENTIFIERS_DISAGREE");
  });
  it("uses WWN as the effective-time proof and serial only to detect contradictions", async () => {
    const source = content();
    source.assets[0].identifiers[1].effectiveFromUtc = transition;
    expect(
      (await one(item({ identifiers: [...item().identifiers, sn()] }), source))
        .reasonCode
    ).toBe("MATCHED");
    expect(
      (
        await one(
          item({ identifiers: [sn()], model: source.assets[0].model }),
          source
        )
      ).reasonCode
    ).toBe("IDENTIFIER_NOT_EFFECTIVE");
    expect(
      (await one(item({ observedTimeUtc: transition - 10001 }), source))
        .reasonCode
    ).toBe("IDENTIFIER_NOT_EFFECTIVE");
  });
  it("takes the latest effective time of multiple used proofs", async () => {
    const source = content();
    source.assets[0].identifiers.push({
      identifierType: "wwn",
      namespace: "storage.wwn",
      value: "5000000000000003",
      effectiveFromUtc: transition,
    });
    expect(
      (
        await one(
          item({
            identifiers: [
              ...item().identifiers,
              {
                identifierType: "wwn",
                namespace: "storage.wwn",
                value: "5000000000000003",
              },
            ],
          }),
          source
        )
      ).reasonCode
    ).toBe("IDENTIFIER_NOT_EFFECTIVE");
  });
  it("applies disk retirement before host retirement and both before assignment checks", async () => {
    const source = content();
    source.assets[0].status = "retired";
    source.assets[0].retiredTimeUtc = transition;
    source.host.status = "retired";
    source.host.retiredTimeUtc = transition;
    expect(
      (await one(item({ observedTimeUtc: transition }), source)).reasonCode
    ).toBe("ASSET_RETIRED");
    source.assets[0].retiredTimeUtc = transition + 1;
    expect(
      (await one(item({ observedTimeUtc: transition }), source)).reasonCode
    ).toBe("HOST_RETIRED");
    expect(
      (await one(item({ observedTimeUtc: transition - 1 }), source)).reasonCode
    ).toBe("MATCHED");
  });
  it("distinguishes missing, conflicting and mismatching half-open assignments", async () => {
    const missing = content();
    missing.assets[0].assignments = [];
    expect((await one(item(), missing)).reasonCode).toBe("ASSIGNMENT_MISSING");
    const overlap = content();
    overlap.assets[0].assignments[0].validToUtc = null;
    expect(
      await one(item({ observedTimeUtc: transition }), overlap)
    ).toMatchObject({
      status: "conflict",
      reasonCode: "ASSIGNMENT_CONFLICT",
      mapping: null,
    });
    const unhosted = content();
    unhosted.assets[0].assignments[0].hostAssetId = null;
    expect((await one(item(), unhosted)).reasonCode).toBe("HOST_MISMATCH");
  });
  it("rejects repeated request IDs and oversized batches without partial results", async () => {
    const catalog = await buildCatalog(content(), now);
    expect(() => resolveBatch(catalog, [item(), item()], now)).toThrow();
    expect(() => resolveBatch(catalog, [], now)).toThrow();
    expect(() =>
      resolveBatch(
        catalog,
        Array.from({ length: 101 }, (_, index) =>
          item({ requestId: String(index) })
        ),
        now
      )
    ).toThrow();
  });
});

describe("telemetry API schemas", () => {
  it("requires a version and rejects fields outside the fixed identity scope", () => {
    const schema: Schema = JSON.parse(JSON.stringify(TelemetryCatalogReq));
    const validator = new Validator(schema);
    expect(
      validator.validate({
        contractVersion: 1,
        tenantId: 1,
        hostAssetId: hostA,
      }).valid
    ).toBe(true);
    expect(validator.validate({ tenantId: 1, hostAssetId: hostA }).valid).toBe(
      false
    );
    expect(
      validator.validate({
        contractVersion: 1,
        tenantId: 1,
        hostAssetId: hostA,
        permissionCode: "anything",
      }).valid
    ).toBe(false);
  });
  it("lets domain rules classify unsupported namespaces, but rejects invalid observation structure", () => {
    const schema: Schema = JSON.parse(JSON.stringify(TelemetryResolveBatchReq));
    const validator = new Validator(schema);
    const request = {
      contractVersion: 1,
      tenantId: 1,
      hostAssetId: hostA,
      items: [
        item({
          identifiers: [
            {
              identifierType: "other",
              namespace: "not-supported",
              value: "synthetic",
            },
          ],
        }),
      ],
    };
    expect(validator.validate(request).valid).toBe(true);
    request.items[0].observedTimeUtc = -1;
    expect(validator.validate(request).valid).toBe(false);
  });
});
