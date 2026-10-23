import type { TranslationInputItem } from "@hodor/core/db/initTranslation";

const messages = [
  {
    key: "errorHandler.enterprise.asset.telemetry.invalidCatalog",
    "zh-CN": "资产采集身份目录数据无效，请联系管理员核对资产资料后重试",
    "en-US":
      "The asset collection identity catalog is invalid. Ask an administrator to check the asset records and try again",
  },
  {
    key: "errorHandler.enterprise.asset.telemetry.catalogTooLarge",
    "zh-CN": "资产采集身份目录超出上限，请联系管理员调整资产目录后重试",
    "en-US":
      "The asset collection identity catalog exceeds the supported limits. Ask an administrator to reduce the catalog and try again",
  },
  {
    key: "errorHandler.enterprise.asset.notVisible",
    "zh-CN": "资产不存在或无权访问",
    "en-US": "The asset is unavailable",
  },
  {
    key: "errorHandler.enterprise.asset.stateConflict",
    "zh-CN": "资产或关联状态已变化，或关系存在冲突，请刷新查看",
    "en-US":
      "The asset or relation changed or conflicts with an existing relation. Refresh and try again",
  },
  {
    key: "errorHandler.enterprise.asset.codeConflict",
    "zh-CN": "本企业的资产编号已被使用",
    "en-US": "This asset code is already used in the enterprise",
  },
  {
    key: "errorHandler.enterprise.asset.identifierConflict",
    "zh-CN": "本企业已存在相同的已核验资产标识",
    "en-US": "This verified identifier already exists in the enterprise",
  },
  {
    key: "errorHandler.enterprise.asset.invalidIdentifier",
    "zh-CN": "资产标识无效，不能使用占位值，核验标识需填写命名空间",
    "en-US":
      "The identifier is invalid. Placeholders are not accepted; verified identifiers need a namespace",
  },
  {
    key: "errorHandler.enterprise.asset.invalidInterval",
    "zh-CN": "有效区间无效，结束时间必须晚于开始时间",
    "en-US": "The interval is invalid. Its end must be later than its start",
  },
  {
    key: "errorHandler.enterprise.asset.ambiguousMapping",
    "zh-CN": "观测时间存在多个资产映射，请修复冲突后重试",
    "en-US":
      "More than one asset mapping covers this observation. Resolve the conflict first",
  },
] as const;

export const assetTranslations: TranslationInputItem[] = messages.map(
  (item) => ({
    application: "backend",
    tKey: item.key,
    langCodes: { "zh-CN": item["zh-CN"], "en-US": item["en-US"] },
  })
);
