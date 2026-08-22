# AutoJS6 部署事件可靠回传优化实际落地

## 实际结果

- Node Server 增加 POST `/admin/mobile/device/report/deployment`，复用设备 `X-Device-Token`、统一响应信封和部署领域状态机。
- Cloudflare Worker 的机器路由白名单已包含部署事件入口；请求跳过用户登录鉴权后仍必须通过设备令牌、部署身份和状态转换校验。
- 部署阶段支持身份严格的单调前进，可从 `PENDING` 恢复到更高阶段或终态，终态、倒退和身份错配仍被拒绝。
- LibSQL 的 `rowsAffected` 与 Cloudflare D1 的 `meta.changes` 均可准确识别，HTTP 响应不再把真实写入误报为重复事件。
- 手机在 supervisor 注入 `AUTOJS6_REPORT_URL` 时自动启用 HTTPS 管理回传，空业务环境模板不能关闭该设备级通道。
- Linux 发布构建使用 `--hard-dereference`，最终归档不含软链或硬链；新客户端仍可安全校验归档内部相对软链并拒绝越界链接。

## 与计划的差异

### 增加的工作

- EMQX 在线调试证明命令发布、设备订阅和制品下载均正常，原先记录的 Broker ACL 判断不成立，没有修改 ACL。
- `v2.1.4` 的真实失败原因是 pnpm 相对依赖链接被旧客户端拒绝，已将该部署精确终结为 `FAILED/ARCHIVE_LINK_UNSAFE`。
- `v2.1.5` Linux CI 暴露 GNU tar 硬链编码，Tag 保留但发布失败且未进入控制面；未移动或覆盖 Tag。
- `v2.1.6` 完成无链接制品和真机激活；因设备级 HTTP URL 未自动启用，使用 ready 标记和当前指针核验后，经真实设备令牌恢复上报为 `SUCCEEDED`。
- 最终 `v2.1.7` 修正设备级 HTTP 通道，真机自动上报 `VERIFYING/SUCCEEDED` 并在 Gate 收敛为 `DEPLOYMENT_READY`。

### 未采用的工作

- 未在普通 Cloudflare Worker 中维护常驻 MQTT WebSocket，也未绑定新的 Durable Object 作为部署事件消费者。
- 未修改 Broker ACL；MQTT 保留为 Node 运行时和并行管理通道，Worker 依赖经过设备令牌鉴权的 HTTPS 回传。
- 未执行 TikTok 发布、音量设置、静音、任意 Shell 或终端操作。

## 验证证据

- Node Server：62 个测试文件通过，338 个测试通过、3 个跳过；Server 构建、Prettier、ESLint、Wrangler dry-run、`git diff --check` 和 LF/BOM 检查通过。
- one-autojs6：类型检查及 8 组测试通过；Windows 发布构建通过；WSL Linux 连续两次构建得到相同 SHA-256，且归档零链接。
- GitHub Actions：Node Server #163、#164 成功；移动发布 #9 (`v2.1.6`) 和 #10 (`v2.1.7`) 成功；#8 (`v2.1.5`) 保留为可审计失败记录。
- Pixel 5：`current` 指向 `releases/v2.1.7`；设备上报为 `ONLINE / Client 2.1.7 / Protocol 2 / WIFI`；本地仅保留 `v2.1.7、v2.1.6、v2.1.3`。
- WSS 运维：能力、前台应用、网络、存储、目录和媒体音量读取全部成功并写入审计；会话已主动关闭，`arbitraryShell=false`。
- 发布治理：`v2.1.0` 与 `v2.1.1` 已撤销新部署资格，仍保留不可变制品和历史引用。

## 复盘与建议

- 本次共进行了 5 轮代码审查或生产验证纠正：结果类型、文档边界、Linux 硬链、HTTP 白名单与设备级通道、D1 变更计数。
- 后续应把 Linux 发布构建加入每次移动端 PR 的 preflight，而不只在 Tag 后验证，以减少失败 Tag。
- 可增加 Worker 路由级集成测试，直接覆盖合法设备令牌、错误令牌、重复事件和 D1 写入结果。
- 失败的 `v2.1.5` Tag 不应复用；如需对外展示，可在控制面增加“构建失败但未发布”的独立审计状态。
