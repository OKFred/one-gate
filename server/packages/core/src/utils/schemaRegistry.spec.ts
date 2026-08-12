import { describe, expect, it } from "vitest";
import { getSchemasByPrefix, registerSchema } from "./schemaRegistry";

describe("schemaRegistry", () => {
  it("returns only schemas matching the requested prefix", () => {
    const prefix = "test.schema-prefix.device";
    registerSchema(`${prefix}.add.req`, { type: "object" });
    registerSchema(`${prefix}.update.req`, { type: "object" });
    registerSchema("test.schema-prefix.app.add.req", { type: "string" });

    const schemas = getSchemasByPrefix(prefix);

    expect([...schemas.keys()].sort()).toEqual([
      `${prefix}.add.req`,
      `${prefix}.update.req`,
    ]);
    expect(getSchemasByPrefix("test.schema-prefix.missing").size).toBe(0);
  });

  it("returns a copy that cannot mutate the global registry", () => {
    const name = "test.schema-prefix.copy.req";
    registerSchema(name, { type: "boolean" });

    const schemas = getSchemasByPrefix(name);
    schemas.clear();

    expect(getSchemasByPrefix(name).has(name)).toBe(true);
  });
});
