# Self-hosted Runner 实际落地

## 实际改动

- 将测试 Job 从 GitHub 托管的 `ubuntu-latest` 切换到仓库级
  `self-hosted / Linux / X64` Runner。
- 将部署 Job 使用的 Runner 同步切换，保留测试前置、分支判断、D1 migration、
  Schema Contract 和 Cloudflare 部署顺序。
- 未修改 Secrets、部署目标、触发分支和生产数据。

## 验证边界

- GitHub 仓库设置页显示 `docker-app` Runner 在线且状态为 `Idle`。
- 本次只验证 Workflow 语法、差异和新一轮 GitHub Actions 调度结果；不会把
  Runner 在线状态视为测试或部署成功。

## 后续建议

- 为 Runner 容器配置持久磁盘容量监控，并定期清理 Actions 工作目录和工具缓存。
- 若未来增加更多 Runner，添加仓库专属自定义标签，避免任务调度到能力不匹配的主机。
