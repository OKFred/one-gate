import { describe, it, expect, beforeAll, afterEach, beforeEach } from "vitest";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import attendanceService from "../service";
import type { UserObj } from "@hodor/core/types/app";
import { initAdminRegistry } from "@hodor/admin/register";

// 静态导入 SQL 文件
import attendanceSql from "@hodor/core/db/sql/enterprise_attendance.sql?raw";
import systemUserSql from "@hodor/core/db/sql/system_user.sql?raw";

import { sql } from "drizzle-orm";

describe("Attendance 考勤模块全链路集成测试", () => {
  const testTables = ["enterprise_attendance", "system_user"];
  const userObj = { userId: 1 } as unknown as UserObj;

  beforeAll(async () => {
    initAdminRegistry();
    await setupTestDb(db, [attendanceSql, systemUserSql]);
    await clearTestData(db, testTables);
  });

  beforeEach(async () => {
    await clearTestData(db, testTables);
    await db.run(
      sql`INSERT INTO system_user (id, username, password, lang_code, is_enabled, creator_id, role_id_arr) VALUES (101, 'employee_101', 'password', 'zh-CN', 1, 1, '[]')`
    );
  });

  afterEach(async () => {
    await clearTestData(db, testTables);
  });

  describe("基础 CRUD 功能测试", () => {
    it("全流程增删改查测试", async () => {
      // 1. 新增考勤记录
      const checkInTime = Date.now() - 3600000 * 8; // 8小时前签到
      const checkOutTime = Date.now(); // 现在签退
      const recordId = await attendanceService.add.service(
        {
          employeeId: 101,
          date: "2026-06-15",
          checkInTime,
          checkOutTime,
          status: 0, // 正常
          remark: "正常打卡",
        },
        userObj
      );
      expect(recordId).toBeGreaterThan(0);

      // 2. 获取考勤记录详情
      const record = await attendanceService.get.service(
        { id: recordId! },
        userObj
      );
      expect(record.employeeObj?.value).toBe(101);
      expect(record.date).toBe("2026-06-15");
      expect(record.checkInTime).toBe(checkInTime);
      expect(record.checkOutTime).toBe(checkOutTime);
      expect(record.status).toBe(0);
      expect(record.remark).toBe("正常打卡");

      // 3. 更新考勤记录
      const updatedId = await attendanceService.update.service(
        {
          id: recordId!,
          employeeId: 101,
          date: "2026-06-15",
          checkInTime,
          checkOutTime,
          status: 1, // 迟到
          remark: "迟到打卡说明",
        },
        userObj
      );
      expect(updatedId).toBe(recordId);

      const recordAfterUpdate = await attendanceService.get.service(
        { id: recordId! },
        userObj
      );
      expect(recordAfterUpdate.status).toBe(1);
      expect(recordAfterUpdate.remark).toBe("迟到打卡说明");

      // 4. 删除考勤记录
      const deletedId = await attendanceService.delete.service(
        { id: recordId! },
        userObj
      );
      expect(deletedId).toBe(recordId);

      await expect(
        attendanceService.get.service({ id: recordId! }, userObj)
      ).rejects.toThrow();
    });
  });

  describe("前置逻辑校验", () => {
    it("签退时间早于或等于签到时间时，应抛出冲突错误", async () => {
      const now = Date.now();
      await expect(
        attendanceService.add.service(
          {
            employeeId: 102,
            date: "2026-06-15",
            checkInTime: now,
            checkOutTime: now - 1000, // 签退早于签到
            status: 0,
          },
          userObj
        )
      ).rejects.toThrow();

      await expect(
        attendanceService.add.service(
          {
            employeeId: 102,
            date: "2026-06-15",
            checkInTime: now,
            checkOutTime: now, // 签退等于签到
            status: 0,
          },
          userObj
        )
      ).rejects.toThrow();
    });
  });

  describe("检索与过滤列表测试", () => {
    beforeEach(async () => {
      // 写入几条测试数据
      await attendanceService.add.service(
        {
          employeeId: 201,
          date: "2026-06-14",
          checkInTime: Date.now() - 3600000,
          checkOutTime: Date.now(),
          status: 0,
        },
        userObj
      );
      await attendanceService.add.service(
        {
          employeeId: 202,
          date: "2026-06-15",
          checkInTime: Date.now() - 3600000,
          checkOutTime: Date.now(),
          status: 1, // 迟到
        },
        userObj
      );
      await attendanceService.add.service(
        {
          employeeId: 201,
          date: "2026-06-15",
          checkInTime: Date.now() - 3600000,
          checkOutTime: Date.now(),
          status: 2, // 早退
        },
        userObj
      );
    });

    it("不分页全部查询 (listAll)", async () => {
      // 1. 无过滤条件
      const allList = await attendanceService.listAll.service({}, userObj);
      expect(allList.length).toBe(3);

      // 2. 状态过滤
      const listStatus2 = await attendanceService.listAll.service(
        { status: 2 },
        userObj
      );
      expect(listStatus2.length).toBe(1);
      expect(listStatus2[0].employeeId).toBe(201);

      // 3. 员工ID过滤
      const listEmp201 = await attendanceService.listAll.service(
        { employeeId: 201 },
        userObj
      );
      expect(listEmp201.length).toBe(2);
    });

    it("分页查询及多维度过滤 (list)", async () => {
      // 1. 分页基本校验
      const pageResult1 = await attendanceService.list.service(
        { pageNo: 1, pageSize: 2 },
        userObj
      );
      expect(pageResult1.total).toBe(3);
      expect(pageResult1.list.length).toBe(2);

      // 2. 组合过滤 (员工 201 在 2026-06-15 这一天)
      const pageResult2 = await attendanceService.list.service(
        { employeeId: 201, date: "2026-06-15", pageNo: 1, pageSize: 10 },
        userObj
      );
      expect(pageResult2.total).toBe(1);
      expect(pageResult2.list[0].status).toBe(2);
    });
  });
});
