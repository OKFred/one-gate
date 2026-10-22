import { createHash, createHmac, randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { sql } from "drizzle-orm";
import {
  createPostgresTestHarness,
  postgresTestsConfigured,
  type PostgresTestHarness,
} from "../test/postgresql";
import { getEnv, setEnv } from "@hodor/core/utils/env";
import { hashPassword } from "@hodor/core/utils/crypto";
import { kv } from "@hodor/core/middleware/cache";
import { BusinessErrorCode } from "@hodor/core/middleware/errorHandler/businessError";
import {
  InMemoryTotpAttemptCoordinator,
  TotpGateCenter,
} from "@hodor/admin/system/auth/totp-gate";
import { WebCryptoTotpGateCryptography } from "@hodor/admin/system/auth/totp-gate/infrastructure/web-crypto";
import { userRepository } from "@hodor/admin/system/user/repository";
import { permissionRepository } from "@hodor/admin/system/permission/repository";
import { apiTokenRepository } from "@hodor/admin/system/api-token/repository";
import { TenantError } from "@hodor/enterprise/tenant/errors";
import * as logs from "@hodor/admin/base/log/repository";
import * as languages from "@hodor/admin/i18n/language/repository";
import * as regions from "@hodor/admin/i18n/region/repository";
import * as translations from "@hodor/admin/i18n/translation/repository";
import * as systemConfig from "@hodor/admin/base/sys_config/repository";
import * as userConfig from "@hodor/personal/base/user_config/repository";
import createApp from "./index";

interface Envelope<T> {
  ok: boolean;
  data: T;
  code?: string;
  message?: string;
}
interface Session {
  token: string;
  cookie?: string;
}
interface MenuNode {
  id: number;
  children: MenuNode[];
}
// Public RFC 6238 example material, exclusively for this isolated fixture.
const totpSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const password = "Synthetic-local-test-password";

function totpCode(now = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const digest = createHmac("sha1", "12345678901234567890")
    .update(counter)
    .digest();
  const offset = digest[digest.length - 1] & 15;
  return String(
    (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  ).padStart(6, "0");
}

describe.skipIf(!postgresTestsConfigured)(
  "real PostgreSQL admin and HTTP authentication",
  () => {
    let harness: PostgresTestHarness;
    let app: ReturnType<typeof createApp>;
    let passwordHash: string;
    let center: TotpGateCenter;
    let gateTime: number;
    const originalEnv = {
      BASE_API_PATH: getEnv("BASE_API_PATH"),
      NODE_ENV: getEnv("NODE_ENV"),
      JWT_SECRET: getEnv("JWT_SECRET"),
    };

    beforeAll(async () => {
      harness = await createPostgresTestHarness("admin_http_tests");
      passwordHash = await hashPassword(password);
      setEnv({
        BASE_API_PATH: "/api/v1",
        NODE_ENV: "production",
        JWT_SECRET: "synthetic-postgresql-http-fixture-signing-key",
      });
      app = createApp({ resolveTotpGateCenter: () => center });
    });
    afterAll(async () => {
      setEnv(originalEnv);
      await harness?.close();
    });
    beforeEach(async () => {
      await harness.reset();
      await harness.seedEnterpriseIdentities();
      await harness.query(
        sql`UPDATE "system_user" SET password = ${passwordHash}`,
        true
      );
      await kv.put("system.auth:global_version", randomUUID());
      gateTime = Date.now();
      center = new TotpGateCenter({
        clock: { now: () => gateTime },
        secrets: { read: () => totpSecret },
        cryptography: new WebCryptoTotpGateCryptography(),
        coordinator: new InMemoryTotpAttemptCoordinator(),
        audit: { write: () => undefined },
      });
    });

    async function post<T = Record<string, unknown>>(
      path: string,
      body: object = {},
      session?: Session
    ): Promise<{ status: number; body: Envelope<T>; response: Response }> {
      const response = await harness.run(async () =>
        app.request(`/api/v1${path}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "127.0.0.1",
            "user-agent": "synthetic-postgresql-test",
            ...(session ? { authorization: `Bearer ${session.token}` } : {}),
            ...(session?.cookie ? { cookie: session.cookie } : {}),
          },
          body: JSON.stringify(body),
        })
      );
      return {
        status: response.status,
        body: (await response.json()) as Envelope<T>,
        response,
      };
    }
    async function login(id = 11, verify = true): Promise<Session> {
      const result = await post<{ userObj: { id: number; token: string } }>(
        "/admin/system/auth/login",
        {
          username: `synthetic-pg-user-${id}`,
          password: Buffer.from(password).toString("base64"),
        }
      );
      expect(result.body.ok).toBe(true);
      expect(result.body.data.userObj.id).toBe(id);
      const session: Session = { token: result.body.data.userObj.token };
      if (verify) {
        const gate = await post(
          "/admin/system/auth/gate/verify",
          { code: totpCode(gateTime) },
          session
        );
        expect(gate.body.ok).toBe(true);
        const cookie = gate.response.headers.get("set-cookie");
        expect(cookie).toContain("HttpOnly");
        expect(cookie).toContain("Secure");
        session.cookie = cookie!.split(";")[0];
        gateTime += 30_000;
      }
      return session;
    }
    async function seedMenus() {
      await harness.query(
        sql`INSERT INTO system_menu
      (id,name,icon,path,parent_id,sort,business,is_enabled,creator_id,create_time_utc) VALUES
      (201,'Synthetic root','folder',NULL,NULL,1,'',TRUE,1,1),
      (202,'Synthetic assets','disk','/enterprise/asset',201,2,'enterprise.asset',TRUE,1,1),
      (203,'Synthetic hidden','shield','/system/secret',201,3,'synthetic.secret',TRUE,1,1),
      (204,'Synthetic disabled','disk','/enterprise/disabled',201,4,'enterprise.asset',FALSE,1,1)`,
        true
      );
    }

    it("logs in through HTTP, requires TOTP, returns profile and writes a PostgreSQL login audit", async () => {
      const session = await login(11, false);
      const blocked = await post("/admin/system/auth/profile", {}, session);
      expect(blocked.body).toMatchObject({
        ok: false,
        data: { code: BusinessErrorCode.TOTP_GATE_REQUIRED },
      });
      const gate = await post(
        "/admin/system/auth/gate/verify",
        { code: totpCode(gateTime) },
        session
      );
      expect(gate.body.ok).toBe(true);
      session.cookie = gate.response.headers.get("set-cookie")!.split(";")[0];
      const profile = await post<{
        userObj: { id: number; roleArr: { value: number }[] };
      }>("/admin/system/auth/profile", {}, session);
      expect(profile.body.ok).toBe(true);
      expect(profile.body.data.userObj.id).toBe(11);
      expect(profile.body.data.userObj.roleArr).toEqual([
        { value: 2, label: "synthetic-enterprise-role" },
      ]);
      expect(profile.body.data.userObj).not.toHaveProperty("password");
      const audit = await harness.run(() =>
        logs.findSysLogPage({
          namespace: "login",
          filters: { userId: 11 },
          pageNo: 1,
          pageSize: 10,
        })
      );
      expect(audit.total).toBe(1);
      expect(audit.list[0].logValue).toMatchObject({
        userId: 11,
        ip: "127.0.0.1",
      });
    });

    it("rejects wrong passwords, disabled identities and unsigned profile requests", async () => {
      const wrong = await post("/admin/system/auth/login", {
        username: "synthetic-pg-user-11",
        password: Buffer.from("wrong").toString("base64"),
      });
      expect(wrong.body).toMatchObject({
        ok: false,
        data: { code: "errorHandler.loginFailed" },
      });
      await harness.query(
        sql`UPDATE "system_user" SET is_enabled = FALSE WHERE id=11`,
        true
      );
      const disabled = await post("/admin/system/auth/login", {
        username: "synthetic-pg-user-11",
        password: Buffer.from(password).toString("base64"),
      });
      expect(disabled.body).toMatchObject({
        ok: false,
        data: { code: "errorHandler.loginFailed" },
      });
      const anonymous = await post("/admin/system/auth/profile");
      expect(anonymous.body.ok).toBe(false);
      expect(anonymous.body.data).not.toHaveProperty("userObj");
    });

    it("loads active role permissions and builds the HTTP menu tree for the current identity", async () => {
      await seedMenus();
      const session = await login();
      const permissions = await post<{ permissions: { code: string }[] }>(
        "/admin/system/auth/getButtonPermission",
        {},
        session
      );
      expect(permissions.body.ok).toBe(true);
      expect(
        permissions.body.data.permissions.map((permission) => permission.code)
      ).toContain("enterprise.asset:read");
      const tree = await post<MenuNode[]>(
        "/admin/system/menu/tree",
        {},
        session
      );
      expect(tree.body.ok).toBe(true);
      expect(tree.body.data.map((node) => node.id)).toEqual([201]);
      expect(tree.body.data[0].children.map((node) => node.id)).toEqual([202]);
      const adminTree = await post<MenuNode[]>(
        "/admin/system/menu/tree",
        {},
        await login(1)
      );
      expect(adminTree.body.data[0].children.map((node) => node.id)).toEqual([
        202, 203,
      ]);
    });

    it("does not reuse cached authority after a PostgreSQL role is disabled", async () => {
      const session = await login();
      const before = await post<{ permissions: { code: string }[] }>(
        "/admin/system/auth/getButtonPermission",
        {},
        session
      );
      expect(before.body.data.permissions.length).toBeGreaterThan(0);
      await harness.query(
        sql`UPDATE system_role SET is_enabled=FALSE WHERE id=2`,
        true
      );
      const after = await post<{ permissions: { code: string }[] }>(
        "/admin/system/auth/getButtonPermission",
        {},
        session
      );
      expect(after.body.ok).toBe(true);
      expect(after.body.data.permissions).toEqual([]);
      const denied = await post("/enterprise/tenant/list", {}, session);
      expect(denied.body.ok).toBe(false);
    });

    it("binds TOTP cookies to the authenticated identity and rejects disabled JWT owners", async () => {
      const user = await login();
      const admin = await login(1);
      const exchanged = await post(
        "/admin/system/auth/profile",
        {},
        {
          ...user,
          cookie: admin.cookie,
        }
      );
      expect(exchanged.body).toMatchObject({
        ok: false,
        data: { code: BusinessErrorCode.TOTP_GATE_REQUIRED },
      });
      expect((await post("/admin/system/auth/profile", {}, user)).body.ok).toBe(
        true
      );
      await harness.query(
        sql`UPDATE "system_user" SET is_enabled = FALSE WHERE id=11`,
        true
      );
      const disabled = await post("/admin/system/auth/profile", {}, user);
      expect(disabled.body).toMatchObject({
        ok: false,
        data: { code: BusinessErrorCode.NOT_EXIST_OR_DISABLED },
      });
    });

    it("fails closed before unsupported services, including machine callback and SSO paths", async () => {
      for (const path of [
        "/admin/mail/send",
        "/admin/system/auth/sso/login/url",
        "/admin/mobile/device/report/info",
        "/admin/maintenance/cron/list",
      ]) {
        const response = await post(path);
        expect(response.status).toBe(501);
        expect(response.body).toMatchObject({
          ok: false,
          code: "POSTGRESQL_CAPABILITY_UNAVAILABLE",
        });
      }
      const anonymousMapping = await post(
        "/enterprise/asset/mapping/resolve",
        {}
      );
      expect(anonymousMapping.status).not.toBe(501);
      expect(anonymousMapping.body.ok).toBe(false);
    });

    it("redacts API token hashes and prevents machine credentials from becoming user sessions", async () => {
      const token = "hdr_synthetic_pg_machine_token";
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const id = await harness.run(() =>
        apiTokenRepository.onInsert({
          name: "synthetic-machine",
          tokenPrefix: "hdr_synthetic",
          tokenHash,
          permissions: JSON.stringify(["enterprise.asset.mapping:read"]),
          status: "active",
          creatorId: 1,
        })
      );
      await harness.run(async () => {
        expect(
          await apiTokenRepository.findByTokenHash(tokenHash)
        ).toMatchObject({ id, tokenHash });
        expect(await apiTokenRepository.findById(id)).not.toHaveProperty(
          "tokenHash"
        );
        const page = await apiTokenRepository.findPage({
          pageNo: 1,
          pageSize: 10,
        });
        expect(page.total).toBe(1);
        expect(page.list[0]).not.toHaveProperty("tokenHash");
      });
      for (const path of [
        "/admin/system/auth/profile",
        "/admin/system/menu/tree",
        "/enterprise/asset/list",
        "/admin/system/auth/gate/verify",
      ]) {
        const denied = await post(path, {}, { token });
        expect(denied.status).toBe(501);
        expect(denied.body.code).toBe("POSTGRESQL_CAPABILITY_UNAVAILABLE");
      }
      await harness.query(
        sql`INSERT INTO enterprise_tenant(id,key,name,is_enabled,creator_id,create_time_utc,update_time_utc)
        VALUES (1,'synthetic-a','Synthetic A',TRUE,1,1,1),(2,'synthetic-b','Synthetic B',TRUE,1,1,1)`,
        true
      );
      await harness.query(
        sql`INSERT INTO enterprise_tenant_member(tenant_id,user_id,role,is_enabled,creator_id,create_time_utc,update_time_utc)
        VALUES (1,11,'owner',TRUE,1,1,1),(2,11,'owner',TRUE,1,1,1)`,
        true
      );
      await harness.query(
        sql`INSERT INTO enterprise_tenant_api_token_grant(tenant_id,token_id,is_enabled,creator_id,create_time_utc,update_time_utc)
        VALUES (1,${id},TRUE,1,1,1)`,
        true
      );
      const measurement = {
        tenantId: 1,
        sourceSystem: "synthetic",
        collectorId: "host-a",
        deviceId: "disk-a",
        metric: "temperature",
        channel: "disk",
        observedTimeUtc: Date.now(),
      };
      const mapped = await post(
        "/enterprise/asset/mapping/resolve",
        measurement,
        { token }
      );
      expect(mapped.body).toMatchObject({
        ok: true,
        data: { status: "unmapped", mapping: null },
      });
      const foreignTenant = await post(
        "/enterprise/asset/mapping/resolve",
        { ...measurement, tenantId: 2 },
        { token }
      );
      expect(foreignTenant.body).toMatchObject({
        ok: false,
        data: { code: TenantError.NOT_VISIBLE },
      });
      await harness.query(
        sql`UPDATE system_api_token SET expire_time_utc = ${Date.now() - 1_000} WHERE id=${id}`,
        true
      );
      const expired = await post(
        "/enterprise/asset/mapping/resolve",
        measurement,
        { token }
      );
      expect(expired.body).toMatchObject({
        ok: false,
        data: { code: BusinessErrorCode.NOT_AUTHENTICATED },
      });
    });

    it("uses PostgreSQL user CRUD and preserves JSON role arrays and disabled filters", async () => {
      await harness.run(async () => {
        const id = await userRepository.onInsert({
          username: "synthetic-created",
          password: passwordHash,
          langCode: "en-US",
          roleIdArr: [2],
          isEnabled: false,
          creatorId: 1,
        });
        expect(Number.isSafeInteger(id)).toBe(true);
        expect(
          await userRepository.findByUsername("synthetic-created")
        ).toMatchObject({ id, roleIdArr: [2], isEnabled: false });
        expect(
          (
            await userRepository.findPage({
              keyword: "synthetic-created",
              isEnabled: false,
              pageNo: 1,
              pageSize: 10,
            })
          ).total
        ).toBe(1);
        expect(
          (
            await userRepository.findPage({
              keyword: "synthetic-created",
              isEnabled: true,
              pageNo: 1,
              pageSize: 10,
            })
          ).total
        ).toBe(0);
        await userRepository.onUpdate(id, {
          remark: "synthetic-updated",
          isEnabled: true,
        });
        expect(await userRepository.findById(id)).toMatchObject({
          remark: "synthetic-updated",
          roleIdArr: [2],
          isEnabled: true,
        });
        await userRepository.onDelete(id);
        expect(await userRepository.findById(id)).toBeNull();
      });
    });

    it("filters and updates PostgreSQL permissions without SQLite fallback", async () => {
      await harness.run(async () => {
        const id = await permissionRepository.onInsert({
          code: "synthetic.action:read",
          name: "Synthetic",
          category: "action",
          business: "synthetic.action",
          isEnabled: false,
          creatorId: 1,
        });
        expect(await permissionRepository.findById(id)).toMatchObject({
          id,
          isEnabled: false,
        });
        expect(
          (
            await permissionRepository.findPage({
              keyword: "synthetic.action",
              isEnabled: false,
              pageNo: 1,
              pageSize: 10,
            })
          ).total
        ).toBe(1);
        await permissionRepository.onUpdate(id, { isEnabled: true });
        expect(await permissionRepository.findById(id)).toMatchObject({
          isEnabled: true,
        });
        await permissionRepository.onDelete(id);
        expect(await permissionRepository.findById(id)).toBeNull();
      });
    });

    it("round trips language, region JSON and translations through PostgreSQL dispatchers", async () => {
      await harness.run(async () => {
        const languageId = await languages.onInsert({
          langCode: "en-US",
          nativeName: "Synthetic English",
          sortOrder: 1,
          isEnabled: true,
          creatorId: 1,
        });
        expect(
          (await languages.findPageAll({ isEnabled: true }))[0]
        ).toMatchObject({ id: languageId, langCode: "en-US" });
        const regionId = await regions.onInsert({
          labels: { "en-US": "Synthetic region", "zh-CN": "测试区域" },
          alpha2Code: "ZZ",
          alpha3Code: "ZZZ",
          numeric: 999,
          iso3166Independent: false,
          businessLanguages: ["en-US"],
          isEnabled: true,
          creatorId: 1,
        });
        expect(await regions.findByCodes({ alpha2Code: "ZZ" })).toMatchObject({
          id: regionId,
          labels: { "zh-CN": "测试区域" },
          businessLanguages: ["en-US"],
        });
        const translationId = await translations.onInsert({
          application: "backend",
          business: "synthetic",
          langCode: "en-US",
          tKey: "synthetic.message",
          tValue: "Synthetic value",
          valueHash: "synthetic-hash",
          isEnabled: true,
          creatorId: 1,
        });
        expect(
          await translations.findByKeyAndLang({
            tKey: "synthetic.message",
            langCode: "en-US",
          })
        ).toMatchObject({ id: translationId, tValue: "Synthetic value" });
        await translations.onUpdate(translationId!, {
          tValue: "Updated value",
        });
        expect(
          (
            await translations.findPage({
              keyword: "Updated",
              pageNo: 1,
              pageSize: 10,
            })
          ).total
        ).toBe(1);
      });
    });

    it("round trips system JSON configuration and preserves namespace primary selection", async () => {
      await harness.run(async () => {
        const base = {
          namespace: "synthetic",
          isEnabled: true,
          isPrimary: true,
          creatorId: 1,
        };
        const first = await systemConfig.onInsert({
          ...base,
          configKey: "first",
          configValue: { enabled: true, nested: { values: [1, "two"] } },
        });
        const second = await systemConfig.onInsert({
          ...base,
          configKey: "second",
          configValue: { enabled: false },
        });
        expect(
          await systemConfig.findByNamespaceAndKey("synthetic", "first")
        ).toMatchObject({
          id: first,
          configValue: { enabled: true, nested: { values: [1, "two"] } },
        });
        await systemConfig.resetPrimaryFlags("synthetic", second!);
        expect(
          await systemConfig.findPrimaryByNamespace("synthetic")
        ).toMatchObject({ id: second });
        expect(
          (
            await systemConfig.findPage({
              namespace: "synthetic",
              pageNo: 1,
              pageSize: 1,
            })
          ).total
        ).toBe(2);
      });
    });

    it("isolates personal JSON configuration reads, updates and deletes by owner", async () => {
      await harness.run(async () => {
        const id = await userConfig.onInsert({
          userId: 11,
          namespace: "synthetic",
          configKey: "private",
          configValue: { secret: "synthetic-only" },
          isEnabled: true,
          isPrimary: true,
          creatorId: 11,
        });
        expect(await userConfig.findById(11, id!)).toMatchObject({
          userId: 11,
        });
        expect(await userConfig.findById(12, id!)).toBeUndefined();
        expect(
          await userConfig.onUpdate(12, id!, {
            configValue: { tampered: true },
          })
        ).toBeNull();
        expect(await userConfig.onDelete(12, id!)).toBeNull();
        expect(
          await userConfig.findByNamespaceAndKey(11, "synthetic", "private")
        ).toMatchObject({ configValue: { secret: "synthetic-only" } });
        expect(await userConfig.findByNamespace(12, "synthetic")).toEqual([]);
      });
    });

    it("filters PostgreSQL system-log JSON by typed values and binds hostile values safely", async () => {
      await harness.run(async () => {
        for (const [index, value] of [
          { key: 1, enabled: true },
          { key: "1", enabled: true },
          { key: 1, enabled: false },
          { key: "' OR 1=1 --", enabled: false },
        ].entries()) {
          await logs.insertSysLog({
            namespace: "synthetic-json",
            logLevel: "info",
            payloadType: "json",
            logValue: value,
            creatorId: index + 1,
            createTimeUtc: index + 1,
          });
        }
        const page = await logs.findSysLogPage({
          namespace: "synthetic-json",
          filters: { key: 1, enabled: true },
          pageNo: 1,
          pageSize: 10,
        });
        expect(page.total).toBe(1);
        expect(page.list[0].creatorId).toBe(1);
        const quoted = await logs.findSysLogPage({
          namespace: "synthetic-json",
          filters: { key: "' OR 1=1 --" },
          pageNo: 1,
          pageSize: 10,
        });
        expect(quoted.total).toBe(1);
        const warning = vi
          .spyOn(console, "warn")
          .mockImplementation(() => undefined);
        try {
          const invalidKey = await logs.findSysLogPage({
            namespace: "synthetic-json",
            filters: { "x') OR 1=1 --": 1 },
            pageNo: 1,
            pageSize: 10,
          });
          expect(invalidKey.total).toBe(4);
          expect(warning).toHaveBeenCalledOnce();
        } finally {
          warning.mockRestore();
        }
      });
    });

    it("combines PostgreSQL business-log JSON matching, text search, false status and time bounds", async () => {
      await harness.run(async () => {
        for (const [index, name] of [
          "synthetic alpha",
          "synthetic beta",
        ].entries()) {
          await logs.insertBizLog({
            namespace: "synthetic-biz",
            payloadType: "json",
            logValue: { name, detail: { attempt: 1 } },
            status: index !== 0,
            creatorId: 1,
            createTimeUtc: index + 10,
          });
        }
        const page = await logs.findBizLogPage({
          namespace: "synthetic-biz",
          filters: { detail: { attempt: 1 } },
          likeFilters: { name: "alpha" },
          status: false,
          startTime: 10,
          endTime: 10,
          pageNo: 1,
          pageSize: 10,
        });
        expect(page.total).toBe(1);
        expect(page.list[0]).toMatchObject({
          status: false,
          logValue: { name: "synthetic alpha" },
        });
      });
    });
  }
);
