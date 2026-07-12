import { describe, it, expect, beforeAll, afterEach } from "vitest";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import authService from "../auth/service";
import userService from "../user/service";
import roleService from "../role/service";
import permissionService from "../permission/service";
import rolePermissionService, {
  utils as rolePermissionUtils,
} from "../role_permission/service";
import { departmentTable } from "../department/model";
import { regionTable } from "../../i18n/region/model";
import { languageTable } from "../../i18n/language/model";
import { roleTable } from "../role/model";
import { can } from "@hodor/core/middleware/auth/permission";
import type { UserObj } from "@hodor/core/types/app";
import { initInfraRegistry } from "../../register.js";

// 静态导入 SQL 文件
import userSql from "@hodor/core/db/sql/system_user.sql?raw";
import roleSql from "@hodor/core/db/sql/system_role.sql?raw";
import permissionSql from "@hodor/core/db/sql/system_permission.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/system_role_permission.sql?raw";
import departmentSql from "@hodor/core/db/sql/system_department.sql?raw";
import menuSql from "@hodor/core/db/sql/system_menu.sql?raw";
import auditLoginSql from "@hodor/core/db/sql/maintenance_audit_login.sql?raw";
import regionSql from "@hodor/core/db/sql/i18n_region.sql?raw";
import languageSql from "@hodor/core/db/sql/i18n_language.sql?raw";

describe("System Auth 模块全链路集成测试", () => {
  const testTables = [
    "system_user",
    "system_role",
    "system_permission",
    "system_role_permission",
    "system_department",
    "system_menu",
    "maintenance_audit_login",
    "i18n_region",
    "i18n_language",
  ];

  beforeAll(async () => {
    initInfraRegistry();
    await setupTestDb(db, [
      userSql,
      roleSql,
      permissionSql,
      rolePermissionSql,
      departmentSql,
      menuSql,
      auditLoginSql,
      regionSql,
      languageSql,
    ]);
  });

  afterEach(async () => {
    await clearTestData(db, testTables);
  });

  it("登录认证、更新密码、编辑个人资料及权限控制全链路测试", async () => {
    // 插入支持的语言
    await db.insert(languageTable).values([
      {
        id: 1,
        langCode: "zh-CN",
        nativeName: "中文（中国）",
        isEnabled: true,
        sortOrder: 1,
        creatorId: 1,
      },
      {
        id: 2,
        langCode: "en-US",
        nativeName: "English (US)",
        isEnabled: true,
        sortOrder: 2,
        creatorId: 1,
      },
    ]);

    const deptId = 1;
    // 使用 drizzle 插入部门数据
    await db.insert(departmentTable).values({
      id: deptId,
      name: "研发部",
      isEnabled: true,
      creatorId: 1,
    });

    const base64Password = Buffer.from("admin123").toString("base64");
    const creatorUserObj = {
      userId: 1,
      langCode: "zh-CN",
    } as unknown as UserObj;

    const userId = await userService.add.service(
      {
        username: "admin_test",
        password: base64Password,
        isEnabled: true,
        langCode: "zh-CN",
        remark: "Test admin",
        regionObj: null,
        departmentObj: { value: deptId, label: "研发部" },
        roleArr: [],
      },
      creatorUserObj
    );
    expect(userId).toBeGreaterThan(0);

    // 3. 测试登录校验
    // 3.1 密码错误的情况
    const wrongPassword = Buffer.from("wrongpwd").toString("base64");
    await expect(
      authService.login.service(
        { username: "admin_test", password: wrongPassword },
        { ip: "127.0.0.1", userAgent: "Vitest" }
      )
    ).rejects.toThrow();

    // 3.2 密码正确的情况
    const loginResult = await authService.login.service(
      { username: "admin_test", password: base64Password },
      { ip: "127.0.0.1", userAgent: "Vitest" }
    );
    expect(loginResult).not.toBeNull();
    expect(loginResult?.userObj.username).toBe("admin_test");
    expect(loginResult?.userObj.token).toBeDefined();

    const token = loginResult!.userObj.token;
    const userObj = {
      userId,
      id: userId,
      username: "admin_test",
      token,
      langCode: "zh-CN",
      roleIds: [],
      permissions: [],
      _isLoaded: false,
      ensureLoaded: async function () {
        this._isLoaded = true;
      },
    } as unknown as UserObj;

    // 4. 测试 checkToken
    const isTokenValid = await authService.check.service({}, userObj);
    expect(isTokenValid).toBe(true);

    // 5. 测试 refreshToken
    const refreshResult = await authService.refresh.service({}, userObj);
    expect(refreshResult).not.toBeNull();
    expect(refreshResult?.token).toBeDefined();

    // 6. 测试 profile & updateProfile & updateLangCode
    const profileResult = await authService.profile.service({}, userObj);
    expect(profileResult?.userObj.username).toBe("admin_test");

    // 使用 drizzle 插入 region 数据
    await db.insert(regionTable).values({
      id: 10,
      labels: { "zh-CN": "中国" },
      alpha2Code: "CN",
      alpha3Code: "CHN",
      numeric: 156,
      iso3166Independent: true,
      isEnabled: true,
      creatorId: 1,
    });

    const updateProfileResult = await authService.updateProfile.service(
      {
        regionObj: { value: 10, label: "中国" },
        remark: "Test user",
      },
      userObj
    );
    expect(updateProfileResult).toBe(userId);

    const updateLangResult = await authService.updateLangCode.service(
      { langCode: "en-US" },
      userObj
    );
    expect(updateLangResult).toBe(userId);

    // 7. 测试修改密码
    const newPasswordBase64 = Buffer.from("newpwd123").toString("base64");
    const updatePasswordResult = await authService.updatePassword.service(
      {
        oldPassword: base64Password,
        newPassword: newPasswordBase64,
      },
      userObj
    );
    expect(updatePasswordResult).toBe(userId);

    // 校验新密码能成功登录
    const newLoginResult = await authService.login.service(
      { username: "admin_test", password: newPasswordBase64 },
      { ip: "127.0.0.1", userAgent: "Vitest" }
    );
    expect(newLoginResult).not.toBeNull();

    // 8. 权限控制角色与测试
    // 8.0 插入超级管理员角色占用 ID 1 (以符合系统 SUPER_ADMIN_ROLE_ID)
    await db.insert(roleTable).values({
      id: 1,
      name: "超级管理员",
      remark: "Super Admin",
      isEnabled: true,
      permissionCount: 0,
      dataScope: "all",
      creatorId: 1,
    });

    // 8.1 创建角色 (此时ID应自增为2)
    const roleId = await roleService.add.service(
      {
        name: "Test Role",
        remark: "test",
        isEnabled: true,
        permissionCount: 0,
        dataScope: "self_only",
        customDeptIds: null,
      },
      creatorUserObj
    );
    expect(roleId).toBeGreaterThan(1);

    // 8.2 创建权限点
    const permissionId = await permissionService.add.service(
      {
        name: "测试读取权限",
        code: "maintenance.audit_log:read",
        category: "action",
        resource: "/api/audit_log",
        business: "maintenance.audit_log",
        remark: "test",
        isEnabled: true,
      },
      creatorUserObj
    );
    expect(permissionId).toBeGreaterThan(0);

    // 8.3 关联角色与权限
    await rolePermissionService.batchAdd.service(
      {
        roleId: roleId!,
        permissionIds: [permissionId!],
      },
      creatorUserObj
    );

    // 8.4 绑定用户与角色
    await userService.update.service(
      {
        id: userId,
        roleArr: [{ value: roleId!, label: "Test Role" }],
      },
      creatorUserObj
    );

    // 8.5 实例化中间件的用户对象进行 can 检查
    const finalUser = await userService.get.service({ id: userId });
    expect(finalUser.roleArr).toHaveLength(1);

    const rbacUser = {
      userId,
      id: userId,
      roleIds: [roleId!],
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

    const hasReadPermission = await can(
      rbacUser,
      "read",
      "maintenance.audit_log"
    );
    expect(hasReadPermission).toBe(true);

    const hasDeletePermission = await can(
      rbacUser,
      "delete",
      "maintenance.audit_log"
    );
    expect(hasDeletePermission).toBe(false);
  });
});
