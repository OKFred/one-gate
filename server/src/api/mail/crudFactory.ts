import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

// 定义组件类型
export interface ComponentSchema {
    type: "schema";
    name: string;
    component: JSONSchema;
}

// 定义工厂函数所需的配置接口
export interface CrudConfig {
    entityName: string; // 实体名称，如 "mailAccount", "mailLog", "mailTemplate"
    entityDisplayName: string; // 显示名称，如 "邮箱账号", "邮件日志", "邮件模板"
    schemas: {
        index: Record<string, JSONSchema>;
        data: Record<string, JSONSchema>;
        unique?: Record<string, JSONSchema>;
        timestamp?: Record<string, JSONSchema>;
    };
    service: {
        add: (data: any) => Promise<any>;
        get: (query: any) => Promise<any>;
        list: (query: any) => Promise<any>;
        update: (data: any) => Promise<any>;
        delete: (query: any) => Promise<any>;
    };
    validation: {
        addRequired: string[];
        getOneOf?: Array<{ required: string[] }>;
        listRequired?: string[];
        updateRequired: string[];
        deleteRequired: string[];
    };
}

// 生成 Add 操作
export function createAddOperation(config: CrudConfig) {
    const { entityName, entityDisplayName, schemas, service, validation } = config;
    
    const addReqSchema = {
        type: "object",
        properties: {
            ...schemas.data,
        },
        required: validation.addRequired,
        additionalProperties: false,
    } as const satisfies JSONSchema;

    const addResSchema = {
        type: "object",
        properties: {
            ok: { type: "boolean" },
            data: { ...schemas.index },
            message: { type: "string" },
        },
        required: ["ok", "data"],
        additionalProperties: false,
    } as const satisfies JSONSchema;

    const componentArr: ComponentSchema[] = [
        {
            type: "schema",
            name: `${entityName}AddReq`,
            component: addReqSchema,
        },
        {
            type: "schema",
            name: `${entityName}AddRes`,
            component: addResSchema,
        },
    ];

    const controller = async (c: NodeHonoContext) => {
        const bodyObj = await c.req.json();
        const { valid, errors } = validate(bodyObj, addReqSchema as object, "2020-12");
        
        if (!valid) {
            throw new HTTPException(
                httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
                { cause: errors }
            );
        }
        
        const id = await service.add(bodyObj);
        if (!id) {
            return c.json(
                { ok: false, message: "添加失败" },
                httpStatusCode.OK as ContentfulStatusCode
            );
        }
        
        return c.json(
            { ok: true, data: id },
            httpStatusCode.OK as ContentfulStatusCode
        );
    };

    const pathObj = {
        path: "/add",
        method: "post",
        description: `添加 ${entityDisplayName}`,
        summary: `添加 ${entityDisplayName}`,
        tags: [entityName],
        parameters: [],
        requestBody: {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        $ref: `#/components/schemas/${componentArr[0].name}`,
                    },
                },
            },
        },
        responses: {
            [httpStatusCode.OK as ContentfulStatusCode]: {
                description: "成功",
                content: {
                    "application/json": {
                        schema: {
                            $ref: `#/components/schemas/${componentArr[1].name}`,
                        },
                    },
                },
            },
            [httpStatusCode.UNPROCESSABLE_ENTITY]: errorSchema[httpStatusCode.UNPROCESSABLE_ENTITY],
        },
    } satisfies RawRouteConfig;

    return { pathObj, controller, componentArr };
}

// 生成 Get 操作
export function createGetOperation(config: CrudConfig) {
    const { entityName, entityDisplayName, schemas, service, validation } = config;
    
    const getReqSchema = {
        type: "object",
        properties: {
            ...schemas.index,
            ...(schemas.unique || {}),
        },
        required: [],
        additionalProperties: false,
        ...(validation.getOneOf ? { oneOf: validation.getOneOf } : {}),
    } as any satisfies JSONSchema;

    const getResSchema = {
        type: "object",
        properties: {
            ok: { type: "boolean" },
            data: {
                type: "object",
                properties: {
                    ...schemas.index,
                    ...schemas.data,
                    ...(schemas.timestamp || {}),
                },
                additionalProperties: false,
            },
            message: { type: "string" },
        },
        required: ["ok", "data"],
        additionalProperties: false,
    } as const satisfies JSONSchema;

    const componentArr: ComponentSchema[] = [
        {
            type: "schema",
            name: `${entityName}GetReq`,
            component: getReqSchema,
        },
        {
            type: "schema",
            name: `${entityName}GetRes`,
            component: getResSchema,
        },
    ];

    const controller = async (c: NodeHonoContext) => {
        const bodyObj = await c.req.json();
        const { valid, errors } = validate(bodyObj, getReqSchema as object, "2020-12");
        
        if (!valid) {
            throw new HTTPException(422, { cause: errors });
        }
        
        const row = await service.get(bodyObj);
        if (!row?.id) {
            throw new HTTPException(404, { cause: `未找到该 ${entityDisplayName}` });
        }
        
        return c.json(
            { ok: true, data: row },
            httpStatusCode.OK as ContentfulStatusCode
        );
    };

    const pathObj = {
        path: "/get",
        method: "post",
        description: `查询 ${entityDisplayName}`,
        summary: `查询 ${entityDisplayName}`,
        tags: [entityName],
        parameters: [],
        requestBody: {
            required: true,
            description: `查询 ${entityDisplayName}`,
            content: {
                "application/json": {
                    schema: {
                        $ref: `#/components/schemas/${componentArr[0].name}`,
                    },
                },
            },
        },
        responses: {
            [httpStatusCode.OK as ContentfulStatusCode]: {
                description: "成功",
                content: {
                    "application/json": {
                        schema: {
                            $ref: `#/components/schemas/${componentArr[1].name}`,
                        },
                    },
                },
            },
            [httpStatusCode.UNPROCESSABLE_ENTITY]: errorSchema[httpStatusCode.UNPROCESSABLE_ENTITY],
        },
    } satisfies RawRouteConfig;

    return { pathObj, controller, componentArr };
}

// 生成 List 操作
export function createListOperation(config: CrudConfig) {
    const { entityName, entityDisplayName, schemas, service, validation } = config;
    
    const listReqSchema = {
        type: "object",
        properties: {
            page: { type: "number", default: 1, minimum: 1 },
            pageSize: { type: "number", default: 20, minimum: 1, maximum: 100 },
            ...schemas.data, // 允许按数据字段筛选
        },
        required: validation.listRequired || [],
        additionalProperties: false,
    } as const satisfies JSONSchema;

    const listResSchema = {
        type: "object",
        properties: {
            ok: { type: "boolean" },
            data: {
                type: "object",
                properties: {
                    list: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                ...schemas.index,
                                ...schemas.data,
                                ...(schemas.timestamp || {}),
                            },
                            additionalProperties: false,
                        },
                    },
                    total: { type: "number" },
                    page: { type: "number" },
                    pageSize: { type: "number" },
                },
                required: ["list", "total", "page", "pageSize"],
                additionalProperties: false,
            },
            message: { type: "string" },
        },
        required: ["ok", "data"],
        additionalProperties: false,
    } as const satisfies JSONSchema;

    const componentArr: ComponentSchema[] = [
        {
            type: "schema",
            name: `${entityName}ListReq`,
            component: listReqSchema,
        },
        {
            type: "schema",
            name: `${entityName}ListRes`,
            component: listResSchema,
        },
    ];

    const controller = async (c: NodeHonoContext) => {
        const bodyObj = await c.req.json();
        const { valid, errors } = validate(bodyObj, listReqSchema as object, "2020-12");
        
        if (!valid) {
            throw new HTTPException(422, { cause: errors });
        }
        
        const result = await service.list(bodyObj);
        
        return c.json(
            { ok: true, data: result },
            httpStatusCode.OK as ContentfulStatusCode
        );
    };

    const pathObj = {
        path: "/list",
        method: "post",
        description: `查询 ${entityDisplayName} 列表`,
        summary: `查询 ${entityDisplayName} 列表`,
        tags: [entityName],
        parameters: [],
        requestBody: {
            required: true,
            description: `查询 ${entityDisplayName} 列表`,
            content: {
                "application/json": {
                    schema: {
                        $ref: `#/components/schemas/${componentArr[0].name}`,
                    },
                },
            },
        },
        responses: {
            [httpStatusCode.OK as ContentfulStatusCode]: {
                description: "成功",
                content: {
                    "application/json": {
                        schema: {
                            $ref: `#/components/schemas/${componentArr[1].name}`,
                        },
                    },
                },
            },
            [httpStatusCode.UNPROCESSABLE_ENTITY]: errorSchema[httpStatusCode.UNPROCESSABLE_ENTITY],
        },
    } satisfies RawRouteConfig;

    return { pathObj, controller, componentArr };
}

// 生成 Update 操作
export function createUpdateOperation(config: CrudConfig) {
    const { entityName, entityDisplayName, schemas, service, validation } = config;
    
    const updateReqSchema = {
        type: "object",
        properties: {
            ...schemas.index,
            ...schemas.data,
        },
        required: validation.updateRequired,
        additionalProperties: false,
    } as const satisfies JSONSchema;

    const updateResSchema = {
        type: "object",
        properties: {
            ok: { type: "boolean" },
            data: {
                type: "object",
                properties: {
                    affectedRows: { type: "number" },
                },
                additionalProperties: false,
            },
            message: { type: "string" },
        },
        required: ["ok", "data"],
        additionalProperties: false,
    } as const satisfies JSONSchema;

    const componentArr: ComponentSchema[] = [
        {
            type: "schema",
            name: `${entityName}UpdateReq`,
            component: updateReqSchema,
        },
        {
            type: "schema",
            name: `${entityName}UpdateRes`,
            component: updateResSchema,
        },
    ];

    const controller = async (c: NodeHonoContext) => {
        const bodyObj = await c.req.json();
        const { valid, errors } = validate(bodyObj, updateReqSchema as object, "2020-12");
        
        if (!valid) {
            throw new HTTPException(422, { cause: errors });
        }
        
        const affectedRows = await service.update(bodyObj);
        
        return c.json(
            { ok: true, data: { affectedRows } },
            httpStatusCode.OK as ContentfulStatusCode
        );
    };

    const pathObj = {
        path: "/update",
        method: "post",
        description: `更新 ${entityDisplayName}`,
        summary: `更新 ${entityDisplayName}`,
        tags: [entityName],
        parameters: [],
        requestBody: {
            required: true,
            description: `更新 ${entityDisplayName}`,
            content: {
                "application/json": {
                    schema: {
                        $ref: `#/components/schemas/${componentArr[0].name}`,
                    },
                },
            },
        },
        responses: {
            [httpStatusCode.OK as ContentfulStatusCode]: {
                description: "成功",
                content: {
                    "application/json": {
                        schema: {
                            $ref: `#/components/schemas/${componentArr[1].name}`,
                        },
                    },
                },
            },
            [httpStatusCode.UNPROCESSABLE_ENTITY]: errorSchema[httpStatusCode.UNPROCESSABLE_ENTITY],
        },
    } satisfies RawRouteConfig;

    return { pathObj, controller, componentArr };
}

// 生成 Delete 操作
export function createDeleteOperation(config: CrudConfig) {
    const { entityName, entityDisplayName, schemas, service, validation } = config;
    
    const deleteReqSchema = {
        type: "object",
        properties: {
            ...schemas.index,
            ...(schemas.unique || {}),
        },
        required: validation.deleteRequired,
        additionalProperties: false,
    } as const satisfies JSONSchema;

    const deleteResSchema = {
        type: "object",
        properties: {
            ok: { type: "boolean" },
            data: {
                type: "object",
                properties: {
                    affectedRows: { type: "number" },
                },
                additionalProperties: false,
            },
            message: { type: "string" },
        },
        required: ["ok", "data"],
        additionalProperties: false,
    } as const satisfies JSONSchema;

    const componentArr: ComponentSchema[] = [
        {
            type: "schema",
            name: `${entityName}DeleteReq`,
            component: deleteReqSchema,
        },
        {
            type: "schema",
            name: `${entityName}DeleteRes`,
            component: deleteResSchema,
        },
    ];

    const controller = async (c: NodeHonoContext) => {
        const bodyObj = await c.req.json();
        const { valid, errors } = validate(bodyObj, deleteReqSchema as object, "2020-12");
        
        if (!valid) {
            throw new HTTPException(422, { cause: errors });
        }
        
        const affectedRows = await service.delete(bodyObj);
        
        return c.json(
            { ok: true, data: { affectedRows } },
            httpStatusCode.OK as ContentfulStatusCode
        );
    };

    const pathObj = {
        path: "/delete",
        method: "post",
        description: `删除 ${entityDisplayName}`,
        summary: `删除 ${entityDisplayName}`,
        tags: [entityName],
        parameters: [],
        requestBody: {
            required: true,
            description: `删除 ${entityDisplayName}`,
            content: {
                "application/json": {
                    schema: {
                        $ref: `#/components/schemas/${componentArr[0].name}`,
                    },
                },
            },
        },
        responses: {
            [httpStatusCode.OK as ContentfulStatusCode]: {
                description: "成功",
                content: {
                    "application/json": {
                        schema: {
                            $ref: `#/components/schemas/${componentArr[1].name}`,
                        },
                    },
                },
            },
            [httpStatusCode.UNPROCESSABLE_ENTITY]: errorSchema[httpStatusCode.UNPROCESSABLE_ENTITY],
        },
    } satisfies RawRouteConfig;

    return { pathObj, controller, componentArr };
}

// 主工厂函数，生成完整的CRUD操作
export function createCrudOperations(config: CrudConfig) {
    const operations = {
        add: createAddOperation(config),
        get: createGetOperation(config),
        list: createListOperation(config),
        update: createUpdateOperation(config),
        delete: createDeleteOperation(config),
    };

    // 合并所有组件数组
    const allComponents: ComponentSchema[] = Object.values(operations).flatMap(op => op.componentArr);

    return {
        operations,
        allComponents,
    };
}