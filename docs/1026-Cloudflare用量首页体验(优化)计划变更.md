# Cloudflare 用量首页体验优化计划

1. 前端重排首页，提取图表与纯数据变换，增加 1/3/7/30 天趋势筛选；精简卡片，把来源、口径、覆盖与完整表格收纳到详情。
2. 图表按周期选择每日或累计观测，增加 80%／100% 参考线、缺口断线、未知额度和首次单点说明。
3. 后端扩 days schema／请求类型，采集发布前补充明确来源的累计观测；沿用现有存储，不新增表字段或迁移。
4. 同步 OpenAPI 与中英文文案；调整 UI fixture，增加短范围、观察幂等和图表语义／交互回归。
5. 对变更文件格式、lint、前后 TS 诊断、定向 Node／Worker／PostgreSQL 与浏览器测试进行验证，完成构建和 `git diff --check`。
6. 完成至少两轮复核，补实际落地记录及本地可视验收证据。保留生产数据、配置及资源绑定，沿用用户先前确认的 PR、CI、合并和发布流程。

主要范围：`platform/apps/admin/src/pages/home/`、首页中英文文案、Cloudflare 首页 E2E 与 fixture、用量后端 model/service/collector 及相关测试、生成的 OpenAPI 类型。无 AI 行为或权限模型改造。
