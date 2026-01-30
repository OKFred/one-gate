# 权限中间件使用指南

## 概述

本系统提供了完整的权限管理中间件，支持基于角色的访问控制（RBAC）和细粒度的权限校验。

## 权限中间件列表

### 1. `authMiddleware` - 认证中间件

自动加载用户信息和权限列表，必须作为第一个中间件使用。

```typescript
import { authMiddleware } from "@/middleware/auth";

// 在需要认证的路由上使用
app.use("/api/protected/*", authMiddleware);
```

**功能：**
- 验证 JWT Token
- 加载用户基本信息
- 加载用户的所有权限（从角色）
- 处理 allow/deny 权限效果
- 判断是否为超级管理员

**UserObj 结构：**
```typescript
{
  token: string;
  userId: number;
  id: number;
  isSuperAdmin: boolean;
  permissions: PermissionInfo[];
  username: string;
  langCode: string;
  isEnabled: boolean;
  roleArr: { value: number; label: string }[];
  departmentObj: { value: number; label: string } | null;
  regionObj: { value: number; label: string } | null;
  // ... 其他用户信息
}
```

### 2. `checkPermission` - 权限检查中间件

检查用户是否拥有指定的权限代码。

```typescript
import { authMiddleware, checkPermission } from "@/middleware/auth";

// 检查单个权限
app.post(
  "/api/users/add",
  authMiddleware,
  checkPermission("user:write"),
  async (c) => {
    // 业务逻辑
  }
);

// 检查多个权限（满足任一即可）
app.post(
  "/api/users/edit",
  authMiddleware,
  checkPermission(["user:write", "user:admin"]),
  async (c) => {
    // 业务逻辑
  }
);

// 检查多个权限（必须全部满足）
app.post(
  "/api/users/delete",
  authMiddleware,
  checkPermission(["user:delete", "user:admin"], true),
  async (c) => {
    // 业务逻辑
  }
);
```

**参数：**
- `requiredPermissions`: string | string[] - 需要的权限代码
- `matchAll`: boolean - 是否需要匹配所有权限（默认 false）

### 4. `checkRole` - 角色检查中间件

检查用户是否拥有指定的角色。

```typescript
import { authMiddleware, checkRole } from "@/middleware/auth";

// 只允许管理员角色
app.use("/api/admin/*", authMiddleware, checkRole([1]));

// 允许多个角色
app.use("/api/manager/*", authMiddleware, checkRole([1, 2, 3]));
```

## 权限工具函数

### 1. `hasResourcePermission` - 检查资源权限

在业务逻辑中检查用户对特定资源的访问权限。

```typescript
import { hasResourcePermission } from "@/middleware/auth";

async function updateDocument(c: NodeHonoContext) {
  const userObj = c.var.userObj;
  const document = await getDocument(id);
  
  // 检查用户是否有权限编辑这个文档
  if (!hasResourcePermission(userObj, "document:write", document.creatorId)) {
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  }
  
  // 执行更新操作
}
```

**参数：**
- `userObj`: 用户对象
- `permissionCode`: 权限代码
- `resourceOwnerId`: 资源所有者ID（可选，用于 scope="own" 的权限）

**返回值：** boolean

**Scope 处理：**
- `all`: 直接返回 true
- `own`: 检查 resourceOwnerId 是否等于当前用户 ID
- `dept`: 返回 true（需要扩展部门逻辑）
- `custom`: 返回 true（需要扩展自定义条件逻辑）

### 2. `filterMenusByPermissions` - 过滤菜单

根据用户权限过滤菜单列表。

```typescript
import { filterMenusByPermissions } from "@/middleware/auth";

async function getMenus(c: NodeHonoContext) {
  const userObj = c.var.userObj;
  const allMenus = await getAllMenus();
  
  // 过滤用户有权限的菜单
  const allowedMenus = filterMenusByPermissions(allMenus, userObj.permissions);
  
  return c.json(allowedMenus);
}
```

### 3. `hasButtonPermission` - 检查按钮权限

检查用户是否有特定按钮权限。

```typescript
import { hasButtonPermission } from "@/middleware/auth";

async function getPageData(c: NodeHonoContext) {
  const userObj = c.var.userObj;
  
  // 检查按钮权限
  const canAdd = hasButtonPermission(userObj.permissions, "button:user:add");
  const canDelete = hasButtonPermission(userObj.permissions, "button:user:delete");
  
  return c.json({
    data: pageData,
    permissions: {
      canAdd,
      canDelete,
    }
  });
}
```

## permissionUtils 工具模块

从 `@/utils/permission` 导入更多工具函数：

```typescript
import permissionUtils from "@/utils/permission";

// 根据角色ID获取权限
const permissions = await permissionUtils.getPermissionsByRoleIds([1, 2, 3]);

// 根据权限代码获取权限
const perms = await permissionUtils.getPermissionsByCodes(["user:read", "user:write"]);

// 过滤生效的权限（处理 allow/deny）
const effective = permissionUtils.filterEffectivePermissions(allPermissions);

// 按类型过滤权限
const menuPerms = permissionUtils.filterPermissionsByType(permissions, "menu");

// 检查是否包含权限
const hasRead = permissionUtils.hasPermissionCode(permissions, "user:read");
const hasAny = permissionUtils.hasAnyPermission(permissions, ["user:read", "user:write"]);
const hasAll = permissionUtils.hasAllPermissions(permissions, ["user:read", "user:write"]);

// 获取特定类型的权限
const menuPerms = permissionUtils.getMenuPermissions(permissions);
const buttonCodes = permissionUtils.getButtonPermissionCodes(permissions);
```

## 完整使用示例

### 示例 1: 用户管理 API

```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import { authMiddleware, checkPermission } from "@/middleware/auth";
import type { AppBindings } from "@/types/app";

const app = new OpenAPIHono<AppBindings>();

// 所有用户管理 API 都需要认证
app.use("/api/users/*", authMiddleware);

// 查看用户列表 - 需要 user:read 权限
app.post("/api/users/list", checkPermission("user:read"), async (c) => {
  // 业务逻辑
});

// 添加用户 - 需要 user:write 权限
app.post("/api/users/add", checkPermission("user:write"), async (c) => {
  // 业务逻辑
});

// 更新用户 - 需要 user:write 或 user:admin 权限
app.post("/api/users/update", checkPermission(["user:write", "user:admin"]), async (c) => {
  // 业务逻辑
});

// 删除用户 - 需要 user:delete 和 user:admin 权限
app.post("/api/users/delete", checkPermission(["user:delete", "user:admin"], true), async (c) => {
  // 业务逻辑
});

export default app;
```

### 示例 2: 带资源级权限的文档管理

```typescript
import { authMiddleware, checkPermission, hasResourcePermission } from "@/middleware/auth";
import { BusinessError, BusinessErrorCode } from "@/middleware/errorHandler/businessError";

app.use("/api/documents/*", authMiddleware);

// 查看文档列表
app.post("/api/documents/list", checkPermission("document:read"), async (c) => {
  const userObj = c.var.userObj;
  const documents = await getDocuments();
  
  // 根据用户权限过滤文档
  const filtered = documents.filter(doc => 
    hasResourcePermission(userObj, "document:read", doc.creatorId)
  );
  
  return c.json(filtered);
});

// 编辑文档
app.post("/api/documents/update", checkPermission("document:write"), async (c) => {
  const userObj = c.var.userObj;
  const { id, ...data } = await c.req.json();
  
  const document = await getDocument(id);
  
  // 检查是否有权限编辑这个文档
  if (!hasResourcePermission(userObj, "document:write", document.creatorId)) {
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  }
  
  // 执行更新
  await updateDocument(id, data);
  return c.json({ success: true });
});
```

### 示例 3: 菜单和按钮权限

```typescript
import { authMiddleware, filterMenusByPermissions, hasButtonPermission } from "@/middleware/auth";

// 获取用户菜单
app.get("/api/menu/user-menus", authMiddleware, async (c) => {
  const userObj = c.var.userObj;
  const allMenus = await getAllMenus();
  
  // 根据权限过滤菜单
  const userMenus = filterMenusByPermissions(allMenus, userObj.permissions);
  
  return c.json(userMenus);
});

// 获取页面数据（包含按钮权限）
app.get("/api/pages/user-management", authMiddleware, async (c) => {
  const userObj = c.var.userObj;
  
  // 获取数据
  const users = await getUsers();
  
  // 检查按钮权限
  const permissions = {
    canAdd: hasButtonPermission(userObj.permissions, "button:user:add"),
    canEdit: hasButtonPermission(userObj.permissions, "button:user:edit"),
    canDelete: hasButtonPermission(userObj.permissions, "button:user:delete"),
    canExport: hasButtonPermission(userObj.permissions, "button:user:export"),
  };
  
  return c.json({
    data: users,
    permissions,
  });
});
```

### 示例 4: 自动 API 权限检查

```typescript
import { authMiddleware } from "@/middleware/auth";

const app = new OpenAPIHono<AppBindings>();

// 这些路由会自动根据路径匹配权限
app.post("/api/users/list", async (c) => {
  // 需要有 type="api", resource="/api/users/list" 的权限
});

app.get("/api/users/:id", async (c) => {
  // 需要有 type="api", resource="/api/users/:id" 的权限
});
```

## 超级管理员

超级管理员（userId === 1）会自动跳过所有权限检查：

```typescript
// authMiddleware 中会设置
userObj.isSuperAdmin = (userId === 1);

// 所有权限中间件都会检查
if (userObj.isSuperAdmin) {
  await next();
  return;
}
```

## 权限命名规范

遵循 IAM 风格的命名：`<资源>:<操作>[:<范围>]`

```typescript
// 基础权限
"user:read"           // 读取用户
"user:write"          // 写入用户
"user:delete"         // 删除用户

// 带范围的权限
"document:read:all"   // 读取所有文档
"document:read:own"   // 读取自己的文档
"document:write:own"  // 编辑自己的文档
"report:read:dept"    // 读取本部门报表

// 菜单权限
"menu:dashboard"      // 仪表盘菜单
"menu:users"          // 用户管理菜单
"menu:settings"       // 设置菜单

// 按钮权限
"button:user:add"     // 添加用户按钮
"button:user:export"  // 导出用户按钮
"button:order:cancel" // 取消订单按钮

// 通配符（建议只用于管理员）
"system:*"            // 系统所有权限
"user:*"              // 用户模块所有权限
```

## 注意事项

1. **必须先使用 authMiddleware**：所有权限中间件依赖 `c.var.userObj`
2. **超级管理员豁免**：userId === 1 的用户会跳过所有权限检查
3. **权限缓存**：权限在登录时加载，修改权限后需要重新登录
4. **资源级权限**：使用 `scope` 和 `resourceFilter` 实现细粒度控制
5. **性能考虑**：权限查询已优化索引，但大量权限时仍需注意性能

## 调试技巧

```typescript
// 在开发环境打印用户权限
if (process.env.NODE_ENV === "development") {
  console.log("User permissions:", userObj.permissions.map(p => p.code));
}

// 检查特定权限是否加载
const hasUserRead = userObj.permissions.some(p => p.code === "user:read");
console.log("Has user:read permission:", hasUserRead);

// 查看权限详情
const userReadPerm = userObj.permissions.find(p => p.code === "user:read");
console.log("user:read permission details:", userReadPerm);
```

## 常见问题

**Q: 为什么我的权限不生效？**
A: 检查以下几点：
1. 是否在 system_permission 表中创建了权限
2. 是否在 system_role_permission 表中关联了权限到角色
3. 用户是否分配了该角色
4. 权限的 is_enabled 是否为 true
5. 是否重新登录以刷新权限缓存

**Q: 如何添加新权限？**
A: 
1. 在 system_permission 表中插入权限记录
2. 在 system_role_permission 表中关联权限到角色
3. 用户重新登录

**Q: 如何实现资源级权限？**
A: 使用 `hasResourcePermission` 函数，并在权限中设置合适的 `scope`
