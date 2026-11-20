import { describe, expect, it } from "vitest";
import {
  compileBackendSchemas,
  type CrudResourceContract,
} from "@hodor/contracts";
import { createCrudApis, buildPagedListResult } from "./crud";
import encapsulation from "./index";

const contract: CrudResourceContract = {
  version: 1,
  resource: "admin/i18n/language",
  operations: { listAll: true },
  fields: [
    {
      name: "langCode",
      schema: { type: "string", minLength: 2 },
      requiredOn: ["add", "list", "detail", "get"],
      in: { list: true, detail: true, add: true, update: true, listAll: true },
    },
    {
      name: "nativeName",
      schema: { type: "string" },
      requiredOn: ["add", "list", "detail", "get"],
      in: { list: true, detail: true, add: true, update: true, listAll: true },
    },
  ],
};

describe("createCrudApis", () => {
  it("builds standard encapsulation APIs and registers OpenAPI schemas", async () => {
    const schemas = compileBackendSchemas(contract);
    const service = createCrudApis(schemas, {
      listAll: {
        permission: false,
        handler: async () => [
          { id: 1, langCode: "zh-CN", nativeName: "简体中文" },
        ],
      },
      list: async (params) =>
        buildPagedListResult(
          [
            {
              id: 1,
              langCode: "zh-CN",
              nativeName: "简体中文",
              creatorId: 1,
              createTimeUtc: 1,
            },
          ],
          1,
          params.pageNo,
          params.pageSize
        ),
      add: async () => 1,
      update: async (params) => params.id,
      delete: async (params) => params.id,
      get: async (params) => ({
        id: params.id,
        langCode: "zh-CN",
        nativeName: "简体中文",
        creatorId: 1,
        createTimeUtc: 1,
      }),
    });

    expect(Object.keys(service)).toEqual([
      "listAll",
      "list",
      "add",
      "update",
      "delete",
      "get",
    ]);
    expect(service.listAll.permission).toBe(false);
    expect(service.add.permission).toEqual({ action: "add" });

    const app = encapsulation(service, "admin.i18n.language");
    const doc = app.getOpenAPIDocument({
      openapi: "3.1.0",
      info: { title: "test", version: "1.0.0" },
    });
    expect(Object.keys(doc.paths ?? {})).toEqual(
      expect.arrayContaining([
        "/listAll",
        "/list",
        "/add",
        "/update",
        "/delete",
        "/get",
      ])
    );
    expect(Object.keys(doc.components?.schemas ?? {})).toEqual(
      expect.arrayContaining([
        "admin.i18n.language.add.req",
        "admin.i18n.language.list.res",
      ])
    );

    const listHandler = service.list.service as unknown as (p: {
      pageNo: number;
      pageSize: number;
    }) => Promise<{ total: number; list: unknown[] }>;
    const res = await listHandler({ pageNo: 1, pageSize: 10 });
    expect(res.total).toBe(1);
    expect(res.list).toHaveLength(1);
  });
});
