import type { FromSchema, JSONSchema } from "json-schema-to-ts";

export const MapConfigurationRequestSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;

export const MapConfigurationResponseSchema = {
  type: "object",
  properties: {
    configured: { type: "boolean" },
    browserKey: {
      type: ["string", "null"],
      pattern: "^[a-fA-F0-9]{32}$",
      description:
        "Authenticated browser-only Tianditu key, or null when unconfigured",
    },
  },
  required: ["configured", "browserKey"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export type MapConfigurationRequest = FromSchema<
  typeof MapConfigurationRequestSchema
>;
export type MapConfigurationResponse = FromSchema<
  typeof MapConfigurationResponseSchema
>;
