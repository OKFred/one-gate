/** 清理仅用于文档展示、不会影响校验的 JSON Schema 字段。 */
function cleanSchema(schema: unknown): unknown {
  if (schema === null || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(cleanSchema);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "example" || key === "examples" || key === "description") {
      continue;
    }
    result[key] = cleanSchema(value);
  }
  return result;
}

export interface StoredSchemaRow {
  code: string;
  schemaData: string;
}

/**
 * 合并随发布产物注册的 Schema 与 D1 配置。
 * D1 同名配置后写入，保持现有热修复覆盖语义。
 */
export function mergeSchemaSources(
  registeredSchemas: ReadonlyMap<string, object>,
  storedSchemas: StoredSchemaRow[]
): Map<string, string> {
  const merged = new Map<string, string>();

  for (const [code, schema] of registeredSchemas) {
    merged.set(code, JSON.stringify(cleanSchema(schema)));
  }

  for (const row of storedSchemas) {
    try {
      merged.set(
        row.code,
        JSON.stringify(cleanSchema(JSON.parse(row.schemaData)))
      );
    } catch {
      // 损坏的 D1 热修复不能覆盖发布产物内置的有效系统 Schema。
      if (!merged.has(row.code)) {
        merged.set(row.code, row.schemaData);
      }
    }
  }

  return merged;
}
