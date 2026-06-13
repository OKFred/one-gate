import db from "@/db/index";
import {
  apiDocsTable,
  IndexVO,
  ApiDocsVO,
  ApiDocsListVO,
  ApiDocsAddVO,
  ApiDocsUpdateVO,
  ApiDocsListKeys,
  ApiDocsDetailKeys,
  ApiDocsGetKeys,
  ApiDocsDeleteKeys,
  ApiDocsAddKeys,
  ApiDocsUpdateKeys,
  ApiDocsSortableKeys,
  type ApiDocsPOLike,
  type ApiDocsVOLike,
  type ApiDocsAddVOLike,
  type ApiDocsUpdateVOLike,
  type ApiDocsDeleteVOLike,
  type ApiDocsGetVOLike,
} from "./model";
import { asc, count, desc, eq, and, like, or } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import { bodyUserAdapter } from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import hasValue from "@/utils/hasValue";
import { preventEmpty } from "@/middleware/auth/prevention";
import {
  preventInvalidFormat,
  preventUnsupportedFormat,
  preventParseFailed,
  preventParseFailedGeneral,
} from "./prevention";
import YAML from "yaml";

// 辅助函数：解析 Swagger 2.0 / OpenAPI 3.0 并扁平化所有 $ref 局部引用
interface ExtractedApi {
  path: string;
  method: string;
  summary: string;
  description: string;
  requestSchema: string;
  responseSchema: string;
}

// 深度复制并解析 $ref 引用以支持完全解耦
function dereference(schema: any, rootDoc: any, seen = new Set<string>()): any {
  if (typeof schema !== "object" || schema === null) return schema;

  if (schema.$ref && typeof schema.$ref === "string") {
    const refPath = schema.$ref;
    if (seen.has(refPath)) {
      return {
        type: "object",
        description: `Circular reference to ${refPath}`,
      };
    }
    seen.add(refPath);

    if (refPath.startsWith("#/")) {
      const parts = refPath.substring(2).split("/");
      let current = rootDoc;
      for (const part of parts) {
        if (current && typeof current === "object") {
          current = current[part];
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

  const result: any = Array.isArray(schema) ? [] : {};
  for (const [key, value] of Object.entries(schema)) {
    result[key] = dereference(value, rootDoc, new Set(seen));
  }
  return result;
}

export function parseApiDoc(contentStr: string): {
  info: { title: string; version: string; description: string };
  docType: "swagger2.0" | "openapi3.0" | "openapi3.1";
  apis: ExtractedApi[];
  baseUrl: string;
} {
  let doc: any;
  let parsedSuccess = false;
  try {
    doc = JSON.parse(contentStr);
    parsedSuccess = true;
  } catch (e) {
    try {
      doc = YAML.parse(contentStr);
      parsedSuccess = true;
    } catch (ye) {
      // 忽略，由下方校验处理
    }
  }

  preventInvalidFormat(parsedSuccess);

  const isOAS3 = !!(doc && doc.openapi && doc.openapi.startsWith("3."));
  const isSwagger2 = doc && doc.swagger === "2.0";

  preventUnsupportedFormat(isOAS3, isSwagger2);

  const isOAS3_1 = !!(doc.openapi && doc.openapi.startsWith("3.1"));
  const docType = isOAS3_1
    ? "openapi3.1"
    : isOAS3
      ? "openapi3.0"
      : "swagger2.0";

  let baseUrl = "";
  if (isOAS3) {
    const servers = doc.servers || [];
    baseUrl = servers[0]?.url || "";
  } else if (isSwagger2) {
    const host = doc.host || "";
    const basePath = doc.basePath || "";
    const scheme = doc.schemes?.[0] || "http";
    if (host) {
      baseUrl = `${scheme}://${host}${basePath}`;
    } else if (basePath) {
      baseUrl = basePath;
    }
  }

  const info = {
    title: doc.info?.title || "未命名文档",
    version: doc.info?.version || "1.0.0",
    description: doc.info?.description || "",
  };

  const apis: ExtractedApi[] = [];
  const paths = doc.paths || {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (typeof pathItem !== "object" || pathItem === null) continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      const upperMethod = method.toUpperCase();
      if (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes(upperMethod))
        continue;
      if (typeof operation !== "object" || operation === null) continue;

      const summary = operation.summary || "";
      const description = operation.description || "";

      // 提取 Request Schema
      let reqProperties: Record<string, any> = {};
      let reqRequired: string[] = [];
      const parameters = operation.parameters || [];

      for (const p of parameters) {
        if (p.in === "body" && isSwagger2) {
          if (p.schema) {
            const bodySchema = dereference(p.schema, doc);
            if (bodySchema.type === "object" && bodySchema.properties) {
              reqProperties = { ...reqProperties, ...bodySchema.properties };
              if (bodySchema.required) {
                reqRequired = [...reqRequired, ...bodySchema.required];
              }
            } else {
              reqProperties["body"] = bodySchema;
            }
          }
        } else {
          const propName = p.name;
          const propSchema = isOAS3
            ? p.schema
            : { type: p.type, format: p.format, description: p.description };
          if (propSchema) {
            reqProperties[propName] = dereference(propSchema, doc);
            if (p.required) {
              reqRequired.push(propName);
            }
          }
        }
      }

      if (isOAS3 && operation.requestBody) {
        const bodyContent = operation.requestBody.content || {};
        const jsonBody = bodyContent["application/json"];
        if (jsonBody && jsonBody.schema) {
          const bodySchema = dereference(jsonBody.schema, doc);
          if (bodySchema.type === "object" && bodySchema.properties) {
            reqProperties = { ...reqProperties, ...bodySchema.properties };
            if (bodySchema.required) {
              reqRequired = [...reqRequired, ...bodySchema.required];
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

      // 提取 Response Schema
      let resSchema: any = null;
      const responses = operation.responses || {};
      const successResponse =
        responses["200"] || responses["201"] || responses["default"];
      if (successResponse) {
        if (isOAS3) {
          const resContent = successResponse.content || {};
          const jsonRes = resContent["application/json"];
          if (jsonRes && jsonRes.schema) {
            resSchema = dereference(jsonRes.schema, doc);
          }
        } else {
          if (successResponse.schema) {
            resSchema = dereference(successResponse.schema, doc);
          }
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

// 辅助函数：根据条件构建查询 filter
const buildWhereCondition = (condition?: { keyword?: string }) => {
  const { keyword } = condition || {};
  const conditions = [];

  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(apiDocsTable.name, `%${keyword}%`),
        like(apiDocsTable.description, `%${keyword}%`)
      )
    );
  }

  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

//----------------- 1. 获取文档列表 ----------------//
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    orderBy: orderByWrapper<(keyof ApiDocsPOLike)[]>(ApiDocsSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<ApiDocsPOLike>[]>({ ...ApiDocsListVO }, [
    ...ApiDocsListKeys,
  ]),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = apiDocsTable[orderBy] || apiDocsTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const whereCondition = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(apiDocsTable.id) })
    .from(apiDocsTable)
    .where(whereCondition);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return {
      total,
      totalPage: 0,
      currentPage: pageNo,
      pageSize: finalPageSize,
      list: [],
    };
  }

  const rows = await db
    .select()
    .from(apiDocsTable)
    .where(whereCondition)
    .orderBy(descend ? desc(orderField) : asc(orderField))
    .limit(finalPageSize)
    .offset(offset);

  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: rows,
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取 API 文档列表",
  } as const,
  adapter: bodyUserAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

//----------------- 2. 新增文档 ----------------//
const addReq = {
  type: "object",
  properties: {
    ...ApiDocsAddVO,
  } satisfies Partial<Record<keyof ApiDocsAddVOLike, JSONSchema>>,
  required: [
    ...ApiDocsAddKeys,
  ] as const satisfies RequiredKeys<ApiDocsAddVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onAdd(
  params: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;
  let { name, version, description, docType, content } = params;

  // 尝试做一次本地解析和标准化 JSON 化
  try {
    const parsed = parseApiDoc(content);
    // 如果是 YAML，标准化转换为 JSON 字符串存储
    content = JSON.stringify(YAML.parse(content), null, 2);
    if (!name) name = parsed.info.title;
    if (!version) version = parsed.info.version || null;
    if (!description) description = parsed.info.description || null;
    docType = parsed.docType;
  } catch (err: any) {
    preventParseFailed(err.message);
  }

  const res = await db
    .insert(apiDocsTable)
    .values({
      name,
      version,
      description,
      docType: docType,
      content,
      creatorId,
    })
    .returning({ id: apiDocsTable.id });

  return res[0]?.id;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "上传/添加 API 文档",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

//----------------- 3. 更新文档 ----------------//
const updateReq = {
  type: "object",
  properties: { ...ApiDocsUpdateVO },
  required: [
    ...ApiDocsUpdateKeys,
  ] as const satisfies RequiredKeys<ApiDocsUpdateVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateRes> | null> {
  const { userId: updaterId } = userObj;
  let { id, name, version, description, docType, content } = params;

  const existRows = await db
    .select()
    .from(apiDocsTable)
    .where(eq(apiDocsTable.id, id))
    .limit(1);
  const row = existRows[0];
  preventEmpty(row);

  if (content !== undefined) {
    try {
      const parsed = parseApiDoc(content);
      content = JSON.stringify(YAML.parse(content), null, 2);
      if (!name) name = parsed.info.title;
      if (!version) version = parsed.info.version || null;
      if (!description) description = parsed.info.description || null;
      docType = parsed.docType;
    } catch (err: any) {
      preventParseFailedGeneral(err.message);
    }
  }

  const res = await db
    .update(apiDocsTable)
    .set({
      name,
      version,
      description,
      docType: docType,
      content,
      updaterId,
      updateTimeUtc: getCurrentTimestampUtcSql(),
    })
    .where(eq(apiDocsTable.id, id))
    .returning({ id: apiDocsTable.id });

  const updateRow = res[0];
  preventEmpty(updateRow);
  return updateRow.id;
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新 API 文档",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

//----------------- 4. 删除文档 ----------------//
const deleteReq = {
  type: "object",
  properties: { ...IndexVO },
  required: [
    ...ApiDocsDeleteKeys,
  ] as const satisfies RequiredKeys<ApiDocsDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onDelete(
  params: FromSchema<typeof deleteReq>,
  userObj: UserObj
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = params;
  const existRows = await db
    .select()
    .from(apiDocsTable)
    .where(eq(apiDocsTable.id, id))
    .limit(1);
  preventEmpty(existRows[0]);

  const result = await db
    .delete(apiDocsTable)
    .where(eq(apiDocsTable.id, id))
    .returning({ id: apiDocsTable.id });
  const deleteRow = result[0];
  preventEmpty(deleteRow);
  return deleteRow.id;
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除 API 文档",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

//----------------- 5. 获取文档详情 ----------------//
const getReq = {
  type: "object",
  properties: { ...IndexVO },
  required: [
    ...ApiDocsGetKeys,
  ] as const satisfies RequiredKeys<ApiDocsGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: { ...ApiDocsVO },
  required: [
    ...ApiDocsDetailKeys,
  ] as const satisfies RequiredKeys<ApiDocsVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>,
  userObj?: UserObj
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = params;
  const rows = await db
    .select()
    .from(apiDocsTable)
    .where(eq(apiDocsTable.id, id))
    .limit(1);
  const row = rows[0];
  preventEmpty(row);
  return row;
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取 API 文档详情",
  } as const,
  adapter: bodyUserAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

//----------------- 6. 解析已上传的文档端点 ----------------//
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
  userObj?: UserObj
): Promise<FromSchema<typeof parseRes>> {
  const { id } = params;
  const rows = await db
    .select()
    .from(apiDocsTable)
    .where(eq(apiDocsTable.id, id))
    .limit(1);
  const row = rows[0];
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

//----------------- 统一导出 ----------------//
export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
  parse: parseApi,
};
