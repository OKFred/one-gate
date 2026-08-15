# AutoJS6 发布独立存储优化详细设计

## 背景

AutoJS6 客户端发布制品当前复用系统默认 OSS。现有默认桶 `anyway-assets` 面向图片业务，限制为 `image/png` 和 1 MB，无法承载 `application/gzip` 的客户端发布包，也会把发布链路与普通业务文件绑定。

## 目标

- 客户端发布固定使用名称为 `mobile-client-release` 的 OSS 配置。
- 专用配置使用独立私有桶 `mobile-client-releases`。
- 默认 OSS 继续服务现有业务，发布流程不得回退到默认配置。
- 上传准备、上传完成和部署下载签名必须使用同一专用配置。
- 配置不存在、被禁用或字段不完整时安全失败，错误信息不得包含端点和密钥值。

## 设计

### 精确配置读取

`base.sysConfig` 注册服务增加按 `namespace + configKey` 精确读取的方法，返回解析后的配置值和启用状态。该方法仅供领域内部通过注册中心调用，不增加公开 HTTP 接口。

### OSS 门面

OSS 文件门面增加：

- `getStorageConfigByKey(configKey)`：读取指定配置并校验存在、启用；
- `getStorageByConfigKey(env, configKey)`：基于指定配置创建存储驱动。

原有 `getActiveStorage` 保持不变，继续供通用文件管理使用默认 OSS。

### 发布域绑定

客户端部署领域声明常量 `MOBILE_CLIENT_RELEASE_STORAGE_CONFIG_KEY = "mobile-client-release"`。以下环节全部使用专用 OSS：

1. `/client-release/upload/prepare` 的对象存在性检查与上传预签名；
2. `/client-release/upload/finalize` 的对象元数据校验；
3. `/client-deployment/apply|rollback` 创建制品下载预签名。

不提供默认配置回退，避免默认项调整后发布制品被写入其他业务桶。

## 生产配置

- 配置名：`mobile-client-release`
- Provider：`S3`
- Bucket：`mobile-client-releases`
- Endpoint：Supabase S3 endpoint
- Region：`ap-southeast-1`
- Enabled：是
- Default：否
- Bucket：私有，单文件上限 100 MB，允许 `application/gzip`

访问密钥沿用当前 Supabase S3 凭据，但只在浏览器当前登录会话内复制，不输出到终端、日志或文档。

## 兼容性与风险

- 无数据库迁移，无公开接口字段变更。
- 现有 `anyway-assets` 配置及桶策略不修改。
- 新代码部署后、专用配置创建前，发布预检会按设计失败；因此上线顺序为先创建桶和配置，再合并部署代码，最后重跑预检和发布。
- 已签发的上传票据仅包含对象键、摘要等非密钥信息；完成上传时重新按固定配置名选择存储。
