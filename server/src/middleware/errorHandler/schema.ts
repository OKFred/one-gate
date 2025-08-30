import type { JSONSchema } from "json-schema-to-ts";
export const errorSchema = {
    [404]: {
        description: "目标不存在",
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/ErrorInvalidRequest",
                },
            },
        },
    },
    [422]: {
        description: "校验失败",
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/ErrorInvalidRequest",
                },
            },
        },
    },
    [500]: {
        description: "未知异常",
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/ErrorInvalidRequest",
                },
            },
        },
    },
} as const satisfies Record<
    number,
    { description: string; content: { "application/json": { schema: JSONSchema } } }
>;
