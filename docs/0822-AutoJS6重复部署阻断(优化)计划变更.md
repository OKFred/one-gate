# AutoJS6 重复部署阻断优化计划变更

## Node Server

- 从设备 `reportedExtraJson` 解析当前版本、制品摘要、环境和环境修订。
- 增加组合完全相等的纯函数判定及单元测试。
- `/client-deployment/apply` 在创建部署记录前拒绝当前组合。
- `/client-deployment/rollback` 在创建回滚记录前拒绝当前组合。
- 不修改数据库表、MQTT Topic、部署命令结构和公共请求字段。

## Platform

- 部署面板同时轮询设备详情，读取权威的当前部署组合。
- 目标无变化时显示提示并禁用部署按钮。
- 部署未终结时禁用新的部署和回滚，终结后按结果即时推导当前组合。
- 回滚目标无变化时禁用回滚按钮。
- 部署和回滚共用同步提交锁，避免快速重复点击。
- 使用现有 `showConfirm` 和 Snackbar，不引入浏览器原生 `confirm` 或 `alert`。

## 上线与验收

- 先完成两端静态检查、测试和构建，再提交推送 `dev`。
- GitHub Actions 成功后验证 Worker 版本更新和生产健康状态。
- 只验证当前组合的无变化请求，不创建新部署，不触发 TikTok 任务或任意 Shell。
- 修正 Pages 版本盖章时机：Actions 在 Worker 部署和前端构建前写入同一当前提交版本，pre-commit 不再写入上一个 HEAD。
