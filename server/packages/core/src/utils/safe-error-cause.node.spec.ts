import { createClient, type InStatement } from "@libsql/client";
import { describe, expect, it } from "vitest";
import { classifySafeErrorCause } from "./safe-error-cause.js";

const constraintCases: {
  code: string;
  statement: InStatement;
}[] = [
  {
    code: "SQLITE_CONSTRAINT_UNIQUE",
    statement: {
      sql: "INSERT INTO child (id, name, parent_id) VALUES (2, ?, 1)",
      args: ["private-name"],
    },
  },
  {
    code: "SQLITE_CONSTRAINT_NOTNULL",
    statement: {
      sql: "INSERT INTO child (id, name, parent_id) VALUES (2, ?, 1)",
      args: [null],
    },
  },
  {
    code: "SQLITE_CONSTRAINT_FOREIGNKEY",
    statement: {
      sql: "INSERT INTO child (id, name, parent_id) VALUES (2, ?, 999)",
      args: ["another-private-name"],
    },
  },
];

describe("safe classification of real libsql constraint errors", () => {
  it.each(constraintCases)(
    "classifies $code without exposing SQL",
    async ({ code, statement }) => {
      const client = createClient({ url: ":memory:" });
      try {
        await client.execute("PRAGMA foreign_keys = ON");
        await client.execute("CREATE TABLE parent (id INTEGER PRIMARY KEY)");
        await client.execute(
          `CREATE TABLE child (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          parent_id INTEGER REFERENCES parent(id)
        )`
        );
        await client.execute("INSERT INTO parent (id) VALUES (1)");
        await client.execute({
          sql: "INSERT INTO child (id, name, parent_id) VALUES (1, ?, 1)",
          args: ["private-name"],
        });

        let driverError: unknown;
        try {
          await client.execute(statement);
        } catch (error: unknown) {
          driverError = error;
        }
        expect(driverError).toMatchObject({ code });
        expect(classifySafeErrorCause(driverError)).toBe("SQLITE_CONSTRAINT");
        expect(
          classifySafeErrorCause(
            new Error("Failed query: private SQL and parameters", {
              cause: driverError,
            })
          )
        ).toBe("SQLITE_CONSTRAINT");
      } finally {
        client.close();
      }
    }
  );
});
