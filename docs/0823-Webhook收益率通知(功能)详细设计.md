# Webhook 收益率通知详细设计

## 目标

在底座新增独立的 Webhook 配置管理能力，并把运维 API Task、Cron 与 Webhook 通知串成一条可配置链路。首个业务场景为每日采集美国财政部 30 年期国债收益率并通过飞书自定义机器人通知。

## 设计边界

- Webhook 地址属于敏感配置，只存数据库，不进入源码、迁移脚本、日志和 Git 历史。
- 列表接口返回脱敏地址；详情接口仅允许具有编辑权限的用户读取完整地址。
- 通知执行器只按来源查找启用的主配置，Cron 参数不保存完整 Webhook 地址。
- API Task 继续负责 HTTP 采集；Cron 只负责调度和通知编排，不复制请求定义。
- 首期支持 `feishu` 来源和美国财政部收益率 XML 解析器，结构为后续来源和解析器扩展保留明确枚举入口。

## 数据模型

新增 `base_webhook_config`：

- `id`
- `source`：Webhook 来源，例如 `feishu`
- `url`：完整 Webhook URL
- `is_enabled`：是否启用
- `is_primary`：同来源的主配置
- `remark`
- `creator_id`、`updater_id`、`create_time_utc`、`update_time_utc`

同一来源只允许一个主配置；设置主配置时由服务层清除同来源其他记录的主标记。

## 接口与权限

- 业务键：`admin.base.webhook_config`
- 权限：`read`、`add`、`edit`、`delete`
- 路由：`/api/v1/admin/base/webhook_config/{list,detail,add,update,delete}`，全部使用 POST。
- 新增和更新仅接受 HTTPS URL；来源统一保存为小写。

## 通知编排

Cron 的 `parameters` 保持 JSON 文本，新增兼容型信封：

```json
{
  "request": {},
  "notification": {
    "webhookSource": "feishu",
    "formatter": "treasury_30y_yield",
    "title": "30年期美债收益率"
  }
}
```

没有 `request` 信封的历史参数继续按原逻辑传给 API Task；`notification` 不进入采集请求。采集成功后解析响应并发送通知。采集失败时发送失败摘要；通知失败会使本次 Cron 日志标记为失败，便于追踪。

飞书请求体使用文本消息格式：

```json
{
  "msg_type": "text",
  "content": {
    "text": "通知正文"
  }
}
```

所有外部请求均设置超时、等待完成，并限制写入 Cron 日志和通知消息的响应正文长度。

## 财政部数据源

- API Task：`us_treasury_30y_yield`
- 地址：`https://home.treasury.gov/sites/default/files/interest-rates/yield.xml`
- 方法：`GET`
- 解析：遍历 `G_NEW_DATE`，选择日期最新且含 `BC_30YEAR` 的记录。
- 每日 Cron：`0 1 * * *`，即 UTC 01:00 / Asia/Shanghai 09:00。

财政部只在美国工作日发布新数据，因此周末或节假日通知可能重复最近一个发布日的数据，这是预期行为。

## 安全与可运维性

- Webhook URL 不写入 HTTP/Cron 日志的 remark 或错误信息。
- 列表脱敏后仅保留协议、主机和路径尾部少量字符。
- 飞书响应仅解析有限 JSON 字段；正文按上限截断。
- 数据库提供全量建表 SQL、旧环境增量迁移和 Wrangler D1 迁移。
