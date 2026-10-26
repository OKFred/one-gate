import { beforeAll } from "vitest";
import db from "@hodor/core/db/index";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import ddl from "@hodor/core/db/sql/personal/personal_calendar_event.sql?raw";
import { calendarEventTable } from "./model";
import { calendarContractTests } from "./calendar.contract-tests";

beforeAll(() => setupTestDb(db, [ddl]));
calendarContractTests({
  reset: () => clearTestData(db, ["personal_calendar_event"]),
  run: (operation) => operation(),
  async insertMany(rows) {
    // Each chunk stays below D1's bind parameter ceiling using the actual schema.
    for (let start = 0; start < rows.length; start += 5)
      await db.insert(calendarEventTable).values(rows.slice(start, start + 5));
  },
});
