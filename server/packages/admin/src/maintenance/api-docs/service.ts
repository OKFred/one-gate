import * as repo from "./repository";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import { adminMaintenanceApiDocsBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import {
  preventInvalidFormat,
  preventUnsupportedFormat,
  preventParseFailed,
  preventParseFailedGeneral,
} from "./prevention";
import YAML from "yaml";

const S = adminMaintenanceApiDocsBackendSchemas;

interface ExtractedApi {
  path: string;
  method: string;
  summary: string;
  description: string;
  requestSchema: string;
  responseSchema: string;
}

type DocType = "swagger2.0" | "openapi3.0" | "openapi3.1";

function dereference(
  schema: unknown,
  rootDoc: unknown,
  seen = new Set<string>()
): unknown {
  if (typeof schema !== "object" || schema === null) return schema;

  const rec = schema as Record<string, unknown>;
  if (typeof rec.$ref === "string") {
    const refPath = rec.$ref;
    if (seen.has(refPath)) {
      return {
        type: "object",
        description: `Circular reference to ${refPath}`,
      };
    }
    seen.add(refPath);

    if (refPath.startsWith("#/")) {
      const parts = refPath.substring(2).split("/");
      let current: unknown = rootDoc;
      for (const part of parts) {
        if (current && typeof current === "object") {
          current = (current as Record<string, unknown>)[part];
        } else {
          current = undefined;
          break;
        }
      }
      if (current) {
        return dereference(current, rootDoc, seen);
      }
    }
    return { type: "object", description: `Unresolved reference ${refPath}` };
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => dereference(item, rootDoc, new Set(seen)));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rec)) {
    result[key] = dereference(value, rootDoc, new Set(seen));
  }
  return result;
}

export function parseApiDoc(contentStr: string): {
  info: { title: string; version: string; description: string };
  docType: DocType;
  apis: ExtractedApi[];
  baseUrl: string;
} {
  let rawDoc: unknown;
  let parsedSuccess = false;
  try {
    rawDoc = JSON.parse(contentStr);
    parsedSuccess = true;
  } catch {
    try {
      rawDoc = YAML.parse(contentStr);
      parsedSuccess = true;
    } catch {
      // 忽略，由下方校验处理
    }
  }

  preventInvalidFormat(parsedSuccess);

  const doc = (rawDoc && typeof rawDoc === "object" ? rawDoc : {}) as Record<
    string,
    unknown
  >;
  const openapiStr = typeof doc.openapi === "string" ? doc.openapi : "";
  const isOAS3 = openapiStr.startsWith("3.");
  const isSwagger2 = doc.swagger === "2.0";

  preventUnsupportedFormat(isOAS3, isSwagger2);

  const isOAS3_1 = openapiStr.startsWith("3.1");
  const docType: DocType = isOAS3_1
    ? "openapi3.1"
    : isOAS3
      ? "openapi3.0"
      : "swagger2.0";

  let baseUrl = "";
  if (isOAS3) {
    const servers = Array.isArray(doc.servers)
      ? (doc.servers as Array<{ url?: string }>)
      : [];
    baseUrl = servers[0]?.url || "";
  } else if (isSwagger2) {
    const host = typeof doc.host === "string" ? doc.host : "";
    const basePath = typeof doc.basePath === "string" ? doc.basePath : "";
    const schemes = Array.isArray(doc.schemes) ? doc.schemes : [];
    const scheme = typeof schemes[0] === "string" ? schemes[0] : "http";
    if (host) {
      baseUrl = `${scheme}://${host}${basePath}`;
    } else if (basePath) {
      baseUrl = basePath;
    }
  }

  const rawInfo =
    doc.info && typeof doc.info === "object"
      ? (doc.info as Record<string, unknown>)
      : {};
  const info = {
    title: typeof rawInfo.title === "string" ? rawInfo.title : "未命名文档",
    version: typeof rawInfo.version === "string" ? rawInfo.version : "1.0.0",
    description:
      typeof rawInfo.description === "string" ? rawInfo.description : "",
  };

  const apis: ExtractedApi[] = [];
  const paths =
    doc.paths && typeof doc.paths === "object"
      ? (doc.paths as Record<string, unknown>)
      : {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (typeof pathItem !== "object" || pathItem === null) continue;

    for (const [method, rawOperation] of Object.entries(pathItem)) {
      const upperMethod = method.toUpperCase();
      if (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes(upperMethod))
        continue;
      if (typeof rawOperation !== "object" || rawOperation === null) continue;

      const operation = rawOperation as Record<string, unknown>;
      const summary =
        typeof operation.summary === "string" ? operation.summary : "";
      const description =
        typeof operation.description === "string" ? operation.description : "";

      let reqProperties: Record<string, unknown> = {};
      let reqRequired: string[] = [];
      const parameters = Array.isArray(operation.parameters)
        ? (operation.parameters as Array<Record<string, unknown>>)
        : [];

      for (const p of parameters) {
        if (p.in === "body" && isSwagger2) {
          if (p.schema) {
            const bodySchema = dereference(p.schema, doc) as Record<
              string,
              unknown
            >;
            if (bodySchema.type === "object" && bodySchema.properties) {
              reqProperties = {
                ...reqProperties,
                ...(bodySchema.properties as Record<string, unknown>),
              };
              if (Array.isArray(bodySchema.required)) {
                reqRequired = [
                  ...reqRequired,
                  ...(bodySchema.required as string[]),
                ];
              }
            } else {
              reqProperties["body"] = bodySchema;
            }
          }
        } else if (typeof p.name === "string") {
          const propSchema = isOAS3
            ? p.schema
            : { type: p.type, format: p.format, description: p.description };
          if (propSchema) {
            reqProperties[p.name] = dereference(propSchema, doc);
            if (p.required) {
              reqRequired.push(p.name);
            }
          }
        }
      }

      if (
        isOAS3 &&
        operation.requestBody &&
        typeof operation.requestBody === "object"
      ) {
        const reqBody = operation.requestBody as Record<string, unknown>;
        const bodyContent = (reqBody.content ?? {}) as Record<
          string,
          { schema?: unknown }
        >;
        const jsonBody = bodyContent["application/json"];
        if (jsonBody?.schema) {
          const bodySchema = dereference(jsonBody.schema, doc) as Record<
            string,
            unknown
          >;
          if (bodySchema.type === "object" && bodySchema.properties) {
            reqProperties = {
              ...reqProperties,
              ...(bodySchema.properties as Record<string, unknown>),
            };
            if (Array.isArray(bodySchema.required)) {
              reqRequired = [
                ...reqRequired,
                ...(bodySchema.required as string[]),
              ];
            }
          } else {
            reqProperties["body"] = bodySchema;
          }
        }
      }

      const requestSchemaObj = {
        type: "object",
        properties: reqProperties,
        required:
          reqRequired.length > 0 ? Array.from(new Set(reqRequired)) : undefined,
      };

      let resSchema: unknown = null;
      const responses = (operation.responses ?? {}) as Record<
        string,
        Record<string, unknown>
      >;
      const successResponse =
        responses["200"] || responses["201"] || responses["default"];
      if (successResponse) {
        if (isOAS3) {
          const resContent = (successResponse.content ?? {}) as Record<
            string,
            { schema?: unknown }
          >;
          const jsonRes = resContent["application/json"];
          if (jsonRes?.schema) {
            resSchema = dereference(jsonRes.schema, doc);
          }
        } else if (successResponse.schema) {
          resSchema = dereference(successResponse.schema, doc);
        }
      }

      apis.push({
        path,
        method: upperMethod,
        summary,
        description,
        requestSchema: JSON.stringify(requestSchemaObj, null, 2),
        responseSchema: resSchema ? JSON.stringify(resSchema, null, 2) : "",
      });
    }
  }

  return { info, docType, apis, baseUrl };
}

async function onList(
  params: FromSchema<typeof S.listReq>,
  _userObj?: UserObj
): Promise<FromSchema<typeof S.listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const result = await repo.findPage({
    pageNo,
    pageSize: finalPageSize,
    orderBy,
    descend,
    keyword: params.keyword,
  });

  return buildPagedListResult(result.list, result.total, pageNo, finalPageSize);
}

async function onAdd(
  params: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number> {
  const { userId: creatorId } = userObj;
  let { name, version, description, docType, content } = params;

  try {
    const parsed = parseApiDoc(content);
    content = JSON.stringify(YAML.parse(content), null, 2);
    if (!name) name = parsed.info.title;
    if (!version) version = parsed.info.version || null;
    if (!description) description = parsed.info.description || null;
    docType = parsed.docType;
  } catch (err: unknown) {
    preventParseFailed(err instanceof Error ? err.message : String(err));
  }

  const insertedId = await repo.onInsert({
    name,
    version,
    description,
    docType,
    content,
    creatorId,
  });

  return insertedId;
}

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number> {
  const { userId: updaterId } = userObj;
  const { id } = params;
  let { name, version, description, docType, content } = params;

  const row = await repo.findById(id);
  preventEmpty(row);

  if (content !== undefined) {
    try {
      const parsed = parseApiDoc(content);
      content = JSON.stringify(YAML.parse(content), null, 2);
      if (!name) name = parsed.info.title;
      if (!version) version = parsed.info.version || null;
      if (!description) description = parsed.info.description || null;
      docType = parsed.docType;
    } catch (err: unknown) {
      preventParseFailedGeneral(
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  const updatedId = await repo.onUpdate(id, {
    name,
    version,
    description,
    docType,
    content,
    updaterId,
  });

  preventEmpty(updatedId);
  return updatedId;
}

async function onDelete(
  params: FromSchema<typeof S.deleteReq>,
  _userObj: UserObj
): Promise<number> {
  const { id } = params;
  const row = await repo.findById(id);
  preventEmpty(row);

  const deletedId = await repo.onDelete(id);
  preventEmpty(deletedId);
  return deletedId;
}

async function onGet(
  params: FromSchema<typeof S.getReq>,
  _userObj?: UserObj
): Promise<FromSchema<typeof S.getRes>> {
  const { id } = params;
  const row = await repo.findById(id);
  preventEmpty(row);
  return row;
}

const parseReq = {
  type: "object",
  properties: {
    id: { type: "number", description: "文档ID" },
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const parseRes = {
  type: "object",
  properties: {
    info: {
      type: "object",
      properties: {
        title: { type: "string" },
        version: { type: "string" },
        description: { type: "string" },
      },
      required: ["title", "version", "description"],
      additionalProperties: false,
    },
    docType: {
      type: "string",
      enum: ["swagger2.0", "openapi3.0", "openapi3.1"],
    },
    baseUrl: { type: "string" },
    apis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          method: { type: "string" },
          summary: { type: "string" },
          description: { type: "string" },
          requestSchema: { type: "string" },
          responseSchema: { type: "string" },
        },
        required: [
          "path",
          "method",
          "summary",
          "description",
          "requestSchema",
          "responseSchema",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["info", "docType", "apis", "baseUrl"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onParse(
  params: FromSchema<typeof parseReq>,
  _userObj?: UserObj
): Promise<FromSchema<typeof parseRes>> {
  const { id } = params;
  const row = await repo.findById(id);
  preventEmpty(row);

  return parseApiDoc(row.content);
}

const parseApi = {
  req: parseReq,
  res: parseRes,
  pathInfo: {
    path: "/parse",
    method: "post",
    summary: "解析 API 文档并获取接口列表",
  } as const,
  adapter: bodyUserAdapter,
  service: onParse,
  permission: { action: "read" },
} satisfies API;

export default createCrudApis(S, {
  list: {
    adapter: bodyUserAdapter,
    summary: "获取 API 文档列表",
    handler: onList,
  },
  add: { summary: "上传/添加 API 文档", handler: onAdd },
  update: { summary: "更新 API 文档", handler: onUpdate },
  delete: {
    adapter: bodyUserAdapter,
    summary: "删除 API 文档",
    handler: onDelete,
  },
  get: {
    adapter: bodyUserAdapter,
    summary: "获取 API 文档详情",
    handler: onGet,
  },
  extra: {
    parse: parseApi,
  },
});
