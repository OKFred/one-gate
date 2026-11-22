# AutoJS6 部署事件可靠回传优化计划变更

## Node Server

- 修改 `mobile/client-deployment/domain/deployment.ts`：部署阶段改为身份严格、状态单调的丢帧恢复规则。
- 修改 `mobile/client-deployment/model.ts`：集中声明部署事件 HTTP 请求字段。
- 修改 `mobile/device/service.ts`：新增 POST `/report/deployment`，使用设备上报令牌并调用部署领域 facade。
- 修改核心路由白名单：仅放行部署事件机器入口，业务处理仍执行设备令牌校验。
- GitHub Actions 在 Worker 发布前根据部署时间和 Git SHA 写入 `VERSION`，使线上版本可追溯。
- 补充部署领域、设备 HTTP 边界和 Worker 兼容测试。
- 不修改数据库表，不新增 D1 migration，不改变管理端 apply/get/list/rollback 公共接口。

## one-autojs6

- 修改发布构建脚本：使用 hoisted 生产依赖，并在 Linux 打包时解引用硬链，拒绝生成含软链或硬链的归档。
- 修改手机客户端归档校验：按条目目录解析内部相对链接，继续拒绝越界链接。
- 修改部署事件发布：MQTT 保留；启用 HTTP 上报时向 `/report/deployment` 发送同一事件并等待服务端确认。
- supervisor 注入设备级 HTTP 上报 URL 时自动启用 HTTP，不依赖业务环境模板显式选择 `both`。
- 补充部署和发布构建测试。

## 发布与验收

- 先发布 Node Server，确保 HTTP 接收端可用。
- 将已确认失败的 v2.1.4 部署终结为 `FAILED/ARCHIVE_LINK_UNSAFE`。
- 发布不可变 v2.1.5 制品，再以 `development/r1 + GRACEFUL` 部署到 Pixel 5。
- 成功后核对 `current`、进程入口、部署历史、设备当前版本和历史版本保留策略。
- 仅在 v2.1.5 真机成功后撤销 v2.1.0 与 v2.1.1；不触发 TikTok 发布任务。

## 影响范围

- 新增一个仅设备令牌可调用的内部 POST 接口。
- MQTT Topic 和部署命令协议不变。
- 无数据库结构变更，无前端交互变更。
- 新制品可能因依赖物化而增大，但仍受 100 MiB 客户端下载上限约束。
