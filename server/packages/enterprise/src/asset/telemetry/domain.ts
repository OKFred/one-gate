import { Validator, type Schema } from "@cfworker/json-schema";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import {
  TelemetryCatalogContentSchema,
  type TelemetryAsset,
  type TelemetryCatalog,
  type TelemetryCatalogContent,
  type TelemetryIdentifier,
  type TelemetryReasonCode,
  type TelemetryResolveBatchResult,
  type TelemetryResolveItem,
  type TelemetryResolveResult,
} from "./model";
import { TelemetryError } from "./errors";

export const TELEMETRY_NAMESPACES = {
  wwn: "storage.wwn",
  sn: "storage.serial",
} as const;
export const TELEMETRY_LIMITS = {
  joinRows: 5000,
  assets: 1000,
  identifiers: 4000,
  assignments: 4000,
  responseBytes: 1048576,
  batchItems: 100,
  itemIdentifiers: 4,
} as const;
export const TELEMETRY_TTL_MS = 900000;
export const TELEMETRY_CLOCK_SKEW_MS = 300000;
// Copy our trusted constant to satisfy the validator's mutable schema interface.
const validatorSchema: Schema = JSON.parse(
  JSON.stringify(TelemetryCatalogContentSchema)
);
const catalogValidator = new Validator(validatorSchema);

/** JavaScript relational string comparison uses unsigned UTF-16 code units. */
export function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function hasValidUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}

/** Restricted canonical JSON; never invokes getters, toJSON, or integer-key object ordering. */
export function canonicalJson(value: unknown): string {
  const ancestors = new Set<object>();
  let visited = 0;
  function encode(current: unknown, depth: number): string {
    visited += 1;
    if (depth > 100 || visited > 100000)
      throw new TypeError("Canonical JSON limit exceeded");
    if (current === null) return "null";
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "number") {
      if (!Number.isSafeInteger(current))
        throw new TypeError("Canonical JSON requires safe integers");
      return JSON.stringify(current);
    }
    if (typeof current === "string") {
      if (!hasValidUnicode(current))
        throw new TypeError("Canonical JSON requires valid Unicode");
      return JSON.stringify(current);
    }
    if (typeof current !== "object")
      throw new TypeError("Unsupported canonical JSON value");
    if (ancestors.has(current))
      throw new TypeError("Cyclic canonical JSON value");
    const array = Array.isArray(current);
    const prototype = Object.getPrototypeOf(current);
    if (!array && prototype !== Object.prototype && prototype !== null)
      throw new TypeError("Canonical JSON requires plain objects");
    if (Object.getOwnPropertySymbols(current).length)
      throw new TypeError("Canonical JSON forbids symbol keys");
    ancestors.add(current);
    try {
      const descriptors = Object.getOwnPropertyDescriptors(current);
      const keys = Object.keys(descriptors);
      if (array) {
        if (keys.length !== current.length + 1)
          throw new TypeError("Canonical JSON requires dense arrays");
        const values: string[] = [];
        for (let index = 0; index < current.length; index += 1) {
          const descriptor = descriptors[String(index)];
          if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
            throw new TypeError(
              "Canonical JSON forbids sparse arrays and accessors"
            );
          values.push(encode(descriptor.value, depth + 1));
        }
        return `[${values.join(",")}]`;
      }
      return `{${keys
        .sort(compareUtf16)
        .map((key) => {
          const descriptor = descriptors[key];
          if (!("value" in descriptor) || !descriptor.enumerable)
            throw new TypeError(
              "Canonical JSON forbids hidden properties and accessors"
            );
          return `${encode(key, depth + 1)}:${encode(descriptor.value, depth + 1)}`;
        })
        .join(",")}}`;
    } finally {
      ancestors.delete(current);
    }
  }
  return encode(value, 0);
}

export async function sha256Revision(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalJson(value))
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/** Preserve the existing service's ECMAScript trim, including FEFF but excluding NEL. */
export function trimTelemetryText(value: string): string {
  return value.trim();
}

export function normalizeTelemetryIdentifier(
  identifierType: string,
  value: string
): string | null {
  if (!hasValidUnicode(value)) return null;
  const raw = trimTelemetryText(value);
  const placeholder = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (
    !placeholder ||
    /^(?:0+|f+|na|none|null|unknown|notavailable|defaultstring|tobefilledbyoem|systemserialnumber|serialnumber)$/i.test(
      placeholder
    )
  )
    return null;
  if (identifierType === "wwn") {
    const normalized = raw
      .replace(/^0x/i, "")
      .replace(/[:\s-]/g, "")
      .toLowerCase();
    return /^[0-9a-f]{16}$/.test(normalized) && !/^(?:0+|f+)$/.test(normalized)
      ? normalized
      : null;
  }
  return identifierType === "sn" ? raw : null;
}

function invalidCatalog(): never {
  throw new BusinessError(TelemetryError.INVALID_CATALOG);
}
function tooLarge(): never {
  throw new BusinessError(TelemetryError.CATALOG_TOO_LARGE);
}
function validClock(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
function checkState(value: {
  status: string;
  retiredTimeUtc: number | null;
}): void {
  if ((value.status === "active") !== (value.retiredTimeUtc === null))
    invalidCatalog();
}

export async function buildCatalog(
  content: TelemetryCatalogContent,
  nowTimeUtc: number
): Promise<TelemetryCatalog> {
  if (
    !validClock(nowTimeUtc) ||
    !Number.isSafeInteger(nowTimeUtc + TELEMETRY_TTL_MS)
  )
    invalidCatalog();
  if (content.assets.length > TELEMETRY_LIMITS.assets) tooLarge();
  let identifiers = 0;
  let assignments = 0;
  for (const asset of content.assets) {
    identifiers += asset.identifiers.length;
    assignments += asset.assignments.length;
  }
  if (
    identifiers > TELEMETRY_LIMITS.identifiers ||
    assignments > TELEMETRY_LIMITS.assignments
  )
    tooLarge();
  if (!catalogValidator.validate(content).valid) invalidCatalog();
  checkState(content.host);
  const uniqueAssets = new Set<string>();
  const sorted: TelemetryCatalogContent = {
    contractVersion: 1,
    tenantId: content.tenantId,
    host: { ...content.host },
    assets: content.assets
      .map((asset) => {
        checkState(asset);
        if (uniqueAssets.has(asset.assetId)) invalidCatalog();
        uniqueAssets.add(asset.assetId);
        const normalized = asset.identifiers
          .map((identifier) => {
            if (
              identifier.namespace !==
              TELEMETRY_NAMESPACES[identifier.identifierType]
            )
              invalidCatalog();
            const value = normalizeTelemetryIdentifier(
              identifier.identifierType,
              identifier.value
            );
            if (value === null) invalidCatalog();
            return { ...identifier, value };
          })
          .sort(
            (left, right) =>
              compareUtf16(left.identifierType, right.identifierType) ||
              compareUtf16(left.namespace, right.namespace) ||
              compareUtf16(left.value, right.value) ||
              left.effectiveFromUtc - right.effectiveFromUtc
          );
        const intervals = asset.assignments
          .map((assignment) => {
            if (
              assignment.validToUtc !== null &&
              assignment.validToUtc <= assignment.validFromUtc
            )
              invalidCatalog();
            return { ...assignment };
          })
          .sort(
            (left, right) =>
              left.validFromUtc - right.validFromUtc ||
              left.assignmentId - right.assignmentId ||
              (left.hostAssetId === null
                ? right.hostAssetId === null
                  ? 0
                  : -1
                : right.hostAssetId === null
                  ? 1
                  : compareUtf16(left.hostAssetId, right.hostAssetId))
          );
        return { ...asset, identifiers: normalized, assignments: intervals };
      })
      .sort((left, right) => compareUtf16(left.assetId, right.assetId)),
  };
  let hash: string;
  try {
    hash = await sha256Revision(sorted);
  } catch {
    return invalidCatalog();
  }
  const catalog: TelemetryCatalog = {
    ...sorted,
    revision: hash,
    serverTimeUtc: nowTimeUtc,
    expiresTimeUtc: nowTimeUtc + TELEMETRY_TTL_MS,
  };
  if (
    new TextEncoder().encode(canonicalJson(catalog)).byteLength >
    TELEMETRY_LIMITS.responseBytes
  )
    tooLarge();
  return catalog;
}

type IdentityMatch = { asset: TelemetryAsset; identifier: TelemetryIdentifier };
function identityKey(type: string, namespace: string, value: string): string {
  return canonicalJson([type, namespace, value]);
}
const conflictReasons: ReadonlySet<TelemetryReasonCode> = new Set([
  "IDENTIFIERS_DISAGREE",
  "ASSIGNMENT_CONFLICT",
]);

export function resolveBatch(
  catalog: TelemetryCatalog,
  items: readonly TelemetryResolveItem[],
  nowTimeUtc: number
): TelemetryResolveBatchResult {
  if (!validClock(nowTimeUtc)) invalidCatalog();
  if (
    !items.length ||
    items.length > TELEMETRY_LIMITS.batchItems ||
    new Set(items.map((item) => item.requestId)).size !== items.length ||
    items.some(
      (item) =>
        !item.requestId.trim() ||
        item.identifiers.length > TELEMETRY_LIMITS.itemIdentifiers
    )
  )
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
  const index = new Map<string, IdentityMatch[]>();
  for (const asset of catalog.assets)
    for (const identifier of asset.identifiers) {
      const key = identityKey(
        identifier.identifierType,
        identifier.namespace,
        identifier.value
      );
      const matches = index.get(key) ?? [];
      matches.push({ asset, identifier });
      index.set(key, matches);
    }
  const results = items.map((item): TelemetryResolveResult => {
    function fail(reasonCode: TelemetryReasonCode): TelemetryResolveResult {
      return {
        requestId: item.requestId,
        observedTimeUtc: item.observedTimeUtc,
        status: conflictReasons.has(reasonCode) ? "conflict" : "unmapped",
        reasonCode,
        mapping: null,
      };
    }
    if (nowTimeUtc >= catalog.expiresTimeUtc) return fail("CATALOG_EXPIRED");
    if (
      !validClock(item.observedTimeUtc) ||
      item.observedTimeUtc > nowTimeUtc + TELEMETRY_CLOCK_SKEW_MS
    )
      return fail("INVALID_OBSERVATION_TIME");
    if (!item.identifiers.length) return fail("MISSING_IDENTIFIER");
    if (
      item.identifiers.some(
        (identifier) =>
          (identifier.identifierType !== "wwn" &&
            identifier.identifierType !== "sn") ||
          identifier.namespace !==
            TELEMETRY_NAMESPACES[identifier.identifierType]
      )
    )
      return fail("UNSUPPORTED_NAMESPACE");
    const normalized = item.identifiers.map((identifier) => ({
      ...identifier,
      value: normalizeTelemetryIdentifier(
        identifier.identifierType,
        identifier.value
      ),
    }));
    if (normalized.some((identifier) => identifier.value === null))
      return fail("INVALID_IDENTIFIER");
    const unique = new Map(
      normalized.map((identifier) => [
        identityKey(
          identifier.identifierType,
          identifier.namespace,
          identifier.value ?? ""
        ),
        identifier,
      ])
    );
    const identities = Array.from(unique.entries()).map(
      ([key, identifier]) => ({ identifier, matches: index.get(key) ?? [] })
    );
    const matches = identities.flatMap((identity) => identity.matches);
    if (new Set(matches.map((match) => match.asset.assetId)).size > 1)
      return fail("IDENTIFIERS_DISAGREE");
    const hasWwn = identities.some(
      (identity) => identity.identifier.identifierType === "wwn"
    );
    if (
      identities.some(
        (identity) =>
          identity.identifier.identifierType === "wwn" &&
          !identity.matches.length
      )
    )
      return fail("WWN_UNMAPPED");
    if (!matches.length) return fail("IDENTIFIER_UNMAPPED");
    const asset = matches[0].asset;
    if (!hasWwn) {
      if (
        item.model === undefined ||
        item.model === null ||
        !trimTelemetryText(item.model)
      )
        return fail("MODEL_REQUIRED");
      if (
        trimTelemetryText(item.model) !==
        (asset.model === null ? null : trimTelemetryText(asset.model))
      )
        return fail("MODEL_MISMATCH");
    }
    const proofs = matches.filter(
      (match) => match.identifier.identifierType === (hasWwn ? "wwn" : "sn")
    );
    if (
      item.observedTimeUtc <
      Math.max(...proofs.map((match) => match.identifier.effectiveFromUtc))
    )
      return fail("IDENTIFIER_NOT_EFFECTIVE");
    if (
      asset.retiredTimeUtc !== null &&
      item.observedTimeUtc >= asset.retiredTimeUtc
    )
      return fail("ASSET_RETIRED");
    if (
      catalog.host.retiredTimeUtc !== null &&
      item.observedTimeUtc >= catalog.host.retiredTimeUtc
    )
      return fail("HOST_RETIRED");
    const assignments = asset.assignments.filter(
      (assignment) =>
        assignment.validFromUtc <= item.observedTimeUtc &&
        (assignment.validToUtc === null ||
          item.observedTimeUtc < assignment.validToUtc)
    );
    if (!assignments.length) return fail("ASSIGNMENT_MISSING");
    if (assignments.length > 1) return fail("ASSIGNMENT_CONFLICT");
    const assignment = assignments[0];
    if (assignment.hostAssetId !== catalog.host.assetId)
      return fail("HOST_MISMATCH");
    return {
      requestId: item.requestId,
      observedTimeUtc: item.observedTimeUtc,
      status: "matched",
      reasonCode: "MATCHED",
      mapping: {
        assetId: asset.assetId,
        hostAssetId: catalog.host.assetId,
        assignmentId: assignment.assignmentId,
        assignmentValidFromUtc: assignment.validFromUtc,
        assignmentValidToUtc: assignment.validToUtc,
      },
    };
  });
  return {
    contractVersion: 1,
    revision: catalog.revision,
    serverTimeUtc: nowTimeUtc,
    expiresTimeUtc: catalog.expiresTimeUtc,
    results,
  };
}
