# 权限管理系统设计文档

## 概述

本系统采用基于 RBAC（基于角色的访问控制）和 IAM 风格的权限管理设计，支持前端菜单/按钮权限和后端 API 权限的统一管理。

## 数据表设计

### 1. system_permission（权限表）

定义系统中所有可用的权限。

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | INTEGER | 主键 | 1 |
| code | TEXT | 权限代码（唯一） | `user:read`, `file:write:own` |
| name | TEXT | 权限名称 | "查看用户", "编辑文件" |
| type | TEXT | 权限类型 | `menu`/`button`/`api` |
| resource | TEXT | 资源路径 | `/api/users/:id`, `/dashboard/users` |
| method | TEXT | HTTP方法（API类型） | `GET`, `POST`, `PUT`, `DELETE` |
| effect | TEXT | 效果 | `allow`（允许）, `deny`（拒绝） |
| scope | TEXT | 资源范围 | `all`/`own`/`dept`/`custom` |
| parent_id | INTEGER | 父权限ID | 用于菜单层级 |
| remark | TEXT | 备注说明 | - |
| is_enabled | INTEGER | 是否启用 | 1/0 |
| 审计字段 | - | creator_id, create_time_utc, updater_id, update_time_utc | - |

### 2. system_role（角色表）

定义系统中的角色。**已移除 permissions 字段**，改为通过关联表管理。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 角色名称（唯一） |
| remark | TEXT | 备注说明 |
| is_enabled | INTEGER | 是否启用 |
| 审计字段 | - | creator_id, create_time_utc, updater_id, update_time_utc |

### 3. system_role_permission（角色权限关联表）

管理角色与权限的关联关系。

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | INTEGER | 主键 | 1 |
| role_id | INTEGER | 角色ID | 1 |
| permission_id | INTEGER | 权限ID | 5 |
| resource_filter | TEXT | 资源过滤器（JSON） | `{"userId":"${currentUser.id}"}` |
| conditions | TEXT | 条件判断（JSON） | `{"ipRange":["192.168.1.0/24"]}` |
| 审计字段 | - | creator_id, create_time_utc, updater_id, update_time_utc |

**约束：** `(role_id, permission_id)` 组合唯一

**索引：**
- `idx_role_permission_role_id` 在 role_id 上
- `idx_role_permission_permission_id` 在 permission_id 上

## 权限代码命名规范（借鉴 AWS IAM）

采用分层命名结构：`<资源>:<操作>[:<范围>]`

### 示例

```
# 用户管理
user:read           # 查看用户
user:write          # 编辑用户
user:delete         # 删除用户

# 文件管理
file:read:all       # 读取所有文件
file:read:own       # 读取自己的文件
file:write:own      # 编辑自己的文件
file:delete:dept    # 删除本部门文件

# 系统管理
system:admin        # 系统管理员
system:config:read  # 读取系统配置
system:config:write # 修改系统配置

# 菜单权限
menu:dashboard      # 仪表盘菜单
menu:users          # 用户管理菜单
menu:reports        # 报表菜单

# 按钮权限
button:user:add     # 新增用户按钮
button:user:export  # 导出用户按钮
```

## API 接口

### Permission（权限管理）

- `POST /api/system/permission/listAll` - 获取所有权限（不分页）
- `POST /api/system/permission/list` - 获取权限列表（分页）
- `POST /api/system/permission/add` - 添加权限
- `POST /api/system/permission/update` - 更新权限
- `POST /api/system/permission/delete` - 删除权限
- `POST /api/system/permission/get` - 获取权限详情

### RolePermission（角色权限关联）

- `POST /api/system/role_permission/list` - 获取角色权限关联列表
- `POST /api/system/role_permission/add` - 添加单个角色权限关联
- `POST /api/system/role_permission/batchAdd` - 批量添加权限到角色
- `POST /api/system/role_permission/update` - 更新角色权限关联
- `POST /api/system/role_permission/delete` - 删除单个角色权限关联
- `POST /api/system/role_permission/batchDelete` - 批量删除角色的权限
- `POST /api/system/role_permission/get` - 获取角色权限关联详情
- `POST /api/system/role_permission/getPermissionsByRole` - 获取角色的所有权限

### Role（角色管理）

**变更：** 已移除 `permissions` 字段，权限管理通过 `system_role_permission` 表实现。

## 权限范围（Scope）

| 范围 | 说明 | 使用场景 |
|------|------|----------|
| `all` | 所有资源 | 管理员可以访问所有用户的数据 |
| `own` | 仅自己的资源 | 用户只能编辑自己创建的文档 |
| `dept` | 本部门的资源 | 部门经理可以查看本部门的报表 |
| `custom` | 自定义条件 | 通过 `resource_filter` 实现复杂的资源级权限 |

## 高级功能（预留扩展）

### 1. 资源过滤器（resource_filter）

实现资源级权限控制，支持变量替换。

```json
{
  "userId": "${currentUser.id}",
  "deptId": "${currentUser.deptId}",
  "status": ["active", "pending"]
}
```

### 2. 条件判断（conditions）

实现动态权限控制。

```json
{
  "ipRange": ["192.168.1.0/24", "10.0.0.0/8"],
  "timeRange": {
    "start": "09:00",
    "end": "18:00"
  },
  "weekdays": [1, 2, 3, 4, 5]
}
```

## 使用示例

### 1. 创建权限

```typescript
// 创建一个 API 权限
await fetch('/api/system/permission/add', {
  method: 'POST',
  body: JSON.stringify({
    code: 'user:read',
    name: '查看用户',
    type: 'api',
    resource: '/api/users/:id',
    method: 'GET',
    effect: 'allow',
    scope: 'all',
    isEnabled: true
  })
});

// 创建一个菜单权限
await fetch('/api/system/permission/add', {
  method: 'POST',
  body: JSON.stringify({
    code: 'menu:users',
    name: '用户管理菜单',
    type: 'menu',
    resource: '/dashboard/users',
    effect: 'allow',
    scope: 'all',
    parentId: null,
    isEnabled: true
  })
});
```

### 2. 为角色分配权限

```typescript
// 批量添加权限到角色
await fetch('/api/system/role_permission/batchAdd', {
  method: 'POST',
  body: JSON.stringify({
    roleId: 1,
    permissionIds: [1, 2, 3, 5, 8]
  })
});

// 添加带资源过滤的权限（用户只能访问自己的数据）
await fetch('/api/system/role_permission/add', {
  method: 'POST',
  body: JSON.stringify({
    roleId: 2,
    permissionId: 10,
    resourceFilter: JSON.stringify({
      userId: '${currentUser.id}'
    }),
    conditions: null
  })
});
```

### 3. 查询角色的所有权限

```typescript
const response = await fetch('/api/system/role_permission/getPermissionsByRole', {
  method: 'POST',
  body: JSON.stringify({ roleId: 1 })
});

const permissions = await response.json();
// 返回该角色的所有权限，包括 code, name, type, resource 等信息
```
## 优势对比

### 旧方案（JSON 字段）
❌ 难以查询"哪些角色有某个权限"  
❌ 权限重命名需要更新所有角色  
❌ 无法给权限添加更多属性  
❌ 前后端权限混在一起  

### 新方案（独立表）
✅ 结构化管理，易于查询和维护  
✅ 支持权限分类（菜单/按钮/API）  
✅ 可以添加权限描述、分组、依赖关系  
✅ 支持资源级权限和动态条件  
✅ 预留扩展能力，向 IAM 风格演进  

## 后续扩展

1. **权限继承** - 通过 parent_id 实现菜单权限的层级继承
2. **权限组** - 将常用权限组合成权限组，简化配置
3. **权限审批** - 添加权限申请和审批流程
4. **权限审计** - 记录权限变更历史和使用情况
5. **动态权限评估** - 实现基于条件的实时权限判断

## 数据库初始化

系统启动时会自动创建表结构。手动初始化：

```sql
-- 权限表
CREATE TABLE IF NOT EXISTS system_permission (...);

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS system_role_permission (...);
CREATE INDEX idx_role_permission_role_id ON system_role_permission(role_id);
CREATE INDEX idx_role_permission_permission_id ON system_role_permission(permission_id);