import { describe, it, expect, beforeAll, afterEach } from "vitest";
import db from "@/db/index";
import { setupTestDb, clearTestData } from "@/db/testHelper";
import languageService, { utils as languageUtils } from "../language/service";
import regionService, { utils as regionUtils } from "../region/service";
import translationService, {
  utils as translationUtils,
} from "../translation/service";
import { kv } from "@/middleware/cache";

// 静态导入 SQL 文件
import languageSql from "@/db/sql/i18n_language.sql?raw";
import regionSql from "@/db/sql/i18n_region.sql?raw";
import translationSql from "@/db/sql/i18n_translation.sql?raw";

describe("i18n 全链路集成测试", () => {
  const testTables = ["i18n_language", "i18n_region", "i18n_translation"];

  beforeAll(async () => {
    await setupTestDb(db, [languageSql, regionSql, translationSql]);
    await clearTestData(db, testTables);
  });

  afterEach(async () => {
    await clearTestData(db, testTables);
    await kv.clear();
  });

  describe("Language 模块集成测试", () => {
    it("全流程增删改查测试", async () => {
      // 1. Add
      const langId = await languageService.add.service(
        {
          langCode: "zh-CN",
          nativeName: "简体中文",
          isEnabled: true,
          sortOrder: 1,
          remark: "Chinese",
        },
        { userId: 1 }
      );
      expect(langId).toBeGreaterThan(0);

      // 2. Get
      const lang = await languageService.get.service({ id: langId! });
      expect(lang.langCode).toBe("zh-CN");
      expect(lang.nativeName).toBe("简体中文");
      expect(lang.isEnabled).toBe(true);

      // 3. Update
      const updatedId = await languageService.update.service(
        {
          id: langId!,
          nativeName: "中文简体",
          isEnabled: false,
          sortOrder: 2,
        },
        { userId: 2 } as any
      );
      expect(updatedId).toBe(langId);

      const langAfterUpdate = await languageService.get.service({
        id: langId!,
      });
      expect(langAfterUpdate.nativeName).toBe("中文简体");
      expect(langAfterUpdate.isEnabled).toBe(false);
      expect(langAfterUpdate.sortOrder).toBe(2);

      // 4. Delete
      const deletedId = await languageService.delete.service({ id: langId! });
      expect(deletedId).toBe(langId);

      await expect(
        languageService.get.service({ id: langId! })
      ).rejects.toThrow();
    });

    it("列表查询测试 (list & listAll)", async () => {
      await languageService.add.service(
        {
          langCode: "zh-CN",
          nativeName: "简体中文",
          isEnabled: true,
          sortOrder: 1,
        },
        { userId: 1 }
      );
      await languageService.add.service(
        {
          langCode: "en-US",
          nativeName: "English",
          isEnabled: false,
          sortOrder: 2,
        },
        { userId: 1 }
      );

      // listAll (不分页)
      const allList = await languageService.listAll.service({
        isEnabled: true,
      });
      expect(allList.length).toBe(1);
      expect(allList[0].langCode).toBe("zh-CN");

      // list (分页)
      const pageResult = await languageService.list.service({
        pageNo: 1,
        pageSize: 10,
      });
      expect(pageResult.total).toBe(2);
      expect(pageResult.list.length).toBe(2);
    });

    it("验证工具函数测试", async () => {
      await languageService.add.service(
        {
          langCode: "zh-CN",
          nativeName: "简体中文",
          isEnabled: true,
          sortOrder: 1,
        },
        { userId: 1 }
      );

      // verifyLangCode
      await expect(
        languageUtils.verifyLangCode("zh-CN")
      ).resolves.not.toThrow();
      await expect(languageUtils.verifyLangCode("en-US")).rejects.toThrow();

      // verifyLangCodeUnique
      const isUnique1 = await languageUtils.verifyLangCodeUnique("en-US");
      expect(isUnique1).toBe(true);

      const isUnique2 = await languageUtils.verifyLangCodeUnique("zh-CN");
      expect(isUnique2).toBe(false);
    });
  });

  describe("Region 模块集成测试", () => {
    it("全流程增删改查测试", async () => {
      // 1. Add
      const regionId = await regionService.add.service(
        {
          labels: { "zh-CN": "中国", "en-US": "China" },
          alpha2Code: "CN",
          alpha3Code: "CHN",
          numeric: 156,
          iso3166Independent: true,
          businessLanguages: ["zh-CN"],
          isEnabled: true,
          remark: "Mainland",
        },
        { userId: 1 }
      );
      expect(regionId).toBeGreaterThan(0);

      // 2. Get
      const region = await regionService.get.service({ id: regionId! });
      expect(region.alpha2Code).toBe("CN");
      expect(region.alpha3Code).toBe("CHN");
      expect(region.labels).toEqual({ "zh-CN": "中国", "en-US": "China" });

      // 3. Update
      const updatedId = await regionService.update.service(
        {
          id: regionId!,
          labels: { "zh-CN": "中国大陆", "en-US": "Mainland China" },
          isEnabled: false,
        },
        { userId: 2 } as any
      );
      expect(updatedId).toBe(regionId);

      const regionAfterUpdate = await regionService.get.service({
        id: regionId!,
      });
      expect(regionAfterUpdate.labels).toEqual({
        "zh-CN": "中国大陆",
        "en-US": "Mainland China",
      });
      expect(regionAfterUpdate.isEnabled).toBe(false);

      // 4. Delete
      const deletedId = await regionService.delete.service({ id: regionId! });
      expect(deletedId).toBe(regionId);

      await expect(
        regionService.get.service({ id: regionId! })
      ).rejects.toThrow();
    });

    it("列表查询测试 (list & listAll)", async () => {
      await regionService.add.service(
        {
          labels: { "zh-CN": "中国" },
          alpha2Code: "CN",
          alpha3Code: "CHN",
          numeric: 156,
          iso3166Independent: true,
          isEnabled: true,
          remark: "",
          businessLanguages: [],
        },
        { userId: 1 }
      );

      const allList = await regionService.listAll.service({ isEnabled: true });
      expect(allList.length).toBe(1);
      expect(allList[0].alpha2Code).toBe("CN");

      const pageResult = await regionService.list.service({
        pageNo: 1,
        pageSize: 10,
      });
      expect(pageResult.total).toBe(1);
    });

    it("验证工具函数测试", async () => {
      const regionId = await regionService.add.service(
        {
          labels: { "zh-CN": "中国" },
          alpha2Code: "CN",
          alpha3Code: "CHN",
          numeric: 156,
          iso3166Independent: true,
          isEnabled: true,
          remark: "",
          businessLanguages: [],
        },
        { userId: 1 }
      );

      // verifyRegion
      await expect(regionUtils.verifyRegion(regionId!)).resolves.not.toThrow();
      await expect(regionUtils.verifyRegion(99999)).rejects.toThrow();

      // verifyRegionCodeUnique
      const uniqueRes1 = await regionUtils.verifyRegionCodeUnique({
        alpha2Code: "US",
      });
      expect(uniqueRes1).toBe(true);

      const uniqueRes2 = await regionUtils.verifyRegionCodeUnique({
        alpha2Code: "CN",
      });
      expect(uniqueRes2).toBe(false);
    });
  });

  describe("Translation 模块集成测试", () => {
    it("全流程增删改查及 KV 同步测试", async () => {
      const tValue = "保存";
      const valueHash = await translationUtils.calculateSHA256(tValue);

      // 1. Add (application: backend 应该会触发 KV 同步)
      const transId = await translationService.add.service(
        {
          application: "backend",
          business: "core",
          langCode: "zh-CN",
          tKey: "common.save",
          tValue,
          valueHash,
          isEnabled: true,
          remark: "Save button",
        },
        { userId: 1 }
      );
      expect(transId).toBeGreaterThan(0);

      // 验证 KV 写入
      const cacheVal1 = await kv.get("i18n.translation:zh-CN.common.save");
      expect(cacheVal1).toBe("保存");

      // 2. Get
      const trans = await translationService.get.service({ id: transId! });
      expect(trans.tKey).toBe("common.save");
      expect(trans.tValue).toBe("保存");

      // 3. Update
      const newTValue = "保存修改";
      const newValueHash = await translationUtils.calculateSHA256(newTValue);
      await translationService.update.service(
        {
          id: transId!,
          application: "backend",
          business: "core",
          langCode: "zh-CN",
          tKey: "common.save",
          tValue: newTValue,
          valueHash: newValueHash,
          isEnabled: true,
        },
        { userId: 2 } as any
      );

      // 验证 KV 更新
      const cacheVal2 = await kv.get("i18n.translation:zh-CN.common.save");
      expect(cacheVal2).toBe("保存修改");

      // 4. Delete
      await translationService.delete.service({ id: transId! });

      // 验证 KV 删除
      const cacheVal3 = await kv.get("i18n.translation:zh-CN.common.save");
      expect(cacheVal3).toBeNull();
    });

    it("查重与工具函数测试", async () => {
      const tValue = "取消";
      const valueHash = await translationUtils.calculateSHA256(tValue);

      const transId = await translationService.add.service(
        {
          application: "frontend",
          business: "core",
          langCode: "zh-CN",
          tKey: "common.cancel",
          tValue,
          valueHash,
          isEnabled: true,
          remark: "",
        },
        { userId: 1 }
      );

      // checkDuplicate
      const dupRes = await translationService.checkDuplicate.service({
        tValue,
        valueHash,
      });
      expect(dupRes.hasDuplicate).toBe(true);
      expect(dupRes.duplicates[0].id).toBe(transId);

      // getTranslationsByIds
      const labels = await translationUtils.getTranslationsByIds([transId!]);
      expect(labels).toEqual([{ value: transId, label: "common.cancel" }]);

      // verifyTKeyUnique
      const isUnique1 = await translationUtils.verifyTKeyUnique({
        tKey: "common.cancel",
        langCode: "zh-CN",
      });
      expect(isUnique1).toBe(false);

      const isUnique2 = await translationUtils.verifyTKeyUnique({
        tKey: "common.ok",
        langCode: "zh-CN",
      });
      expect(isUnique2).toBe(true);
    });
  });
});
