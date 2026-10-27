import { beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import subscriptionDdl from "@hodor/core/db/sql/personal/personal_calendar_subscription.sql?raw";
import eventDdl from "@hodor/core/db/sql/personal/personal_calendar_event.sql?raw";
import userDdl from "@hodor/core/db/sql/admin/system_user.sql?raw";
import { calendarEventTable } from "../model";
import { subscriptionContractTests } from "./subscription.contract-tests";

beforeAll(() => setupTestDb(db, [userDdl, eventDdl, subscriptionDdl]));
subscriptionContractTests({
  async reset() {
    await clearTestData(db, [
      "personal_calendar_subscription",
      "personal_calendar_event",
      "system_user",
    ]);
    for (const id of [17, 18])
      await db.run(
        sql`INSERT INTO system_user(id,username,password,lang_code,role_id_arr,is_enabled,creator_id,create_time_utc) VALUES (${id},${`synthetic-subscription-${id}`},'synthetic-unusable-hash','en-US','[]',1,${id},1)`
      );
  },
  run: (operation) => operation(),
  async insertMany(rows) {
    for (let offset = 0; offset < rows.length; offset += 5)
      await db
        .insert(calendarEventTable)
        .values(rows.slice(offset, offset + 5));
  },
  async setEnabled(owner, enabled) {
    await db.run(
      sql`UPDATE system_user SET is_enabled=${enabled ? 1 : 0} WHERE id=${owner}`
    );
  },
  async deleteOwner(owner) {
    await db.run(sql`DELETE FROM system_user WHERE id=${owner}`);
  },
});
