# Hodor 设备详情 ABAC 影子决策计划变更

## 实施边界

- 基线：`codex/hodor-abac-pilot`。
- 分支：`codex/hodor-device-abac-shadow`。
- 目标：feature branch 审查通过后合入 `dev`；不触碰 `master`。
- 不使用 worktree，不修改 one-person-company 代码，不新增数据库 migration。

## 变更步骤

1. 为 Authorization application 增加 Shadow observation 和脱敏日志端口。
2. 在默认 runtime container 装配结构化 Shadow logger，并由稳定 facade 暴露调用入口。
3. 在 mobile device HTTP interface 新增设备详情决策构造与跨运行时后台调度 helper。
4. 将 `getApi` 切换为带 user/context 的 adapter；原查询成功后调度 Shadow，原样返回数据。
5. 增加 application、HTTP helper 和 route contract 定向测试。
6. 运行受影响范围的 TypeScript、Vitest、ESLint、Prettier、Worker dry-run 和 `git diff --check`。
7. 分别提交文档、Authorization application、设备接入、测试和实际落地记录，再推送并创建 stacked
   PR。

## dev Rollout

1. 先完成并合入外部身份迁移 PR，再将 ABAC pilot PR 的 base 更新为 `dev`。
2. ABAC pilot 配置写入 Hodor D1 并测试为 `ready` 后，再合入本 Shadow PR。
3. 在 one-authz 创建并激活 `MobileDevice` Schema/Policy revision。
4. 使用已有 RBAC 允许账号访问设备详情，核对 `match`。
5. 激活可控 deny 策略，确认日志为 `mismatch` 且接口仍成功，再回滚策略。
6. 暂时停用 Authorization connection，确认日志为 `unavailable` 且接口仍成功，再恢复配置。
7. 检查日志不包含用户、设备、角色、Token、Cookie、Secret 或策略正文。

## 停止条件

- 外部身份迁移、Hodor SSO 数据库配置或 ABAC 连接尚未 ready。
- feature CI 失败或 PR 不可干净合并。
- dev D1 migration 前置、恢复点或 Secret 预检失败。
- Shadow 改变 HTTP 状态、响应、RBAC 行为或出现未处理 Promise rejection。
