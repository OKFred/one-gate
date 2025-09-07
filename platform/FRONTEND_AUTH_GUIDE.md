# 前端登录功能说明

## 功能概述

前端应用已集成完整的用户认证功能，包括：

- 用户登录（普通用户名密码登录）
- 微信登录（框架已准备，需后端配置）
- 自动token管理
- 登出功能
- 路由保护
- 用户状态显示

## 主要组件

### 1. 认证工具 (`/src/utils/auth.ts`)
提供用户认证相关的工具函数：
- `setToken()` / `getToken()` - Token管理
- `setUserInfo()` / `getUserInfo()` - 用户信息管理
- `logout()` - 登出
- `isAuthenticated()` - 检查登录状态
- `getAuthHeader()` - 获取认证头

### 2. 登录API (`/src/api/auth.ts`)
提供与后端API的交互：
- `commonLogin()` - 普通登录
- `wechatLogin()` - 微信登录
- `verifyToken()` - 验证Token
- `refreshToken()` - 刷新Token
- `logout()` - 登出

### 3. 登录页面 (`/src/pages/login/`)
- 用户名密码输入
- 登录表单验证
- 错误信息显示
- 加载状态显示
- 微信登录按钮（待实现）

### 4. 路由保护 (`/src/components/ProtectedRoute.tsx`)
- 自动检查用户登录状态
- 未登录用户重定向到登录页
- Token验证
- 加载状态显示

### 5. 顶部导航栏 (`/src/layout/components/Topbar.tsx`)
- 显示用户信息
- 用户头像
- 下拉菜单
- 登出功能

## 使用方法

### 1. 登录流程
1. 用户访问需要认证的页面
2. 如果未登录，自动跳转到 `/login`
3. 输入用户名和密码
4. 点击登录按钮
5. 验证成功后跳转到目标页面
6. Token和用户信息自动保存到localStorage

### 2. 登出流程
1. 点击顶部导航栏的用户头像
2. 在下拉菜单中选择"退出登录"
3. 清理localStorage中的认证信息
4. 跳转到登录页

### 3. 自动认证
- 应用启动时自动检查localStorage中的token
- 每次API请求自动附加Authorization头
- Token过期时自动登出并跳转到登录页

## 数据存储

认证信息存储在localStorage中：
- `userToken` - 用户认证token
- `userInfo` - 用户基本信息（不包含密码）

## API请求

### 自动认证头
所有API请求会自动添加认证头：
```
Authorization: Bearer <token>
```

### 错误处理
- 401错误自动触发登出
- 网络错误显示友好提示
- 表单验证错误实时显示

## 安全特性

1. **Token管理**：Token存储在localStorage，页面刷新后自动恢复登录状态
2. **自动过期**：Token过期时自动清理并重定向到登录页
3. **路由保护**：所有需要认证的路由都受到保护
4. **自动登出**：401错误时自动登出

## 开发注意事项

1. **API基础URL**：当前配置为 `http://localhost:3000`，生产环境需要修改
2. **微信登录**：需要后端配置微信开发者信息才能使用
3. **Token刷新**：目前实现了基础的token刷新功能
4. **错误处理**：建议根据业务需求扩展错误处理逻辑

## 文件结构

```
src/
├── api/
│   ├── auth.ts          # 认证API
│   └── config.ts        # API配置（已添加自动认证）
├── components/
│   └── ProtectedRoute.tsx # 路由保护组件
├── layout/
│   └── components/
│       └── Topbar.tsx   # 顶部导航栏（含用户信息）
├── pages/
│   └── login/           # 登录页面
├── utils/
│   └── auth.ts          # 认证工具
└── routes.tsx           # 路由配置（已添加保护）
```

## 后续扩展

1. **记住我功能**：可以扩展token过期时间
2. **多角色权限**：基于用户角色的页面访问控制
3. **SSO集成**：单点登录功能
4. **生物识别**：指纹、人脸识别等
5. **二次验证**：短信验证码、邮箱验证等
