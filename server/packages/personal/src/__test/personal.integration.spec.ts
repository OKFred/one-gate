import { describe, it, expect, beforeAll, afterEach, beforeEach } from "vitest";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import healthService from "../health/service.js";
import familyService from "../family/service.js";
import financialService from "../financial/service.js";
import socialService from "../social/service.js";
import type { UserObj } from "@hodor/core/types/app";

// 静态导入 SQL 文件
import medicalRecordsSql from "@hodor/core/db/sql/personal_medical_records.sql?raw";
import familyMembersSql from "@hodor/core/db/sql/personal_family_members.sql?raw";
import incomeRecordsSql from "@hodor/core/db/sql/personal_income_records.sql?raw";
import expenseRecordsSql from "@hodor/core/db/sql/personal_expense_records.sql?raw";
import financialDataSourcesSql from "@hodor/core/db/sql/personal_financial_data_sources.sql?raw";
import socialContactsSql from "@hodor/core/db/sql/personal_social_contacts.sql?raw";
import socialRelationsSql from "@hodor/core/db/sql/personal_social_relations.sql?raw";
import baseUserConfigSql from "@hodor/core/db/sql/base_user_config.sql?raw";
import systemUserSql from "@hodor/core/db/sql/system_user.sql?raw";

describe("Personal 个人应用全模块集成测试与 Mock 数据验证", () => {
  const testTables = [
    "personal_medical_records",
    "personal_family_members",
    "personal_income_records",
    "personal_expense_records",
    "personal_financial_data_sources",
    "personal_social_contacts",
    "personal_social_relations",
    "base_user_config",
    "system_user",
  ];

  const userObj = { id: 1, userId: 1, userName: "Admin" } as unknown as UserObj;

  beforeAll(async () => {
    await setupTestDb(db, [
      medicalRecordsSql,
      familyMembersSql,
      incomeRecordsSql,
      expenseRecordsSql,
      financialDataSourcesSql,
      socialContactsSql,
      socialRelationsSql,
      baseUserConfigSql,
      systemUserSql,
    ]);
    await clearTestData(db, testTables);
  });

  afterEach(async () => {
    await clearTestData(db, testTables);
  });

  // ─── 1. Health 医疗与健康模块 ─────────────────────────────────────────────────────────────
  describe("Health 医疗与健康模块", () => {
    it("全流程：新增、查询列表、过滤与删除医疗记录", async () => {
      // 1. 新增 3 条医疗记录 (对应原 Mock 数据)
      const res1 = await healthService.add.service(
        {
          category: "exam",
          title: "2026年度全面体检报告",
          hospitalName: "瑞金医院健康体检中心",
          doctorName: "张建国 主任医师",
          visitDateUtc: Date.now() - 30 * 86400 * 1000,
          diagnosis: "心电图正常，轻度脂肪肝，胃粘膜轻度充血",
          prescription: "注意规律饮食，减少熬夜，定期复查",
          cost: 1580,
          remark: "年度例行体检",
        },
        userObj
      );
      expect(res1.id).toBeGreaterThan(0);

      const res2 = await healthService.add.service(
        {
          category: "outpatient",
          title: "心功能与血压跟踪诊疗",
          hospitalName: "华山医院心血管内科",
          doctorName: "李华 教授",
          visitDateUtc: Date.now() - 15 * 86400 * 1000,
          diagnosis: "心律窦性，静息心率72次/分，血压118/78 mmHg",
          prescription: "辅酶Q10胶囊 每日一次",
          cost: 320,
          remark: "心脏健康随访",
        },
        userObj
      );
      expect(res2.id).toBeGreaterThan(0);

      const res3 = await healthService.add.service(
        {
          category: "outpatient",
          title: "肠胃不适门诊诊疗",
          hospitalName: "中山医院消化内科",
          doctorName: "王珍 医师",
          visitDateUtc: Date.now() - 5 * 86400 * 1000,
          diagnosis: "浅表性胃炎，胃动力正常",
          prescription: "奥美拉唑肠溶胶囊 20mg 早晚各一粒",
          cost: 185,
          remark: "饭后隐痛复查",
        },
        userObj
      );
      expect(res3.id).toBeGreaterThan(0);

      // 2. 查询列表 (全量)
      const listAll = await healthService.list.service(
        { pageNo: 1, pageSize: 50 },
        userObj
      );
      expect(listAll.total).toBe(3);
      expect(listAll.list.length).toBe(3);

      // 3. 校验特定条件过滤 (如 category = outpatient)
      const outpatientList = await healthService.list.service(
        { pageNo: 1, pageSize: 50, category: "outpatient" },
        userObj
      );
      expect(outpatientList.total).toBe(2);

      // 4. 更新记录
      await healthService.update.service(
        {
          id: res1.id,
          title: "2026年度全面体检报告 (已复核)",
          cost: 1600,
        },
        userObj
      );

      // 5. 删除记录
      await healthService.delete.service({ id: res1.id });
      const afterDelete = await healthService.list.service(
        { pageNo: 1, pageSize: 50 },
        userObj
      );
      expect(afterDelete.total).toBe(2);
    });
  });

  // ─── 2. Financial 个人财务模块 ────────────────────────────────────────────────────────────
  describe("Financial 个人财务模块", () => {
    it("收入/支出记录 CRUD、数据源同步与 Dashboard 汇总", async () => {
      // 1. 新增收入记录
      await financialService.incomeAdd.service(
        {
          sourceCategory: "salary",
          amount: 35000,
          incomeDateUtc: Date.now() - 10 * 86400 * 1000,
          payer: "科技集团有限公司",
          remark: "7月份固定薪资发放",
        },
        userObj
      );
      await financialService.incomeAdd.service(
        {
          sourceCategory: "bonus",
          amount: 15000,
          incomeDateUtc: Date.now() - 25 * 86400 * 1000,
          payer: "科技集团有限公司",
          remark: "Q2 季度绩效奖金",
        },
        userObj
      );

      // 2. 新增支出记录
      await financialService.expenseAdd.service(
        {
          expenseCategory: "housing",
          amount: 8500,
          expenseDateUtc: Date.now() - 12 * 86400 * 1000,
          payee: "招商银行住房贷款",
          paymentMethod: "bank_card",
          remark: "每月房贷自动扣款",
        },
        userObj
      );

      // 3. 校验 Income 与 Expense 列表
      const incomeList = await financialService.incomeList.service(
        { pageNo: 1, pageSize: 10 },
        userObj
      );
      expect(incomeList.total).toBe(2);

      const expenseList = await financialService.expenseList.service(
        { pageNo: 1, pageSize: 10 },
        userObj
      );
      expect(expenseList.total).toBe(1);

      // 4. 校验 Dashboard 看板数据
      const dashboardStats = await financialService.dashboard.service(
        {},
        userObj
      );
      expect(dashboardStats.totalIncome).toBe(50000);
      expect(dashboardStats.totalExpense).toBe(8500);
      expect(dashboardStats.netBalance).toBe(41500);

      // 5. 数据源数据 CRUD 与手动 Sync
      const dsRes = await financialService.dataSourceAdd.service(
        {
          sourceName: "招商银行交易流水自动抓取 Task",
          sourceType: "api_task",
          apiTaskId: 1,
          fieldMappingJson: JSON.stringify({ amount: "txnAmount" }),
          syncCron: "0 0 1 * * ?",
          isEnabled: true,
        },
        userObj
      );
      expect(dsRes.id).toBeGreaterThan(0);

      const syncRes = await financialService.dataSourceSync.service(
        { id: dsRes.id },
        userObj
      );
      expect(syncRes.success).toBe(true);
    });
  });

  // ─── 3. Family 家庭档案模块 ─────────────────────────────────────────────────────────────
  describe("Family 家庭档案模块", () => {
    it("家庭成员信息的全流程管理", async () => {
      // 1. 新增本人节点
      const selfMember = await familyService.add.service(
        {
          isSelf: true,
          relationType: "self",
          realName: "Admin",
          gender: "male",
          phone: "13800138000",
          isEmergencyContact: true,
          healthNote: "心率窦性偏缓，无重大遗留病史",
          remark: "个人主节点",
        },
        userObj
      );
      expect(selfMember.id).toBeGreaterThan(0);

      // 2. 新增配偶节点
      const spouseMember = await familyService.add.service(
        {
          isSelf: false,
          relationType: "spouse",
          realName: "林思琪",
          gender: "female",
          phone: "13900139000",
          isEmergencyContact: true,
          healthNote: "身体健康，有轻微花粉过敏史",
          remark: "妻子",
        },
        userObj
      );
      expect(spouseMember.id).toBeGreaterThan(0);

      // 3. 列表与筛选
      const familyList = await familyService.list.service(
        { pageNo: 1, pageSize: 50 },
        userObj
      );
      expect(familyList.total).toBe(2);

      // 4. 更新成员
      await familyService.update.service(
        {
          id: spouseMember.id,
          remark: "爱妻",
        },
        userObj
      );

      // 5. 删除成员
      await familyService.delete.service({ id: spouseMember.id });
      const afterDelete = await familyService.list.service(
        { pageNo: 1, pageSize: 50 },
        userObj
      );
      expect(afterDelete.total).toBe(1);
    });
  });

  // ─── 4. Social 人脉与关系图谱模块 ──────────────────────────────────────────────────────────
  describe("Social 人脉与关系图谱模块", () => {
    it("联系人管理与图谱节点导向", async () => {
      // 1. 添加联系人
      const c1 = await socialService.contactAdd.service(
        {
          realName: "陈志远",
          relationCircle: "close_friend",
          company: "未来科技集团",
          position: "CTO 首席技术官",
          phone: "13611112222",
          email: "chenzy@futuretech.com",
          intimacyLevel: 5,
          remark: "核心挚友",
        },
        userObj
      );
      const c2 = await socialService.contactAdd.service(
        {
          realName: "赵悦",
          relationCircle: "colleague",
          company: "极客联合实验室",
          position: "高级产品总监",
          phone: "13833334444",
          email: "zhaoyue@geeklab.io",
          intimacyLevel: 4,
          remark: "项目负责人",
        },
        userObj
      );

      // 2. 联系人列表查询
      const contacts = await socialService.contactList.service(
        { pageNo: 1, pageSize: 50 },
        userObj
      );
      expect(contacts.total).toBe(2);

      // 3. 获取 Graph 图谱结构
      const graphData = await socialService.graph.service({}, userObj);
      expect(graphData.contacts.length).toBe(2);
      expect(Array.isArray(graphData.relations)).toBe(true);
    });
  });
});
