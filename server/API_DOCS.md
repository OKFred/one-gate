# 用户和登录API文档

## 概述

该项目包含了完整的用户管理和登录认证系统，包括：

- 用户管理（增删改查）
- 普通登录（用户名密码）
- 微信登录
- Token验证和刷新
- 认证中间件

## API接口

### 用户管理 (`/api/user`)

#### 1. 添加用户
- **路径**: `POST /api/user/add`
- **说明**: 创建新用户，密码会自动加盐处理
- **请求体**:
```json
{
  "username": "admin",
  "password": "password123",
  "department": "技术部",
  "role": "管理员",
  "isEnabled": true
}
```

#### 2. 获取用户列表
- **路径**: `POST /api/user/list`
- **说明**: 分页查询用户列表，支持关键词搜索
- **请求体**:
```json
{
  "orderBy": "id",
  "descend": true,
  "pageNo": 1,
  "pageSize": 10,
  "keyword": "admin"
}
```

#### 3. 获取用户详情
- **路径**: `POST /api/user/get`
- **请求体**:
```json
{
  "id": 1
}
```
或
```json
{
  "username": "admin"
}
```

#### 4. 更新用户
- **路径**: `POST /api/user/update`
- **请求体**:
```json
{
  "id": 1,
  "department": "新部门",
  "role": "新角色",
  "password": "newpassword123"
}
```

#### 5. 删除用户
- **路径**: `POST /api/user/delete`
- **请求体**:
```json
{
  "id": 1
}
```

### 登录认证 (`/api/login`)

#### 1. 普通登录
- **路径**: `POST /api/login/common`
- **说明**: 使用用户名和密码登录
- **请求体**:
```json
{
  "username": "admin",
  "password": "password123"
}
```
- **响应**:
```json
{
  "ok": true,
  "data": {
    "token": "example-session-token",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "管理员",
      "department": "技术部",
      "isEnabled": true
    }
  }
}
```

#### 2. 微信登录
- **路径**: `POST /api/login/wechat`
- **说明**: 使用微信授权码登录（需要配置微信开发者信息）
- **请求体**:
```json
{
  "code": "061abc123",
  "state": "STATE"
}
```

#### 3. 验证Token
- **路径**: `POST /api/login/verify`
- **请求体**:
```json
{
  "token": "example-session-token"
}
```

#### 4. 刷新Token
- **路径**: `POST /api/login/refresh`
- **请求体**:
```json
{
  "token": "example-session-token"
}
```

## 认证中间件使用

在需要认证的API中使用认证中间件：

```typescript
import { authMiddleware, roleMiddleware } from "@/middleware/auth";

// 基础认证
app.use("/protected/*", authMiddleware);

// 基础认证 + 角色权限
app.use("/admin/*", authMiddleware);
app.use("/admin/*", roleMiddleware(["管理员"]));
```

## 请求头格式

对于需要认证的API，请在请求头中包含：

```
Authorization: Bearer <your-token-here>
```

## 安全特性

1. **密码加盐**: 用户密码使用bcrypt进行加盐处理，不会明文存储
2. **Token过期**: Token有24小时的有效期
3. **角色权限**: 支持基于角色的权限控制
4. **输入验证**: 所有接口都有完整的参数验证

## 环境变量

在生产环境中，请设置以下环境变量：

```bash
JWT_SECRET=your-very-secure-secret-key-here
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
```

## 数据库

用户表会在服务启动时自动创建，表结构如下：

- `id`: 主键，自增
- `username`: 用户名，唯一
- `password`: 密码（加密）
- `department`: 部门
- `role`: 角色
- `is_enabled`: 是否启用
- `create_time_utc`: 创建时间
- `update_time_utc`: 更新时间

## 微信登录配置

微信登录功能目前是框架代码，需要以下配置：

1. 在微信开放平台申请应用
2. 获取AppID和AppSecret
3. 配置环境变量
4. 完善`/api/login/service.ts`中的微信登录逻辑

## 测试

启动服务后，可以访问 `/doc` 查看完整的API文档和在线测试。
