# 统一 OAuth 与飞书企业登录实际落地

## 1. 落地结论

本轮已完成统一 OAuth 代码、数据库增量、前端交互、Mock E2E 和部署契约。GitHub 与飞书均采用预绑定登录，不再自动创建 Hodor 用户；未绑定登录在 HTTP 边界精确返回 403“账号未绑定，请联系管理员”。

真实飞书测试环境已经创建：在非泰集云身份下新建独立测试应用 `Hodor OAuth 测试`，关联独立测试企业并加入创建者和普通成员两名测试人员。测试版已配置 localhost 固定回调、通讯录只读权限、数据权限和成员可用范围，不改动原有已发布应用“张琦的助手”。

创建者和普通成员两条真实链路均已完成。普通成员先验证未绑定登录精确返回 403 且不自动注册，再创建独立 Hodor 账号 `oauth_tester`，完成绑定、档案读取、绑定后登录和重复绑定冲突验证。随后对普通成员执行可恢复的暂停/恢复：暂停后飞书在组织选择阶段将该身份标记为 `Unavailable`，恢复后 OAuth callback 返回 200 并登录为 `oauth_tester`。尚未执行离职、解绑或测试环境清理。

## 2. 实际后端改动

- 新建 `system/auth/oauth` 的 Domain、Application、Infrastructure、HTTP 四层。
- 新增 GitHub/飞书 Provider、六个固定 POST 接口和稳定 OAuth 门面。
- 删除旧 `/github/*` 实现、旧类型文件和自动注册逻辑。
- GitHub 登录/绑定每次检查 active organization membership；远端 grant 仅在 204 时视为撤销成功，失败保留本地绑定。
- GitHub 远端撤权失败在 HTTP 边界返回明确的 502，并说明本地绑定已保留；Provider 配置缺失返回不泄漏配置细节的 503。
- 飞书以 `open_id` 作为应用内身份，校验 tenant 白名单、Contact v3 可访问性与激活/冻结/离职/退出状态。
- 真实联调发现飞书当前授权端点要求 `client_id`，并需要显式请求档案同步所依赖的 8 项通讯录 scope；Provider 已修正参数名和 scope 集合，并增加精确回归测试。
- 使用 AES-256-GCM、随机 IV 和绑定 user/provider/providerId/字段的 AAD 加密档案与 GitHub token；飞书 user token 不持久化。
- OAuth 出站统一使用 metadata-only 审计；`safeFetch` 对标准审计也增加敏感字段脱敏，OAuth 日志不包含 query、headers、请求/响应正文或底层错误文本。
- 公共路由白名单迁移到统一 OAuth login URL/callback；账号绑定、档案、解绑接口仍要求 Hodor JWT。

## 3. 数据库与部署改动

- `system_user_oauth` 新增 tenant、加密档案、加密 access/refresh token、scope、token 过期时间和最后验证时间。
- 新增 `(provider, provider_id)` 与 `(user_id, provider)` 唯一索引。
- 增加 D1 `0001_system_user_oauth_security.sql`、core migration/DDL 与 Worker schema contract。
- GitHub Actions 在 Worker deploy 前执行 D1 migration 与 contract gate，并同步上传飞书/OAuth secrets。
- 本地已执行 D1 migration；未执行任何远程 DDL、远程部署或生产数据写入。

## 4. 前端与 Playwright 改动

- 登录页支持 GitHub、飞书统一入口。
- Provider 固定回调为 `/oauth/callback`，入口桥接至 HashRouter 并保留 code/state。
- 个人页支持双 Provider 绑定、解绑、GitHub 历史绑定重新授权和飞书档案按需查看。未绑定时主按钮显示“绑定 Provider”，已绑定时同一主按钮直接显示“解绑 Provider”并进入确认流程；飞书档案保留独立次级入口。
- 完整飞书档案仅存在 React 组件内存，未写 localStorage/sessionStorage。
- 真实验收发现无菜单角色登录成功后会被默认送回登录页；登录、OAuth callback 现在统一回退到 `/me`，路由守卫始终允许已认证用户访问 `/home` 和 `/me`。
- OpenAPI 类型已从 Windows 本地 Worker 的真实 `/doc.json` 重新生成，并确认六条 OAuth 路径存在。
- 增加 Mock OAuth Playwright；video/trace 关闭。飞书独立 Profile 位于 Git 忽略目录 `platform/playwright/.auth/feishu-provider-profile`，启动 helper 固定开放本地 9223 调试端口，供后续 Playwright 复用同一登录态。

## 5. 与计划的差异

### 5.1 OAuth state 的原子性限制

计划写的是 KV 一次性消费。实际实现使用 KV `get + delete` 并增加同 isolate in-flight 锁，可防同 isolate 并发重放；Cloudflare Workers KV 不提供跨 isolate/PoP 原子 compare-and-delete，因此不能保证全局严格原子。若安全模型要求分布式严格一次性，后续必须改用 Durable Object 或具备条件更新的 D1 state ledger。

### 5.2 真实双成员验收分阶段执行

测试应用、测试企业、双成员、回调、权限和两名成员的正向链路均已完成。普通成员的短信 OTP 由 Pixel 5 本地 ADB 读取并直接注入已授权的浏览器流程，手机号与验证码均未打印或写入仓库。暂停/恢复矩阵已经完成；暂停状态由飞书平台在 OAuth callback 前拦截，因此应用层的冻结/离职判定仍以 Fake Provider 自动化测试为证据。离职、解绑和环境清理未执行，不标记为通过。

### 5.3 CI 增加 Mock OAuth E2E

计划要求 CI 运行 Mock Provider UI。实际额外增加了 admin build、Playwright Chromium 安装和 Mock OAuth E2E gate；本地 Windows 已实跑 3/3 通过，其中新增无菜单用户登录回退 `/me` 的回归用例。

### 5.4 Worker 公共路由集成修正

第一轮复盘发现 `permission: false` 不等于跳过 JWT，中间件仍要求公共登录端点进入显式白名单。实际额外迁移了统一 OAuth login URL/callback 白名单并增加静态回归测试；账号绑定、档案和解绑端点未加入白名单，继续要求 Hodor JWT。

## 6. 验证结果

- 修改前 Windows server/admin TypeScript：均 0 错误。
- 修改后 Windows server/admin/E2E TypeScript：均 0 错误。
- OAuth、日志、迁移与部署契约定向 Vitest：10 文件、35 tests 全部通过。
- `safeFetch` 敏感日志测试包含 OAuth metadata-only 和嵌套 token/手机号脱敏。
- Server build：通过。
- Admin build：通过；仅保留现有大 chunk 性能警告。
- Mock OAuth Playwright：3/3 通过。
- Windows 本地 Worker 代码级冒烟：GitHub、飞书 `/oauth/login/url` 均返回 200，授权域名、固定回调和随机 state 符合预期；该步骤使用临时假凭证，未请求 Provider、远程 D1 或生产环境。随后另以隔离的真实飞书测试版凭证完成创建者验收。
- Windows 真实飞书创建者验收：未绑定登录返回精确 403，且 `system_user` 数量不变；绑定回调 200；档案接口包含账号状态；退出后飞书登录成功。
- Windows 真实飞书普通成员验收：未绑定登录返回精确 403 且用户数不变；独立 Hodor 账号绑定回调 200；档案接口返回 21 个字段，UI 展示完整非空档案且 localStorage 只有主题与最小用户信息；退出后登录成功。
- 重复绑定验收：同一飞书身份绑定另一临时 Hodor 用户返回 409，临时用户没有产生绑定，测试结束后已删除临时用户；当前仅保留 `superadmin` 与 `oauth_tester` 两个本地用户。
- 状态验收：普通成员暂停后，飞书组织选择页显示 `Unavailable` 并阻止进入授权；恢复后成员重新显示 `Active`，OAuth callback 返回 200 并登录为 `oauth_tester`。暂停期间没有删除成员或本地绑定。
- 无菜单角色验收：真实 `oauth_tester` 登录后可进入 `/me` 查看绑定与档案，不再落到 `/login`/404；对应 Mock Playwright 回归通过。
- 安全验收：飞书 user token 未写入 D1，浏览器 localStorage/sessionStorage 和档案响应均未出现 Provider access/refresh token；D1 中档案为 `v1.` AES-GCM 密文，tenant 和最后验证时间已记录。
- 真实联调回归：飞书授权 URL 使用 `client_id` 且包含 8 项预期通讯录 scope；Provider 定向 Vitest 4/4、Windows server TypeScript、ESLint 和 Prettier 均通过。
- Windows 本地 D1：官方 migration ledger 返回无待执行迁移，schema contract 的 12 条检查命令全部成功。
- OpenAPI：由真实 Windows Worker `/doc.json` 生成，六个 OAuth POST 路径存在。
- ESLint：变更文件 0 error；移除 auth service 本轮触达的 unused warning，`user/model.ts` 保留仓库既有 `UserPO` unused warning。
- Prettier：支持的变更文件已格式化；SQL/env 文件由差异、LF/BOM 检查覆盖。
- 未新增 `any` / `as any`；未把 token、secret、手机号、cookie 或浏览器 Profile 提交到 Git。
- 共完成 4 轮复盘：第一轮修正 Worker 公共路由白名单；第二轮补齐撤权失败/配置缺失错误映射；第三轮根据真实无菜单账号修正登录落点与路由守卫；第四轮修正新 Playwright 用例的导航竞态并复跑 3/3。复盘期间发现的旧 Wrangler/workerd 孤儿进程已按监听 PID 精确清理。

## 7. 后续建议

1. 若继续反向矩阵，经用户逐项确认后再执行移出应用范围、离职和真实飞书解绑；离职会导致重新邀请/OTP，不与可恢复暂停混为一项。
2. 测试结束后由用户决定保留 `oauth_tester` 与隔离测试企业，或执行解绑、删除测试账号和清理测试环境。
3. 将生产飞书 App ID/Secret、tenant 白名单与 32 字节 Base64 加密密钥写入 GitHub Actions Secrets，不复用本地测试版凭证。
4. 在部署前对生产现有 OAuth 数据检查两个唯一约束是否存在冲突；若有重复绑定，先人工清理再应用 migration。
5. 若需严格防跨 PoP state 重放，将 state store 升级为 Durable Object/D1 ledger，不继续扩大 KV `get + delete` 的安全承诺。
