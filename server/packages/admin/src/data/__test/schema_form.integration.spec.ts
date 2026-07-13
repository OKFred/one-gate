import { describe, it, expect, beforeAll, afterEach } from "vitest";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import schemaFormService from "../schema_form/service";
import schemaFormDataService from "../schema_form_data/service";
import { userTable } from "../../system/user/model";
import type { UserObj } from "@hodor/core/types/app";
import { initAdminRegistry } from "../../register.js";

// 静态导入 SQL 文件
import schemaFormSql from "@hodor/core/db/sql/system_schema_form.sql?raw";
import schemaFormDataSql from "@hodor/core/db/sql/system_schema_form_data.sql?raw";
import userSql from "@hodor/core/db/sql/system_user.sql?raw";

// 一个用于测试的简单 JSON Schema
const CONTACT_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    name: { type: "string", maxLength: 100 },
    email: { type: "string", format: "email" },
    age: { type: "integer", minimum: 0, maximum: 150 },
  },
  required: ["name", "email"],
  additionalProperties: false,
});

describe("System SchemaForm & SchemaFormData 全链路集成测试", () => {
  const testTables = [
    "system_schema_form",
    "system_schema_form_data",
    "system_user",
  ];

  const adminUserObj = { userId: 1, langCode: "zh-CN" } as unknown as UserObj;

  beforeAll(async () => {
    initAdminRegistry();
    await setupTestDb(db, [userSql, schemaFormSql, schemaFormDataSql]);

    // 插入一个用于关联 creatorName 的测试用户
    await db.insert(userTable).values({
      id: 1,
      username: "admin",
      password: "hashed_pw",
      langCode: "zh-CN",
      isEnabled: true,
      roleIdArr: [],
      creatorId: 1,
    });
  });

  afterEach(async () => {
    await clearTestData(db, ["system_schema_form_data", "system_schema_form"]);
  });

  describe("SchemaForm（表单定义）管理", () => {
    it("全流程增删改查及按 code 查询", async () => {
      // 1. 新增
      const formId = await schemaFormService.add.service(
        {
          code: "contact_form",
          name: "联系人表单",
          schemaData: CONTACT_SCHEMA,
          uiSchemaData: null,
          remark: "用于收集联系人信息",
          isEnabled: true,
        },
        adminUserObj
      );
      expect(formId).toBeGreaterThan(0);

      // 2. 按 ID 查询
      const formById = await schemaFormService.get.service({ id: formId! });
      expect(formById?.code).toBe("contact_form");
      expect(formById?.name).toBe("联系人表单");
      expect(formById?.creatorName).toBe("admin");

      // 3. 按 Code 查询
      const formByCode = await schemaFormService.get.service({
        code: "contact_form",
      });
      expect(formByCode?.id).toBe(formId);

      // 4. 重复 code 应报错（unique 约束）
      await expect(
        schemaFormService.add.service(
          {
            code: "contact_form",
            name: "另一个联系人表单",
            schemaData: "{}",
            uiSchemaData: null,
            remark: null,
            isEnabled: true,
          },
          adminUserObj
        )
      ).rejects.toThrow();

      // 5. 更新
      const updatedId = await schemaFormService.update.service(
        {
          id: formId!,
          name: "联系人表单（更新版）",
          isEnabled: false,
        },
        adminUserObj
      );
      expect(updatedId).toBe(formId);

      const formAfterUpdate = await schemaFormService.get.service({
        id: formId!,
      });
      expect(formAfterUpdate?.name).toBe("联系人表单（更新版）");
      expect(formAfterUpdate?.isEnabled).toBe(false);
      expect(formAfterUpdate?.updaterName).toBe("admin");

      // 6. 列表
      const listRes = await schemaFormService.list.service({
        pageNo: 1,
        pageSize: 10,
      });
      expect(listRes.total).toBe(1);
      expect(listRes.list[0].id).toBe(formId);

      // 7. 删除
      const deletedId = await schemaFormService.delete.service({ id: formId! });
      expect(deletedId).toBe(formId);

      await expect(
        schemaFormService.get.service({ id: formId! })
      ).rejects.toThrow();
    });
  });

  describe("SchemaFormData（表单数据）提交与校验", () => {
    it("提交合法数据并验证 Upsert 行为", async () => {
      // 每个测试独立创建表单，避免 afterEach 清理导致后续测试失败
      const formId = await schemaFormService.add.service(
        {
          code: "survey_form_upsert",
          name: "Upsert 测试问卷",
          schemaData: CONTACT_SCHEMA,
          uiSchemaData: null,
          remark: null,
          isEnabled: true,
        },
        adminUserObj
      );
      expect(formId).toBeGreaterThan(0);

      const validData = {
        name: "张三",
        email: "zhangsan@example.com",
        age: 25,
      };

      // 首次提交（Insert）
      const insertedId = await schemaFormDataService.submit.service(
        {
          formCode: "survey_form_upsert",
          businessId: 1001,
          data: validData,
        },
        adminUserObj
      );
      expect(insertedId).toBeGreaterThan(0);

      // 查询确认
      const record = await schemaFormDataService.get.service({
        formCode: "survey_form_upsert",
        businessId: 1001,
      });
      expect(JSON.parse(record!.dataContent)).toEqual(validData);
      expect(record!.creatorName).toBe("admin");

      // 再次提交相同 formCode + businessId（Upsert → Update）
      const updatedData = {
        name: "张三（更新）",
        email: "zhangsan_new@example.com",
      };
      const upsertedId = await schemaFormDataService.submit.service(
        {
          formCode: "survey_form_upsert",
          businessId: 1001,
          data: updatedData,
        },
        adminUserObj
      );
      // Upsert 后返回的是原记录 ID
      expect(upsertedId).toBe(insertedId);

      const updatedRecord = await schemaFormDataService.get.service({
        formCode: "survey_form_upsert",
        businessId: 1001,
      });
      expect(JSON.parse(updatedRecord!.dataContent)).toEqual(updatedData);
    });

    it("提交不符合 JSON Schema 的数据，应该抛出校验错误", async () => {
      await schemaFormService.add.service(
        {
          code: "survey_form_validation",
          name: "校验测试问卷",
          schemaData: CONTACT_SCHEMA,
          uiSchemaData: null,
          remark: null,
          isEnabled: true,
        },
        adminUserObj
      );

      // 缺少 required 的 email 字段
      await expect(
        schemaFormDataService.submit.service(
          {
            formCode: "survey_form_validation",
            businessId: 2001,
            data: { name: "测试用户" }, // 缺少 email
          },
          adminUserObj
        )
      ).rejects.toThrow();

      // age 超出范围
      await expect(
        schemaFormDataService.submit.service(
          {
            formCode: "survey_form_validation",
            businessId: 2002,
            data: { name: "超龄用户", email: "old@example.com", age: 200 },
          },
          adminUserObj
        )
      ).rejects.toThrow();

      // 含有不允许的额外字段（additionalProperties: false）
      await expect(
        schemaFormDataService.submit.service(
          {
            formCode: "survey_form_validation",
            businessId: 2003,
            data: {
              name: "有问题的用户",
              email: "x@example.com",
              unknownField: "some_value",
            } as Record<string, unknown>,
          },
          adminUserObj
        )
      ).rejects.toThrow();
    });

    it("提交到不存在或已禁用的表单，应该抛出错误", async () => {
      const formId = await schemaFormService.add.service(
        {
          code: "survey_form_disable_test",
          name: "禁用测试问卷",
          schemaData: CONTACT_SCHEMA,
          uiSchemaData: null,
          remark: null,
          isEnabled: true,
        },
        adminUserObj
      );

      // 不存在的 formCode
      await expect(
        schemaFormDataService.submit.service(
          {
            formCode: "non_existent_form",
            businessId: 3001,
            data: { name: "test", email: "t@t.com" },
          },
          adminUserObj
        )
      ).rejects.toThrow();

      // 禁用该表单
      await schemaFormService.update.service(
        { id: formId!, isEnabled: false },
        adminUserObj
      );

      await expect(
        schemaFormDataService.submit.service(
          {
            formCode: "survey_form_disable_test",
            businessId: 3002,
            data: { name: "test", email: "t@t.com" },
          },
          adminUserObj
        )
      ).rejects.toThrow();
    });

    it("列表查询与删除", async () => {
      await schemaFormService.add.service(
        {
          code: "survey_form_list",
          name: "列表查询问卷",
          schemaData: CONTACT_SCHEMA,
          uiSchemaData: null,
          remark: null,
          isEnabled: true,
        },
        adminUserObj
      );

      // 提交三条不同业务ID的数据
      for (const bizId of [4001, 4002, 4003]) {
        await schemaFormDataService.submit.service(
          {
            formCode: "survey_form_list",
            businessId: bizId,
            data: { name: `用户${bizId}`, email: `u${bizId}@example.com` },
          },
          adminUserObj
        );
      }

      // 按 formCode 列表查询
      const listRes = await schemaFormDataService.list.service({
        pageNo: 1,
        pageSize: 10,
        formCode: "survey_form_list",
      });
      expect(listRes.total).toBe(3);

      // 按 businessId 过滤
      const listByBiz = await schemaFormDataService.list.service({
        pageNo: 1,
        pageSize: 10,
        formCode: "survey_form_list",
        businessId: 4002,
      });
      expect(listByBiz.total).toBe(1);
      expect(listByBiz.list[0].businessId).toBe(4002);

      // 按 ID 查询并删除
      const record = await schemaFormDataService.get.service({
        formCode: "survey_form_list",
        businessId: 4001,
      });
      const deletedId = await schemaFormDataService.delete.service({
        id: record!.id,
      });
      expect(deletedId).toBe(record!.id);

      await expect(
        schemaFormDataService.get.service({ id: record!.id })
      ).rejects.toThrow();
    });
  });
});
