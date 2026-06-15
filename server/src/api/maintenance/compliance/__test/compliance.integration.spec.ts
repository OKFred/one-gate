import { describe, it, expect, beforeAll, afterEach } from "vitest";
import db from "@/db/index";
import { setupTestDb, clearTestData } from "@/db/testHelper";
import { exportDeletionRecord } from "../service";
import * as complianceRepository from "../repository";

// 静态导入 SQL 文件
import complianceSql from "@/db/sql/maintenance_compliance.sql?raw";

describe("Compliance 全链路集成测试", () => {
  const testTables = ["compliance_archives"];

  beforeAll(async () => {
    await setupTestDb(db, [complianceSql]);
    await clearTestData(db, testTables);
  });

  afterEach(async () => {
    await clearTestData(db, testTables);
  });

  it("能够正确归档数据变更日志并进行多字段过滤查询", async () => {
    // 1. 插入多条合规归档数据
    const id1 = await exportDeletionRecord(
      {
        sourceTable: "users",
        sourcePrimaryKey: "user_001",
        deleteReason: "personal_data",
        deleteType: "purge",
        complianceNote: "(EU) 2016/679",
        restorable: false,
      },
      1
    );

    const id2 = await exportDeletionRecord(
      {
        sourceTable: "users",
        sourcePrimaryKey: "user_002",
        deleteReason: "system",
        deleteType: "anonymize",
        complianceNote: "(CN) PIPL 2021",
        restorable: true,
      },
      1
    );

    const id3 = await exportDeletionRecord(
      {
        sourceTable: "orders",
        sourcePrimaryKey: "order_999",
        deleteReason: "system",
        deleteType: "purge",
        restorable: false,
      },
      2
    );

    expect(id1).toBeGreaterThan(0);
    expect(id2).toBeGreaterThan(0);
    expect(id3).toBeGreaterThan(0);

    // 2. 查询全部归档记录并校验分页
    const pageAll = await complianceRepository.findPage({
      pageNo: 1,
      pageSize: 10,
    });
    expect(pageAll.total).toBe(3);
    expect(pageAll.list.length).toBe(3);

    // 3. 按 sourceTable 过滤
    const pageUsers = await complianceRepository.findPage({
      pageNo: 1,
      pageSize: 10,
      sourceTable: "users",
    });
    expect(pageUsers.total).toBe(2);
    expect(pageUsers.list.every((item) => item.sourceTable === "users")).toBe(
      true
    );

    // 4. 按 deleteReason 过滤
    const pageSystem = await complianceRepository.findPage({
      pageNo: 1,
      pageSize: 10,
      deleteReason: "system",
    });
    expect(pageSystem.total).toBe(2);

    // 5. 按关键字 keyword 搜索 (匹配 sourcePrimaryKey)
    const pageKeyword = await complianceRepository.findPage({
      pageNo: 1,
      pageSize: 10,
      keyword: "user_002",
    });
    expect(pageKeyword.total).toBe(1);
    expect(pageKeyword.list[0].sourcePrimaryKey).toBe("user_002");
  });
});
