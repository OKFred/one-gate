import { describe, it, expect, beforeAll, afterEach } from "vitest";
import db from "@/db/index";
import { setupTestDb, clearTestData } from "@/db/testHelper";
import userService from "../user/service";
import roleService from "../role/service";
import permissionService from "../permission/service";
import rolePermissionService, {
  utils as rolePermissionUtils,
} from "../role_permission/service";
import departmentService from "../department/service";
import { can } from "@/middleware/auth/permission";
import { roleTable } from "../role/model";
import { languageTable } from "@/api/i18n/language/model";
import type { UserObj } from "@/types/app";
import { DataScope } from "@/types/dataScope";

// 静态导入 SQL 文件
import userSql from "@/db/sql/system_user.sql?raw";
import roleSql from "@/db/sql/system_role.sql?raw";
import permissionSql from "@/db/sql/system_permission.sql?raw";
import rolePermissionSql from "@/db/sql/system_role_permission.sql?raw";
import departmentSql from "@/db/sql/system_department.sql?raw";
import menuSql from "@/db/sql/system_menu.sql?raw";
import languageSql from "@/db/sql/i18n_language.sql?raw";
import regionSql from "@/db/sql/i18n_region.sql?raw";

describe("System User / Role / Permission RBAC 全链路集成测试", () => {
  const testTables = [
    "system_user",
    "system_role",
    "system_permission",
    "system_role_permission",
    "system_department",
    "system_menu",
    "i18n_language",
    "i18n_region",
  ];

  const adminUserObj = { userId: 1, langCode: "zh-CN" } as unknown as UserObj;

  beforeAll(async () => {
    await setupTestDb(db, [
      userSql,
      roleSql,
      permissionSql,
      rolePermissionSql,
      departmentSql,
      menuSql,
      languageSql,
      regionSql,
    ]);
  });

  afterEach(async () => {
    await clearTestData(db, testTables);
  });

  describe("部门（Department）管理", () => {
    it("全流程增删改查", async () => {
      const deptId = await departmentService.add.service(
        {
          name: "研发部",
          parentId: null,
          isEnabled: true,
          remark: "核心技术团队",
        },
        adminUserObj
      );
      expect(deptId).toBeGreaterThan(0);

      // 查询
      const dept = await departmentService.get.service({ id: deptId! });
      expect(dept?.name).toBe("研发部");
      expect(dept?.isEnabled).toBe(true);

      // 更新
      const updatedId = await departmentService.update.service(
        { id: deptId!, name: "前端研发部", isEnabled: false },
        adminUserObj
      );
      expect(updatedId).toBe(deptId);

      const deptAfterUpdate = await departmentService.get.service({
        id: deptId!,
      });
      expect(deptAfterUpdate?.name).toBe("前端研发部");
      expect(deptAfterUpdate?.isEnabled).toBe(false);

      // 列表
      const listRes = await departmentService.list.service({
        pageNo: 1,
        pageSize: 10,
        keyword: "前端",
      });
      expect(listRes.total).toBe(1);
      expect(listRes.list[0].id).toBe(deptId);

      // 删除
      const deletedId = await departmentService.delete.service(
        { id: deptId! },
        adminUserObj
      );
      expect(deletedId).toBe(deptId);

      await expect(
        departmentService.get.service({ id: deptId! })
      ).rejects.toThrow();
    });
  });

  describe("权限（Permission）管理", () => {
    it("全流程增删改查并防止重复 code", async () => {
      const permId = await permissionService.add.service(
        {
          code: "user:read",
          name: "读取用户",
          category: "action",
          resource: "/api/users",
          business: "system.user",
          remark: "读取用户列表",
          isEnabled: true,
        },
        adminUserObj
      );
      expect(permId).toBeGreaterThan(0);

      // 重复 code 应报错
      await expect(
        permissionService.add.service(
          {
            code: "user:read",
            name: "读取用户（重复）",
            category: "action",
            resource: null,
            business: null,
            remark: null,
            isEnabled: true,
          },
          adminUserObj
        )
      ).rejects.toThrow();

      // 查询
      const perm = await permissionService.get.service({ id: permId! });
      expect(perm?.code).toBe("user:read");

      // 更新
      const updatedId = await permissionService.update.service(
        { id: permId!, name: "查看用户列表", isEnabled: false },
        adminUserObj
      );
      expect(updatedId).toBe(permId);

      const permAfterUpdate = await permissionService.get.service({
        id: permId!,
      });
      expect(permAfterUpdate?.name).toBe("查看用户列表");
      expect(permAfterUpdate?.isEnabled).toBe(false);

      // 列表过滤
      const listRes = await permissionService.list.service({
        pageNo: 1,
        pageSize: 10,
        keyword: "查看用户",
      });
      expect(listRes.total).toBe(1);

      // 删除
      await permissionService.delete.service({ id: permId! }, adminUserObj);
      await expect(
        permissionService.get.service({ id: permId! })
      ).rejects.toThrow();
    });
  });

  describe("角色（Role）管理与权限关联", () => {
    it("创建角色、分配权限、批量增删并验证关联列表", async () => {
      // 占位超管角色 ID=1
      await db.insert(roleTable).values({
        id: 1,
        name: "超级管理员",
        remark: null,
        isEnabled: true,
        permissionCount: 0,
        dataScope: DataScope.ALL,
        creatorId: 1,
      });

      // 创建普通角色
      const roleId = await roleService.add.service(
        {
          name: "编辑员",
          remark: "内容编辑",
          isEnabled: true,
          permissionCount: 0,
          dataScope: DataScope.SELF_ONLY,
          customDeptIds: null,
        },
        adminUserObj
      );
      expect(roleId).toBeGreaterThan(1); // 大于 1，不是超管

      // 创建两个权限
      const permId1 = await permissionService.add.service(
        {
          code: "post:read",
          name: "读取文章",
          category: "action",
          resource: "/api/posts",
          business: "cms.post",
          remark: null,
          isEnabled: true,
        },
        adminUserObj
      );
      const permId2 = await permissionService.add.service(
        {
          code: "post:write",
          name: "编辑文章",
          category: "action",
          resource: "/api/posts/:id",
          business: "cms.post",
          remark: null,
          isEnabled: true,
        },
        adminUserObj
      );

      // 批量添加权限到角色
      const batchRes = await rolePermissionService.batchAdd.service(
        {
          roleId: roleId!,
          permissionIds: [permId1!, permId2!],
        },
        adminUserObj
      );
      expect(batchRes).toBe(2);

      // 查询关联列表
      const listRes = await rolePermissionService.listAll.service({
        roleId: roleId!,
      });
      expect(listRes.length).toBe(2);

      // 查询角色拥有的权限
      const permsOfRole =
        await rolePermissionService.getPermissionsByRole.service({
          roleId: roleId!,
        });
      const permCodes = permsOfRole.map((p) => p.code);
      expect(permCodes).toContain("post:read");
      expect(permCodes).toContain("post:write");

      // 批量删除一个权限
      const batchDelRes = await rolePermissionService.batchDelete.service(
        {
          roleId: roleId!,
          permissionIds: [permId1!],
        },
        adminUserObj
      );
      expect(batchDelRes).toBe(1);

      const permsAfterDel =
        await rolePermissionService.getPermissionsByRole.service({
          roleId: roleId!,
        });
      expect(permsAfterDel.length).toBe(1);
      expect(permsAfterDel[0].code).toBe("post:write");
    });
  });

  describe("用户（User）RBAC 权限验证", () => {
    it("用户绑定多角色、can() 校验权限，以及 dataScope 读取", async () => {
      // 准备语言数据（userService.add 内部校验 langCode）
      await db.insert(languageTable).values([
        {
          id: 1,
          langCode: "zh-CN",
          nativeName: "中文（中国）",
          isEnabled: true,
          sortOrder: 1,
          creatorId: 1,
        },
      ]);

      // 占位超管角色
      await db.insert(roleTable).values({
        id: 1,
        name: "超级管理员",
        remark: null,
        isEnabled: true,
        permissionCount: 0,
        dataScope: DataScope.ALL,
        creatorId: 1,
      });

      // 创建两个角色
      const roleAId = await roleService.add.service(
        {
          name: "角色A",
          remark: null,
          isEnabled: true,
          permissionCount: 0,
          dataScope: DataScope.SELF_ONLY,
          customDeptIds: null,
        },
        adminUserObj
      );
      const roleBId = await roleService.add.service(
        {
          name: "角色B",
          remark: null,
          isEnabled: true,
          permissionCount: 0,
          dataScope: DataScope.DEPT_AND_BELOW,
          customDeptIds: null,
        },
        adminUserObj
      );

      // 创建权限分别绑定到 A、B
      const permAId = await permissionService.add.service(
        {
          code: "report:view",
          name: "查看报表",
          category: "action",
          resource: "/api/reports",
          business: "report",
          remark: null,
          isEnabled: true,
        },
        adminUserObj
      );
      const permBId = await permissionService.add.service(
        {
          code: "report:export",
          name: "导出报表",
          category: "action",
          resource: "/api/reports/export",
          business: "report",
          remark: null,
          isEnabled: true,
        },
        adminUserObj
      );

      await rolePermissionService.batchAdd.service(
        { roleId: roleAId!, permissionIds: [permAId!] },
        adminUserObj
      );
      await rolePermissionService.batchAdd.service(
        { roleId: roleBId!, permissionIds: [permBId!] },
        adminUserObj
      );

      // 创建用户并绑定两个角色
      const userId = await userService.add.service(
        {
          username: "rbac_user",
          password: Buffer.from("testpass").toString("base64"),
          isEnabled: true,
          langCode: "zh-CN",
          remark: null,
          regionObj: null,
          departmentObj: null,
          roleArr: [
            { value: roleAId!, label: "角色A" },
            { value: roleBId!, label: "角色B" },
          ],
        },
        adminUserObj
      );
      expect(userId).toBeGreaterThan(0);

      // 验证用户记录
      const userRecord = await userService.get.service({ id: userId! });
      expect(userRecord.roleArr).toHaveLength(2);

      // 构造拥有双角色的 UserObj，测试 can()
      const rbacUser = {
        userId: userId!,
        roleIds: [roleAId!, roleBId!],
        permissions: [],
        isSuperAdmin: false,
        _isLoaded: false,
        ensureLoaded: async function () {
          if (this._isLoaded) return;
          this.permissions = await rolePermissionUtils.getPermissionsByRoleIds(
            this.roleIds
          );
          this._isLoaded = true;
        },
      } as unknown as UserObj;

      // 拥有来自角色 A 的权限
      expect(await can(rbacUser, "view", "report")).toBe(true);
      // 拥有来自角色 B 的权限
      expect(await can(rbacUser, "export", "report")).toBe(true);
      // 不拥有的权限
      expect(await can(rbacUser, "delete", "report")).toBe(false);
    });

    it("禁用角色后，getPermissionsByRoleIds 应过滤掉已禁用角色的权限", async () => {
      // 准备语言数据
      await db.insert(languageTable).values({
        id: 1,
        langCode: "zh-CN",
        nativeName: "中文（中国）",
        isEnabled: true,
        sortOrder: 1,
        creatorId: 1,
      });

      // 占位超管
      await db.insert(roleTable).values({
        id: 1,
        name: "超级管理员",
        remark: null,
        isEnabled: true,
        permissionCount: 0,
        dataScope: DataScope.ALL,
        creatorId: 1,
      });

      // 创建角色（初始启用）
      const roleId = await roleService.add.service(
        {
          name: "临时角色",
          remark: null,
          isEnabled: true,
          permissionCount: 0,
          dataScope: DataScope.SELF_ONLY,
          customDeptIds: null,
        },
        adminUserObj
      );

      // 创建权限并绑定
      const permId = await permissionService.add.service(
        {
          code: "temp:access",
          name: "临时访问",
          category: "action",
          resource: "/api/temp",
          business: "temp",
          remark: null,
          isEnabled: true,
        },
        adminUserObj
      );
      await rolePermissionService.batchAdd.service(
        { roleId: roleId!, permissionIds: [permId!] },
        adminUserObj
      );

      // 启用时拥有权限
      const permsEnabled = await rolePermissionUtils.getPermissionsByRoleIds([
        roleId!,
      ]);
      expect(permsEnabled.length).toBeGreaterThan(0);

      // 禁用该角色
      await roleService.update.service(
        { id: roleId!, isEnabled: false },
        adminUserObj
      );

      // 禁用后应过滤掉
      const permsDisabled = await rolePermissionUtils.getPermissionsByRoleIds([
        roleId!,
      ]);
      expect(permsDisabled.length).toBe(0);
    });
  });
});
