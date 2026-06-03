import db from "@/db/index";
import { translationTable } from "@/api/i18n/translation/model";
import { utils as translationUtils } from "@/api/i18n/translation/service";
import { SUPER_ADMIN_ID } from "./init";
import { sql } from "drizzle-orm";

export type BatchTranslationItem = {
  application: string;
  business: string;
  tKey: string;
  // tValue: string;
  langCodes: Record<string, string>;
  isEnabled: boolean;
};

/**
 * 准备多语言数据同步语句
 */
export async function prepareTranslation(options?: { reset?: boolean }) {
  // 0. 数据扁平化处理
  const flattenedData = [];
  for (const item of initialTranslationData) {
    for (const [langCode, tValue] of Object.entries(item.langCodes)) {
      flattenedData.push({
        ...item,
        langCode,
        tValue,
      });
    }
  }

  const stats = {
    total: flattenedData.length,
    created: 0,
    updated: 0,
    skipped: 0,
  };

  const queries: any[] = [];

  if (options?.reset) {
    queries.push(db.delete(translationTable));
  }

  // 1. 预处理所有数据的哈希值 (并行处理)
  const mappedData = await Promise.all(
    flattenedData.map(async (item) => {
      const valueHash = await translationUtils.calculateSHA256(item.tValue);
      return {
        application: item.application,
        business: item.business,
        langCode: item.langCode,
        tKey: item.tKey,
        tValue: item.tValue,
        valueHash,
        remark: null,
        isEnabled: item.isEnabled,
        creatorId: SUPER_ADMIN_ID,
      };
    })
  );

  // 2. 将数据拆分为小批次以规避 SQL 变量限制
  const BATCH_SIZE = 10;
  for (let i = 0; i < mappedData.length; i += BATCH_SIZE) {
    const batch = mappedData.slice(i, i + BATCH_SIZE);
    queries.push(
      db
        .insert(translationTable)
        .values(batch)
        .onConflictDoUpdate({
          target: [translationTable.tKey, translationTable.langCode],
          set: {
            tValue: sql`excluded.t_value`,
            valueHash: sql`excluded.value_hash`,
            isEnabled: sql`excluded.is_enabled`,
          },
        })
    );
  }

  stats.created = mappedData.length;
  return { queries, stats };
}

export const initialTranslationData = [
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.log.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务执行历史",
      "en-US": "Task Execution History",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.log.empty",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂无任务执行日志",
      "en-US": "No execution log available",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.log.id",
    isEnabled: true,
    langCodes: {
      "zh-CN": "ID",
      "en-US": "ID",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.log.status",
    isEnabled: true,
    langCodes: {
      "zh-CN": "执行状态",
      "en-US": "Status",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.log.startTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "开始时间",
      "en-US": "Start Time",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.log.duration",
    isEnabled: true,
    langCodes: {
      "zh-CN": "耗时 (毫秒)",
      "en-US": "Duration (ms)",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.log.detail",
    isEnabled: true,
    langCodes: {
      "zh-CN": "执行日志 / 异常堆栈",
      "en-US": "Log / Stack Trace",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.log.success",
    isEnabled: true,
    langCodes: {
      "zh-CN": "执行成功",
      "en-US": "Executed Successfully",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.log.unknownError",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未知异常",
      "en-US": "Unknown Exception",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.button.close",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关闭",
      "en-US": "Close",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.filter.keywordPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "搜索名称/任务Key",
      "en-US": "Search Name / Job Key",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.field.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务名称",
      "en-US": "Task Name",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.field.jobKey",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务唯一 Key",
      "en-US": "Job Unique Key",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.field.cronExpression",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Cron 表达式",
      "en-US": "Cron Expression",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.field.runCount",
    isEnabled: true,
    langCodes: {
      "zh-CN": "运行次数",
      "en-US": "Run Count",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.field.lastRunTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "上次运行时间",
      "en-US": "Last Run Time",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.field.nextRunTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "下次预定时间",
      "en-US": "Next Scheduled Time",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.jobKey.testLog",
    isEnabled: true,
    langCodes: {
      "zh-CN": "控制台测试日志任务 (test_log)",
      "en-US": "Console Test Log Task (test_log)",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.jobKey.syncExternalData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "外部数据同步任务 (sync_external_data)",
      "en-US": "External Data Sync Task (sync_external_data)",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.field.cronExpressionPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: */5 * * * * (每 5 分钟执行一次)",
      "en-US": "e.g. */5 * * * * (every 5 minutes)",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.field.statusLabel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "是否开启任务",
      "en-US": "Enable Task",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.field.parameters",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务自定义参数 (JSON 字符串)",
      "en-US": "Custom Parameters (JSON string)",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.status.success",
    isEnabled: true,
    langCodes: {
      "zh-CN": "成功",
      "en-US": "Success",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.status.fail",
    isEnabled: true,
    langCodes: {
      "zh-CN": "失败",
      "en-US": "Fail",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.helper.parsing",
    isEnabled: true,
    langCodes: {
      "zh-CN": "正在解析 Cron 表达式...",
      "en-US": "Parsing Cron expression...",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.helper.frequency",
    isEnabled: true,
    langCodes: {
      "zh-CN": "执行频率：",
      "en-US": "Execution Frequency:",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.helper.nextTimes",
    isEnabled: true,
    langCodes: {
      "zh-CN": "预定下次执行时间 (未来 5 次)：",
      "en-US": "Scheduled Next Run Times (Next 5 runs):",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.helper.invalid",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Cron 表达式无效",
      "en-US": "Invalid Cron Expression",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.helper.reason",
    isEnabled: true,
    langCodes: {
      "zh-CN": "原因: {error}",
      "en-US": "Reason: {error}",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.helper.parseFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "解析失败",
      "en-US": "Parse Failed",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.helper.noData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "接口未返回数据",
      "en-US": "No data returned from API",
    },
  },
  {
    application: "frontend",
    business: "cron",
    tKey: "cron.helper.networkError",
    isEnabled: true,
    langCodes: {
      "zh-CN": "网络错误",
      "en-US": "Network Error",
    },
  },
  {
    application: "backend",
    business: "cron",
    tKey: "cron.frequency.custom",
    isEnabled: true,
    langCodes: {
      "zh-CN": "自定义周期",
      "en-US": "Custom cycle",
    },
  },
  {
    application: "backend",
    business: "cron",
    tKey: "cron.frequency.minutely",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每分钟执行一次",
      "en-US": "Execute every minute",
    },
  },
  {
    application: "backend",
    business: "cron",
    tKey: "cron.frequency.minutes",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每 {minutes} 分钟执行一次",
      "en-US": "Execute every {minutes} minutes",
    },
  },
  {
    application: "backend",
    business: "cron",
    tKey: "cron.frequency.hourly",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每小时执行一次",
      "en-US": "Execute every hour",
    },
  },
  {
    application: "backend",
    business: "cron",
    tKey: "cron.frequency.hours",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每 {hours} 小时执行一次",
      "en-US": "Execute every {hours} hours",
    },
  },
  {
    application: "backend",
    business: "cron",
    tKey: "cron.frequency.daily",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每天执行一次",
      "en-US": "Execute every day",
    },
  },
  {
    application: "backend",
    business: "cron",
    tKey: "cron.frequency.days",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每 {days} 天执行一次",
      "en-US": "Execute every {days} days",
    },
  },
  {
    application: "backend",
    business: "cron",
    tKey: "cron.frequency.seconds",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每 {seconds} 秒执行一次",
      "en-US": "Execute every {seconds} seconds",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.maintenance.cron",
    isEnabled: true,
    langCodes: {
      "zh-CN": "定时任务",
      "en-US": "Scheduled Tasks",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "businessType.maintenance.cron",
    isEnabled: true,
    langCodes: {
      "zh-CN": "系统运维-定时任务",
      "en-US": "Maintenance-Cron Job",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "table.deleteConfirm",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确定要删除吗？此操作不可撤销。",
      "en-US":
        "Are you sure you want to delete it? This action cannot be undone.",
    },
  },
  {
    application: "frontend",
    business: "common",
    tKey: "common.fullScreen",
    isEnabled: true,
    langCodes: {
      "zh-CN": "全屏",
      "en-US": "Full Screen",
    },
  },
  {
    application: "frontend",
    business: "common",
    tKey: "common.exitFullScreen",
    isEnabled: true,
    langCodes: {
      "zh-CN": "退出全屏",
      "en-US": "Exit Full Screen",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "filter.results",
    isEnabled: true,
    langCodes: {
      "zh-CN": "{count} 个结果",
      "en-US": "{count} results",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "form.missingCredentials",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请输入用户名和密码",
      "en-US": "Please enter username and password",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "form.pleaseEnter",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请输入",
      "en-US": "Please Enter",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "form.select",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请选择",
      "en-US": "Please Select",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "status.success",
    isEnabled: true,
    langCodes: {
      "zh-CN": "成功",
      "en-US": "Success",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "status.failure",
    isEnabled: true,
    langCodes: {
      "zh-CN": "失败",
      "en-US": "Failure",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "table.refresh",
    isEnabled: true,
    langCodes: {
      "zh-CN": "刷新",
      "en-US": "Refresh",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "status.enabled",
    isEnabled: true,
    langCodes: {
      "zh-CN": "启用",
      "en-US": "Enabled",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "status.disabled",
    isEnabled: true,
    langCodes: {
      "zh-CN": "禁用",
      "en-US": "Disabled",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.cancel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "取消",
      "en-US": "Cancel",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "table.pageSizeLabel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每页条数",
      "en-US": "Items per page",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "column.noData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂无数据",
      "en-US": "No data",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "column.language",
    isEnabled: true,
    langCodes: {
      "zh-CN": "语言",
      "en-US": "Language",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "column.category",
    isEnabled: true,
    langCodes: {
      "zh-CN": "分类",
      "en-US": "Category",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.close",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关闭",
      "en-US": "Close",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.ai",
    isEnabled: true,
    langCodes: {
      "zh-CN": "AI",
      "en-US": "AI",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.ai.config",
    isEnabled: true,
    langCodes: {
      "zh-CN": "LLM 配置",
      "en-US": "LLM Configuration",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.swarm",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Swarm集群",
      "en-US": "Swarm Cluster",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.swarm.docker",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Docker服务",
      "en-US": "Docker Service",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "LLM 配置管理",
      "en-US": "LLM Configuration",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "配置名称",
      "en-US": "Config Name",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.provider",
    isEnabled: true,
    langCodes: {
      "zh-CN": "提供商",
      "en-US": "Provider",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.baseUrl",
    isEnabled: true,
    langCodes: {
      "zh-CN": "接口地址",
      "en-US": "Base URL",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.apiKey",
    isEnabled: true,
    langCodes: {
      "zh-CN": "API 密钥",
      "en-US": "API Key",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.model",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模型名称",
      "en-US": "Model",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.capabilities",
    isEnabled: true,
    langCodes: {
      "zh-CN": "支持能力",
      "en-US": "Capabilities",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.isDefault",
    isEnabled: true,
    langCodes: {
      "zh-CN": "设为默认",
      "en-US": "Set as Default",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.verify",
    isEnabled: true,
    langCodes: {
      "zh-CN": "验证连通性",
      "en-US": "Verify Connectivity",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.verifySuccess",
    isEnabled: true,
    langCodes: {
      "zh-CN": "连接验证成功",
      "en-US": "Verification successful",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.verifyFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "连接验证失败",
      "en-US": "Verification failed",
    },
  },
  {
    application: "backend",
    business: "ai.config",
    tKey: "errorHandler.ai.config.verifyFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模型连通性验证失败: {message}",
      "en-US": "Model connectivity verification failed: {message}",
    },
  },
  {
    application: "frontend",
    business: "ai.chat",
    tKey: "ai.chat.inputPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "输入消息开始对话...",
      "en-US": "Type a message to start chat...",
    },
  },
  {
    application: "frontend",
    business: "ai.chat",
    tKey: "ai.chat.send",
    isEnabled: true,
    langCodes: {
      "zh-CN": "发送",
      "en-US": "Send",
    },
  },
  {
    application: "frontend",
    business: "ai.chat",
    tKey: "ai.chat.newChat",
    isEnabled: true,
    langCodes: {
      "zh-CN": "新建对话",
      "en-US": "New Chat",
    },
  },
  {
    application: "backend",
    business: "ai.chat",
    tKey: "errorHandler.ai.chat.promptRequired",
    isEnabled: true,
    langCodes: {
      "zh-CN": "对话内容不能为空",
      "en-US": "Chat content cannot be empty",
    },
  },
  {
    application: "backend",
    business: "ai.chat",
    tKey: "errorHandler.ai.chat.configNotFound",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未找到默认的 AI 模型配置，请先在系统中进行设置",
      "en-US":
        "Default AI model configuration not found, please set it up in the system first",
    },
  },
  {
    application: "backend",
    business: "ai.chat",
    tKey: "errorHandler.ai.chat.apiError",
    isEnabled: true,
    langCodes: {
      "zh-CN": "AI 接口调用失败: {message}",
      "en-US": "AI API call failed: {message}",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "columns.id",
    isEnabled: true,
    langCodes: {
      "zh-CN": "ID",
      "en-US": "ID",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "columns.status",
    isEnabled: true,
    langCodes: {
      "zh-CN": "状态",
      "en-US": "Status",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "columns.createTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "创建时间",
      "en-US": "Create Time",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "columns.updateTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "更新时间",
      "en-US": "Update Time",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "columns.permissionCount",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限数量",
      "en-US": "Permission Count",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "table.actions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "操作",
      "en-US": "Actions",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.add",
    isEnabled: true,
    langCodes: {
      "zh-CN": "新增",
      "en-US": "Add",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.edit",
    isEnabled: true,
    langCodes: {
      "zh-CN": "编辑",
      "en-US": "Edit",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.delete",
    isEnabled: true,
    langCodes: {
      "zh-CN": "删除",
      "en-US": "Delete",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.save",
    isEnabled: true,
    langCodes: {
      "zh-CN": "保存",
      "en-US": "Save",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.confirm",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确定",
      "en-US": "Confirm",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.confirmContent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确定要保存当前权限变更吗？",
      "en-US": "Are you sure you want to save the current permission changes?",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.operationSuccess",
    isEnabled: true,
    langCodes: {
      "zh-CN": "操作成功",
      "en-US": "Operation successful",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "column.yes",
    isEnabled: true,
    langCodes: {
      "zh-CN": "是",
      "en-US": "Yes",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "column.no",
    isEnabled: true,
    langCodes: {
      "zh-CN": "否",
      "en-US": "No",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.deleteConfirmTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确认删除",
      "en-US": "Confirm Delete",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "filter.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "搜索与筛选",
      "en-US": "Search & Filter",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "filter.clear",
    isEnabled: true,
    langCodes: {
      "zh-CN": "清除筛选",
      "en-US": "Clear Filters",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "filter.keywordLabel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关键字搜索",
      "en-US": "Keyword Search",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "filter.orderBy",
    isEnabled: true,
    langCodes: {
      "zh-CN": "排序字段",
      "en-US": "Sort By",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "filter.sortOrder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "排序方式",
      "en-US": "Sort Order",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "filter.asc",
    isEnabled: true,
    langCodes: {
      "zh-CN": "升序",
      "en-US": "Ascending",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "filter.desc",
    isEnabled: true,
    langCodes: {
      "zh-CN": "降序",
      "en-US": "Descending",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "column.unassigned",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未分配",
      "en-US": "Unassigned",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "columns.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "名称",
      "en-US": "Name",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "column.remark",
    isEnabled: true,
    langCodes: {
      "zh-CN": "备注",
      "en-US": "Remark",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "filter.keyword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关键词",
      "en-US": "Keyword",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "filter.enabledStatus",
    isEnabled: true,
    langCodes: {
      "zh-CN": "启用状态",
      "en-US": "Enabled Status",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "filter.all",
    isEnabled: true,
    langCodes: {
      "zh-CN": "全部",
      "en-US": "All",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "filter.condition",
    isEnabled: true,
    langCodes: {
      "zh-CN": "筛选条件",
      "en-US": "Filter Conditions",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.operationSuccess",
    isEnabled: true,
    langCodes: {
      "zh-CN": "操作成功",
      "en-US": "Operation successful",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.required",
    isEnabled: true,
    langCodes: {
      "zh-CN": "该项为必填项",
      "en-US": "This field is required",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "page.details",
    isEnabled: true,
    langCodes: {
      "zh-CN": "详情",
      "en-US": "Details",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.titie.error",
    isEnabled: true,
    langCodes: {
      "zh-CN": "错误提示",
      "en-US": "Error",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.titie.warning",
    isEnabled: true,
    langCodes: {
      "zh-CN": "警告",
      "en-US": "Warning",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.titie.success",
    isEnabled: true,
    langCodes: {
      "zh-CN": "成功",
      "en-US": "Success",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "dialog.titie.info",
    isEnabled: true,
    langCodes: {
      "zh-CN": "提示",
      "en-US": "Info",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.emptyPrompt",
    isEnabled: true,
    langCodes: {
      "zh-CN": "菜单为空，请联系管理员添加菜单",
      "en-US": "The menu is empty. Please contact the administrator to add it.",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.home",
    isEnabled: true,
    langCodes: {
      "zh-CN": "主页",
      "en-US": "Home",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.me",
    isEnabled: true,
    langCodes: {
      "zh-CN": "我的",
      "en-US": "Profile",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.mail",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件管理",
      "en-US": "Mail Management",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.mail.template",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板",
      "en-US": "Templates",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.mail.log",
    isEnabled: true,
    langCodes: {
      "zh-CN": "日志",
      "en-US": "Logs",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.mail.send",
    isEnabled: true,
    langCodes: {
      "zh-CN": "发送",
      "en-US": "Send",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.mail.account",
    isEnabled: true,
    langCodes: {
      "zh-CN": "账户",
      "en-US": "Accounts",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.system",
    isEnabled: true,
    langCodes: {
      "zh-CN": "系统管理",
      "en-US": "System",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.system.role",
    isEnabled: true,
    langCodes: {
      "zh-CN": "角色",
      "en-US": "Roles",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.user",
    isEnabled: true,
    langCodes: {
      "zh-CN": "用户",
      "en-US": "Users",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.system.department",
    isEnabled: true,
    langCodes: {
      "zh-CN": "部门",
      "en-US": "Departments",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.menu",
    isEnabled: true,
    langCodes: {
      "zh-CN": "菜单",
      "en-US": "Menus",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.system.permission.emptyPrompt",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限列表为空，请联系管理员分配权限",
      "en-US":
        "The permission list is empty. Please contact the administrator to assign it.",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.system.permission",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限",
      "en-US": "Permissions",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.system.rolePermission",
    isEnabled: true,
    langCodes: {
      "zh-CN": "角色权限",
      "en-US": "Role Permission",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.i18n",
    isEnabled: true,
    langCodes: {
      "zh-CN": "国际化",
      "en-US": "Internationalization",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.system.schemaForm",
    isEnabled: true,
    langCodes: {
      "zh-CN": "动态表单配置",
      "en-US": "Schema Form Config",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.system.schemaFormData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单提交数据",
      "en-US": "Schema Form Data",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.language",
    isEnabled: true,
    langCodes: {
      "zh-CN": "语言",
      "en-US": "Languages",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.translation",
    isEnabled: true,
    langCodes: {
      "zh-CN": "翻译",
      "en-US": "Translations",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.i18n.region",
    isEnabled: true,
    langCodes: {
      "zh-CN": "国家地区",
      "en-US": "Regions",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "topbar.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "条条大道通罗马",
      "en-US": "All roads lead to Rome",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "topbar.profile",
    isEnabled: true,
    langCodes: {
      "zh-CN": "个人设置",
      "en-US": "Profile",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "topbar.logout",
    isEnabled: true,
    langCodes: {
      "zh-CN": "退出登录",
      "en-US": "Log out",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "topbar.notLoggedIn",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未登录",
      "en-US": "Not signed in",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "login.username",
    isEnabled: true,
    langCodes: {
      "zh-CN": "用户名",
      "en-US": "Username",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "login.password",
    isEnabled: true,
    langCodes: {
      "zh-CN": "密码",
      "en-US": "Password",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "login.signIn",
    isEnabled: true,
    langCodes: {
      "zh-CN": "登录",
      "en-US": "Sign in",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "login.wechatSignIn",
    isEnabled: true,
    langCodes: {
      "zh-CN": "微信登录",
      "en-US": "WeChat Sign in",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "login.wechatWIP",
    isEnabled: true,
    langCodes: {
      "zh-CN": "微信登录功能正在开发中...",
      "en-US": "WeChat sign-in is under development...",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "login.forgotPassword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "忘记密码？",
      "en-US": "Forgot password?",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "dialog.message",
    isEnabled: true,
    langCodes: {
      "zh-CN": "页面未找到",
      "en-US": "Page Not Found",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "dialog.goBackHome",
    isEnabled: true,
    langCodes: {
      "zh-CN": "返回首页",
      "en-US": "Go Back Home",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.databaseBusy",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据库繁忙或锁定",
      "en-US": "Database busy or locked",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.databaseError",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据库操作错误",
      "en-US": "Database operation error",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.notFound",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未找到请求的资源",
      "en-US": "Resource not found",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.targetNotExist",
    isEnabled: true,
    langCodes: {
      "zh-CN": "目标不存在",
      "en-US": "Target does not exist",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.forbidden",
    isEnabled: true,
    langCodes: {
      "zh-CN": "禁止访问",
      "en-US": "Access forbidden",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.permissionDenied",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限不足",
      "en-US": "Permission denied",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.validationFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请求校验失败",
      "en-US": "Request validation failed",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.serverError",
    isEnabled: true,
    langCodes: {
      "zh-CN": "服务器异常",
      "en-US": "Server error",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.unknownError",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未知异常",
      "en-US": "Unknown error",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.undefinedError",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未定义的错误类型",
      "en-US": "Undefined error type",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.duplicatedData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据重复",
      "en-US": "Duplicated data",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.invalidParams",
    isEnabled: true,
    langCodes: {
      "zh-CN": "无效的参数",
      "en-US": "Invalid parameters",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.departmentNotExist",
    isEnabled: true,
    langCodes: {
      "zh-CN": "部门不存在或已被禁用",
      "en-US": "Department does not exist or has been disabled",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.roleNotExist",
    isEnabled: true,
    langCodes: {
      "zh-CN": "角色不存在或已被禁用",
      "en-US": "Role does not exist or has been disabled",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.system.role.superAdminDeleteProhibited",
    isEnabled: true,
    langCodes: {
      "zh-CN": "超级管理员角色禁止删除",
      "en-US": "Super admin role cannot be deleted",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.system.role.superAdminUpdateProhibited",
    isEnabled: true,
    langCodes: {
      "zh-CN": "超级管理员角色核心属性禁止修改",
      "en-US": "Core attributes of super admin role cannot be modified",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.system.user.superAdminDeleteProhibited",
    isEnabled: true,
    langCodes: {
      "zh-CN": "超级管理员用户禁止删除",
      "en-US": "Super admin user cannot be deleted",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.system.user.superAdminDisableProhibited",
    isEnabled: true,
    langCodes: {
      "zh-CN": "超级管理员用户禁止禁用",
      "en-US": "Super admin user cannot be disabled",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.system.user.assignSuperAdminRoleProhibited",
    isEnabled: true,
    langCodes: {
      "zh-CN": "禁止分配超级管理员角色",
      "en-US": "Assigning super admin role is prohibited",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.hasChildren",
    isEnabled: true,
    langCodes: {
      "zh-CN": "存在子节点，请检查后重试",
      "en-US": "Child nodes exist, please check and try again",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.departmentHasEnabledUser",
    isEnabled: true,
    langCodes: {
      "zh-CN": "当前部门或子部门下存在已启用的用户，无法禁用",
      "en-US":
        "Cannot disable department: active users exist in current or child departments",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.checkOutTimeEarly",
    isEnabled: true,
    langCodes: {
      "zh-CN": "签退时间早于或等于签到时间",
      "en-US":
        "Check-out time cannot be earlier than or equal to check-in time",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.departmentHasEnabledChildren",
    isEnabled: true,
    langCodes: {
      "zh-CN": "当前部门下存在未禁用的子部门，请先禁用子部门",
      "en-US":
        "Cannot disable department: enabled child departments exist, please disable them first",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.department.selfParent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "不能将部门自身设为父部门",
      "en-US": "A department cannot be its own parent",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.department.descendantParent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "不能将子孙部门设为父部门，会导致死循环",
      "en-US":
        "A descendant department cannot be set as a parent, it would cause a circular reference",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.notAuthenticated",
    isEnabled: true,
    langCodes: {
      "zh-CN": "用户未认证或token无效",
      "en-US": "User not authenticated or token is invalid",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.notExistOrDisabled",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据不存在或已被禁用",
      "en-US": "Data does not exist or has been disabled",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.menu.parentNotExist",
    isEnabled: true,
    langCodes: {
      "zh-CN": "父菜单不存在或已被禁用",
      "en-US": "Parent menu does not exist or has been disabled",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.menu.selfParent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "父菜单不能是自己",
      "en-US": "Parent menu cannot be itself",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.menu.circularParent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "不能将子孙菜单设为父菜单，会导致环路",
      "en-US":
        "Cannot set descendant menu as parent, it causes a circular loop",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.menu.hasChildren",
    isEnabled: true,
    langCodes: {
      "zh-CN": "该菜单下存在子菜单，无法直接删除",
      "en-US": "Sub-menus exist, cannot delete",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.menu.hasEnabledChildren",
    isEnabled: true,
    langCodes: {
      "zh-CN": "该菜单下存在已启用的子菜单，请先禁用子菜单",
      "en-US": "Enabled sub-menus exist, please disable them first",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.notYetImplemented",
    isEnabled: true,
    langCodes: {
      "zh-CN": "功能暂未实现",
      "en-US": "Feature not yet implemented",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.wrongPassword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "密码错误",
      "en-US": "Invalid password",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.loginFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "登录失败，请检查用户名和密码",
      "en-US": "Login failed, please check username and password",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "errorHandler.system.rolePermission.recordNotFound",
    isEnabled: true,
    langCodes: {
      "zh-CN": "角色权限记录不存在",
      "en-US": "Role permission record not found",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "errorHandler.system.rolePermission.roleNotFound",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关联角色不存在",
      "en-US": "Associated role not found",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "errorHandler.system.rolePermission.permissionNotFound",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关联权限不存在",
      "en-US": "Associated permission not found",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.mail.action.sendFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件发送失败，请检查配置或网络连接",
      "en-US":
        "Mail sending failed, please check configuration or network connection",
    },
  },
  {
    application: "frontend",
    business: "business.exception",
    tKey: "error.requestFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请求失败",
      "en-US": "Request failed",
    },
  },
  {
    application: "frontend",
    business: "business.exception",
    tKey: "error.sessionExpired",
    isEnabled: true,
    langCodes: {
      "zh-CN": "登录已过期，请重新登录",
      "en-US": "Session expired, please login again",
    },
  },
  {
    application: "frontend",
    business: "business.exception",
    tKey: "error.networkError",
    isEnabled: true,
    langCodes: {
      "zh-CN": "网络错误",
      "en-US": "Network error",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "home.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "欢迎使用",
      "en-US": "Welcome",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "home.subtitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "一站式信息管理解决方案",
      "en-US": "All-in-one information management solution",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.accounts",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件账户",
      "en-US": "Mail Accounts",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.templates",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件模板",
      "en-US": "Mail Templates",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.todaySent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "今日发送",
      "en-US": "Sent Today",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "快速开始",
      "en-US": "Quick Start",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.configureAccounts",
    isEnabled: true,
    langCodes: {
      "zh-CN": "🔧 配置邮件账户：在邮件账户管理中添加您的SMTP配置",
      "en-US": "🔧 Configure accounts: Add your SMTP settings in Mail Accounts",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.createTemplate",
    isEnabled: true,
    langCodes: {
      "zh-CN": "📝 创建邮件模板：设计可重复使用的邮件模板",
      "en-US": "📝 Create templates: Design reusable mail templates",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.sendMail",
    isEnabled: true,
    langCodes: {
      "zh-CN": "📧 发送邮件：使用模板快速发送邮件",
      "en-US": "📧 Send mail: Quickly send using templates",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.viewLogs",
    isEnabled: true,
    langCodes: {
      "zh-CN": "📊 查看日志：监控邮件发送状态和历史记录",
      "en-US": "📊 View logs: Monitor mail send status and history",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "翻译管理",
      "en-US": "Translation Management",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.table.application",
    isEnabled: true,
    langCodes: {
      "zh-CN": "应用",
      "en-US": "Application",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.table.business",
    isEnabled: true,
    langCodes: {
      "zh-CN": "业务",
      "en-US": "Business",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.table.langCode",
    isEnabled: true,
    langCodes: {
      "zh-CN": "语言代码",
      "en-US": "Language Code",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.table.tKey",
    isEnabled: true,
    langCodes: {
      "zh-CN": "翻译键",
      "en-US": "Translation Key",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.table.tValue",
    isEnabled: true,
    langCodes: {
      "zh-CN": "翻译值",
      "en-US": "Translation Value",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.dialog.duplicateWarning",
    isEnabled: true,
    langCodes: {
      "zh-CN": "发现{count}个相同的翻译文案：",
      "en-US": "Found {count} duplicated translation(s):",
    },
  },
  {
    application: "frontend",
    business: "i18n.translation",
    tKey: "translation.dialog.duplicateSuggestion",
    isEnabled: true,
    langCodes: {
      "zh-CN": "💡 建议：确认是否需要添加新的翻译文案，或复用现有翻译键",
      "en-US":
        "Tip: Consider reusing an existing key instead of adding a new translation.",
    },
  },
  {
    application: "frontend",
    business: "i18n.region",
    tKey: "region.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "国家地区管理",
      "en-US": "Region Management",
    },
  },
  {
    application: "frontend",
    business: "i18n.region",
    tKey: "region.table.alpha2Code",
    isEnabled: true,
    langCodes: {
      "zh-CN": "ISO两位代码",
      "en-US": "ISO 3166-1 alpha-2",
    },
  },
  {
    application: "frontend",
    business: "i18n.region",
    tKey: "region.table.alpha3Code",
    isEnabled: true,
    langCodes: {
      "zh-CN": "ISO三位代码",
      "en-US": "ISO 3166-1 alpha-3",
    },
  },
  {
    application: "frontend",
    business: "i18n.region",
    tKey: "region.table.numeric",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数字代码",
      "en-US": "Numeric Code",
    },
  },
  {
    application: "frontend",
    business: "i18n.region",
    tKey: "region.table.iso3166Independent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "是否ISO3166独立主权国家",
      "en-US": "Is Independent Country / Region in ISO3166",
    },
  },
  {
    application: "frontend",
    business: "i18n.region",
    tKey: "region.table.businessLanguages",
    isEnabled: true,
    langCodes: {
      "zh-CN": "业务语言",
      "en-US": "Business Languages",
    },
  },
  {
    application: "frontend",
    business: "i18n.language",
    tKey: "language.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "语言管理",
      "en-US": "Language Management",
    },
  },
  {
    application: "frontend",
    business: "i18n.language",
    tKey: "language.table.langCode",
    isEnabled: true,
    langCodes: {
      "zh-CN": "语言代码",
      "en-US": "Language Code",
    },
  },
  {
    application: "frontend",
    business: "i18n.language",
    tKey: "language.table.nativeName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "本地名称",
      "en-US": "Native Name",
    },
  },
  {
    application: "frontend",
    business: "mail.account",
    tKey: "account.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件账户管理",
      "en-US": "Mail Account Management",
    },
  },
  {
    application: "frontend",
    business: "mail.account",
    tKey: "account.table.nickname",
    isEnabled: true,
    langCodes: {
      "zh-CN": "昵称",
      "en-US": "Nickname",
    },
  },
  {
    application: "frontend",
    business: "mail.account",
    tKey: "account.table.email",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮箱",
      "en-US": "Email",
    },
  },
  {
    application: "frontend",
    business: "mail.account",
    tKey: "account.table.host",
    isEnabled: true,
    langCodes: {
      "zh-CN": "主机",
      "en-US": "Host",
    },
  },
  {
    application: "frontend",
    business: "mail.account",
    tKey: "account.table.port",
    isEnabled: true,
    langCodes: {
      "zh-CN": "端口",
      "en-US": "Port",
    },
  },
  {
    application: "frontend",
    business: "mail.account",
    tKey: "account.table.password",
    isEnabled: true,
    langCodes: {
      "zh-CN": "密码",
      "en-US": "Password",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.customFrom",
    isEnabled: true,
    langCodes: {
      "zh-CN": "或直接输入发件邮箱",
      "en-US": "Or input sender email directly",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.customFromHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "如果没有配置的账户，可以直接输入邮箱地址",
      "en-US": "If no account configured, you can input email directly",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.recipientName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "姓名",
      "en-US": "Name",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.recipientEmail",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮箱",
      "en-US": "Email",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.addRecipient",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加收件人",
      "en-US": "Add recipient",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.removeRecipient",
    isEnabled: true,
    langCodes: {
      "zh-CN": "移除收件人",
      "en-US": "Remove recipient",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.subject",
    isEnabled: true,
    langCodes: {
      "zh-CN": "主题",
      "en-US": "Subject",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.contentLoaded",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板内容已加载，您可以在此基础上编辑...",
      "en-US": "Template content loaded, you can edit it...",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.action.send",
    isEnabled: true,
    langCodes: {
      "zh-CN": "发送",
      "en-US": "Send",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件模板管理",
      "en-US": "Mail Template Management",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "发送邮件",
      "en-US": "Send Mail",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.recipients",
    isEnabled: true,
    langCodes: {
      "zh-CN": "收件人",
      "en-US": "Recipients",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.addRecipient",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加收件人",
      "en-US": "Add recipient",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.noTemplate",
    isEnabled: true,
    langCodes: {
      "zh-CN": "不使用模板 - 手动编写内容",
      "en-US": "No template - write content manually",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.templateName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板名",
      "en-US": "Template",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.creator",
    isEnabled: true,
    langCodes: {
      "zh-CN": "创建人",
      "en-US": "Creator",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.category",
    isEnabled: true,
    langCodes: {
      "zh-CN": "分类",
      "en-US": "Category",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.contentLabel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件内容",
      "en-US": "Mail Content",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板名称",
      "en-US": "Template Name",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.nameHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件模板的唯一标识名称",
      "en-US": "Unique identifier for the template",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.subject",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件标题",
      "en-US": "Mail Subject",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.subjectHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件的主题行",
      "en-US": "Subject line of the mail",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.langCodeHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板使用的语言代码（可选）",
      "en-US": "Language code for the template (optional)",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.category",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板分类",
      "en-US": "Template Category",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.categoryHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板的分类标签（可选）",
      "en-US": "Category tag for the template (optional)",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.contentLabel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件内容",
      "en-US": "Mail Content",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.contentHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "使用富文本编辑器编写邮件模板内容，支持HTML格式",
      "en-US": "Use the rich text editor; HTML supported",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件标题",
      "en-US": "Mail Subject",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "dialog.title.preview",
    isEnabled: true,
    langCodes: {
      "zh-CN": "预览",
      "en-US": "Preview",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.preview.basicInfo",
    isEnabled: true,
    langCodes: {
      "zh-CN": "基本信息",
      "en-US": "Basic Info",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.preview.tags",
    isEnabled: true,
    langCodes: {
      "zh-CN": "标签",
      "en-US": "Tags",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.templateParams",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板参数",
      "en-US": "Template Parameters",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.errorCode",
    isEnabled: true,
    langCodes: {
      "zh-CN": "错误代码",
      "en-US": "Error Code",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.errorDetails",
    isEnabled: true,
    langCodes: {
      "zh-CN": "错误详情",
      "en-US": "Error Details",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件发送日志",
      "en-US": "Mail Send Log",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.basicInfo",
    isEnabled: true,
    langCodes: {
      "zh-CN": "基本信息",
      "en-US": "Basic Information",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.timeInfo",
    isEnabled: true,
    langCodes: {
      "zh-CN": "时间信息",
      "en-US": "Time Information",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.templateInfo",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板信息",
      "en-US": "Template Information",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.errorInfo",
    isEnabled: true,
    langCodes: {
      "zh-CN": "错误信息",
      "en-US": "Error Information",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.subject",
    isEnabled: true,
    langCodes: {
      "zh-CN": "标题",
      "en-US": "Subject",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.recipient",
    isEnabled: true,
    langCodes: {
      "zh-CN": "收件人",
      "en-US": "Recipient",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.sender",
    isEnabled: true,
    langCodes: {
      "zh-CN": "发件人",
      "en-US": "Sender",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.sendTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "发送时间",
      "en-US": "Send Time",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "我的",
      "en-US": "My Profile",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.changePassword.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "修改密码",
      "en-US": "Change Password",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.changePassword.confirmPasswordRequired",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确认密码必填",
      "en-US": "Confirm Password Required",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.table.currentPassword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "当前密码",
      "en-US": "Current Password",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.table.newPassword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "新密码",
      "en-US": "New Password",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.table.confirmPassword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确认新密码",
      "en-US": "Confirm New Password",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.subtitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "个人信息",
      "en-US": "Personal Information",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.region",
    isEnabled: true,
    langCodes: {
      "zh-CN": "国家/地区",
      "en-US": "Country/Region",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.department",
    isEnabled: true,
    langCodes: {
      "zh-CN": "部门",
      "en-US": "Department",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.role",
    isEnabled: true,
    langCodes: {
      "zh-CN": "角色",
      "en-US": "Role",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.accountStatus",
    isEnabled: true,
    langCodes: {
      "zh-CN": "账户状态",
      "en-US": "Account Status",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.changePassword.passwordFormatHint",
    isEnabled: true,
    langCodes: {
      "zh-CN": "密码长度7位~30位，至少包含一个字母和一个数字",
      "en-US":
        "Password length is from 7 to 30, and requires one word and one number at least",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.changePassword.sameAsOldPassword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "新密码不能与当前密码相同",
      "en-US": "New password cannot be the same as current password",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.changePassword.passwordMismatch",
    isEnabled: true,
    langCodes: {
      "zh-CN": "新密码与确认密码不匹配",
      "en-US": "New password and confirm password do not match",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.changePassword.success",
    isEnabled: true,
    langCodes: {
      "zh-CN": "密码修改成功",
      "en-US": "Password changed successfully",
    },
  },
  {
    application: "frontend",
    business: "system.user",
    tKey: "user.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "用户管理",
      "en-US": "User Management",
    },
  },
  {
    application: "frontend",
    business: "system.user",
    tKey: "user.table.password",
    isEnabled: true,
    langCodes: {
      "zh-CN": "密码",
      "en-US": "Password",
    },
  },
  {
    application: "frontend",
    business: "system.department",
    tKey: "department.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "部门管理",
      "en-US": "Department Management",
    },
  },
  {
    application: "frontend",
    business: "system.department",
    tKey: "department.table.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "名称",
      "en-US": "Name",
    },
  },
  {
    application: "frontend",
    business: "system.department",
    tKey: "department.table.managers",
    isEnabled: true,
    langCodes: {
      "zh-CN": "部门管理员",
      "en-US": "Department Managers",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.table.roleName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "角色名称",
      "en-US": "Role Name",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.table.permissions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限列表",
      "en-US": "Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.table.permissionsHelper",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限列表为JSON数组格式",
      "en-US": "Permissions list in JSON array format",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.dialog.addSubMenu",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加子菜单",
      "en-US": "Add Sub-menu",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.menuName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "菜单名称",
      "en-US": "Menu Name",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.customIcon",
    isEnabled: true,
    langCodes: {
      "zh-CN": "自定义图标 (Iconify格式)",
      "en-US": "Custom Icon (Iconify Format)",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.iconHelper",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: material-symbols:home",
      "en-US": "e.g., material-symbols:home",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.routePath",
    isEnabled: true,
    langCodes: {
      "zh-CN": "路由路径",
      "en-US": "Route Path",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.pathHelper",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: /system/menu",
      "en-US": "e.g., /system/menu",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.parentMenu",
    isEnabled: true,
    langCodes: {
      "zh-CN": "父菜单",
      "en-US": "Parent Menu",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.topLevelMenu",
    isEnabled: true,
    langCodes: {
      "zh-CN": "无 (顶级菜单)",
      "en-US": "None (Top Level)",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.sort",
    isEnabled: true,
    langCodes: {
      "zh-CN": "排序",
      "en-US": "Sort",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.sortHelper",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数字越小越靠前",
      "en-US": "Smaller numbers come first",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.menuNameRequired",
    isEnabled: true,
    langCodes: {
      "zh-CN": "菜单名称不能为空",
      "en-US": "Menu name is required",
    },
  },
  {
    application: "frontend",
    business: "system.department",
    tKey: "department.table.parentDepartment",
    isEnabled: true,
    langCodes: {
      "zh-CN": "上级部门",
      "en-US": "Parent Department",
    },
  },
  {
    application: "frontend",
    business: "system.department",
    tKey: "department.table.topLevelDepartment",
    isEnabled: true,
    langCodes: {
      "zh-CN": "无（顶级部门）",
      "en-US": "None (Top Level)",
    },
  },
  {
    application: "frontend",
    business: "system.department",
    tKey: "department.dialog.addChild",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加子部门",
      "en-US": "Add Sub-Department",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "菜单管理",
      "en-US": "Menu Management",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "角色管理",
      "en-US": "Role Management",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限管理",
      "en-US": "Permission Management",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.code",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限代码",
      "en-US": "Permission Code",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限名称",
      "en-US": "Permission Name",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.category",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限类别",
      "en-US": "Permission Category",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.category.menu",
    isEnabled: true,
    langCodes: {
      "zh-CN": "菜单",
      "en-US": "Menu",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.category.button",
    isEnabled: true,
    langCodes: {
      "zh-CN": "按钮",
      "en-US": "Button",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.category.api",
    isEnabled: true,
    langCodes: {
      "zh-CN": "接口",
      "en-US": "API",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.resource",
    isEnabled: true,
    langCodes: {
      "zh-CN": "资源路径",
      "en-US": "Resource Path",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.business",
    isEnabled: true,
    langCodes: {
      "zh-CN": "业务",
      "en-US": "Business",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "角色权限管理",
      "en-US": "Role Permission Management",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.batchAdd",
    isEnabled: true,
    langCodes: {
      "zh-CN": "批量添加权限",
      "en-US": "Batch Add Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.selectRole",
    isEnabled: true,
    langCodes: {
      "zh-CN": "选择角色",
      "en-US": "Select Role",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.selectPermissions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "选择权限",
      "en-US": "Select Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.availablePermissions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "可用权限",
      "en-US": "Available Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.noAvailablePermissions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂无可用权限",
      "en-US": "No Available Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.currentPermissions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "当前权限",
      "en-US": "Current Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.assignedPermission",
    isEnabled: true,
    langCodes: {
      "zh-CN": "已分配权限",
      "en-US": "Assigned Permission",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.noPermissions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂无权限",
      "en-US": "No Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.advancedSettings",
    isEnabled: true,
    langCodes: {
      "zh-CN": "高级设置",
      "en-US": "Advanced Settings",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.categoryFirst",
    isEnabled: true,
    langCodes: {
      "zh-CN": "类别优先",
      "en-US": "Category First",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.businessFirst",
    isEnabled: true,
    langCodes: {
      "zh-CN": "业务优先",
      "en-US": "Business First",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.otherCategory",
    isEnabled: true,
    langCodes: {
      "zh-CN": "其他",
      "en-US": "Other",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.keyword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关键词",
      "en-US": "Keyword",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.keywordPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "搜索角色或权限名称",
      "en-US": "Search role or permission name",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.filterByRole",
    isEnabled: true,
    langCodes: {
      "zh-CN": "按角色筛选",
      "en-US": "Filter by Role",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.filterByPermission",
    isEnabled: true,
    langCodes: {
      "zh-CN": "按权限筛选",
      "en-US": "Filter by Permission",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.batchDelete",
    isEnabled: true,
    langCodes: {
      "zh-CN": "批量删除",
      "en-US": "Batch Delete",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.confirmBatchDelete",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确定要删除选中的 {count} 个角色权限关联吗？",
      "en-US":
        "Are you sure you want to delete the selected {count} role-permission associations?",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.selectedItems",
    isEnabled: true,
    langCodes: {
      "zh-CN": "选中项目",
      "en-US": "Selected Items",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.andMore",
    isEnabled: true,
    langCodes: {
      "zh-CN": "等 {count} 个",
      "en-US": "and {count} more",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.hasFilter",
    isEnabled: true,
    langCodes: {
      "zh-CN": "有过滤条件",
      "en-US": "Has Filter",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.hasConditions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "有附加条件",
      "en-US": "Has Conditions",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.i18n",
    isEnabled: true,
    langCodes: {
      "zh-CN": "国际化",
      "en-US": "Internationalization",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.i18n.language",
    isEnabled: true,
    langCodes: {
      "zh-CN": "国际化语言",
      "en-US": "Internationalization Language",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.i18n.region",
    isEnabled: true,
    langCodes: {
      "zh-CN": "国际化地区",
      "en-US": "Internationalization Region",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.i18n.translation",
    isEnabled: true,
    langCodes: {
      "zh-CN": "国际化翻译",
      "en-US": "Internationalization Translation",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.mail",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件",
      "en-US": "Mail",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.mail.account",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件账户",
      "en-US": "Mail Account",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.mail.template",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件模板",
      "en-US": "Mail Template",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.mail.action",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件操作",
      "en-US": "Mail Action",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.mail.log",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件日志",
      "en-US": "Mail Log",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.maintenance",
    isEnabled: true,
    langCodes: {
      "zh-CN": "运维",
      "en-US": "Operation Maintenance",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.maintenance.cache",
    isEnabled: true,
    langCodes: {
      "zh-CN": "运维缓存",
      "en-US": "Operation Maintenance Cache",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.maintenance.compliance",
    isEnabled: true,
    langCodes: {
      "zh-CN": "运维合规",
      "en-US": "Operation Maintenance Compliance",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.system",
    isEnabled: true,
    langCodes: {
      "zh-CN": "系统",
      "en-US": "System",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.system.auth",
    isEnabled: true,
    langCodes: {
      "zh-CN": "系统鉴权",
      "en-US": "System Auth",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.system.department",
    isEnabled: true,
    langCodes: {
      "zh-CN": "系统部门",
      "en-US": "System Department",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.system.menu",
    isEnabled: true,
    langCodes: {
      "zh-CN": "系统菜单",
      "en-US": "System Menu",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.system.permission",
    isEnabled: true,
    langCodes: {
      "zh-CN": "系统权限",
      "en-US": "System Permission",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.system.role",
    isEnabled: true,
    langCodes: {
      "zh-CN": "系统角色",
      "en-US": "System Role",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.system.role_permission",
    isEnabled: true,
    langCodes: {
      "zh-CN": "系统角色权限",
      "en-US": "System Role Permission",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.system.user",
    isEnabled: true,
    langCodes: {
      "zh-CN": "系统用户",
      "en-US": "System User",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.oss",
    isEnabled: true,
    langCodes: {
      "zh-CN": "对象存储",
      "en-US": "Object Storage",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.oss.config",
    isEnabled: true,
    langCodes: {
      "zh-CN": "存储配置",
      "en-US": "OSS Config",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.oss.file",
    isEnabled: true,
    langCodes: {
      "zh-CN": "文件管理",
      "en-US": "File Management",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.enterprise",
    isEnabled: true,
    langCodes: {
      "zh-CN": "企业管理",
      "en-US": "Enterprise",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.enterprise.attendance",
    isEnabled: true,
    langCodes: {
      "zh-CN": "考勤管理",
      "en-US": "Attendance",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.swarm",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Swarm集群",
      "en-US": "Swarm Cluster",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.swarm.docker",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Docker服务",
      "en-US": "Docker Service",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.table.dataScope",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据范围",
      "en-US": "Data Scope",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.dataScope.all",
    isEnabled: true,
    langCodes: {
      "zh-CN": "全部数据",
      "en-US": "All Data",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.dataScope.dept_and_below",
    isEnabled: true,
    langCodes: {
      "zh-CN": "本部门及以下数据",
      "en-US": "Dept & Below Data",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.dataScope.self_only",
    isEnabled: true,
    langCodes: {
      "zh-CN": "仅本人数据",
      "en-US": "Self Only",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.dataScope.custom",
    isEnabled: true,
    langCodes: {
      "zh-CN": "自定义部门",
      "en-US": "Custom Departments",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.dataScope.customDeptIds",
    isEnabled: true,
    langCodes: {
      "zh-CN": "自定义部门ID",
      "en-US": "Custom Departments IDs",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.maintenance",
    isEnabled: true,
    langCodes: {
      "zh-CN": "运维",
      "en-US": "Maintenance",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.maintenance.cache",
    isEnabled: true,
    langCodes: {
      "zh-CN": "缓存",
      "en-US": "Cache",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.maintenance.openapi",
    isEnabled: true,
    langCodes: {
      "zh-CN": "接口文档",
      "en-US": "API Docs",
    },
  },
  {
    application: "frontend",
    business: "maintenance",
    tKey: "openapi.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "接口文档",
      "en-US": "API Documentation",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "缓存管理",
      "en-US": "Cache Management",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.columns.namespace",
    isEnabled: true,
    langCodes: {
      "zh-CN": "命名空间",
      "en-US": "Namespace",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.columns.keyCount",
    isEnabled: true,
    langCodes: {
      "zh-CN": "键数量",
      "en-US": "Key Count",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.columns.ttl",
    isEnabled: true,
    langCodes: {
      "zh-CN": "过期时间",
      "en-US": "TTL",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.columns.key",
    isEnabled: true,
    langCodes: {
      "zh-CN": "键名",
      "en-US": "Key",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.filter.namespace",
    isEnabled: true,
    langCodes: {
      "zh-CN": "命名空间",
      "en-US": "Namespace",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.filter.namespacePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "输入命名空间名称",
      "en-US": "Enter namespace name",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.filter.keyPrefix",
    isEnabled: true,
    langCodes: {
      "zh-CN": "键名前缀",
      "en-US": "Key Prefix",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.filter.keyPrefixPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "输入键名前缀筛选",
      "en-US": "Enter key prefix to filter",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.currentNamespace",
    isEnabled: true,
    langCodes: {
      "zh-CN": "当前命名空间",
      "en-US": "Current Namespace",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.actions.viewKeys",
    isEnabled: true,
    langCodes: {
      "zh-CN": "查看键值",
      "en-US": "View Keys",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.actions.backToNamespaces",
    isEnabled: true,
    langCodes: {
      "zh-CN": "返回命名空间列表",
      "en-US": "Back to Namespaces",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.actions.add",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加缓存",
      "en-US": "Add Cache",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.addTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加缓存",
      "en-US": "Add Cache",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.editTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "编辑缓存",
      "en-US": "Edit Cache",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.namespace",
    isEnabled: true,
    langCodes: {
      "zh-CN": "命名空间",
      "en-US": "Namespace",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.key",
    isEnabled: true,
    langCodes: {
      "zh-CN": "键名",
      "en-US": "Key",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.keyPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "输入缓存键名",
      "en-US": "Enter cache key",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.value",
    isEnabled: true,
    langCodes: {
      "zh-CN": "值",
      "en-US": "Value",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.valuePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "输入缓存值",
      "en-US": "Enter cache value",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.valueHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "支持文本或 JSON 格式",
      "en-US": "Supports text or JSON format",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.ttl",
    isEnabled: true,
    langCodes: {
      "zh-CN": "过期时间（秒）",
      "en-US": "TTL (seconds)",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.ttlPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "留空则永久保存",
      "en-US": "Leave empty for permanent",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.ttlHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "设置缓存过期时间，单位：秒",
      "en-US": "Set cache expiration time in seconds",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.deleteConfirm",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确定要删除此缓存项吗？",
      "en-US": "Are you sure you want to delete this cache item?",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.saving",
    isEnabled: true,
    langCodes: {
      "zh-CN": "保存中",
      "en-US": "Saving",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.collapseAll",
    isEnabled: true,
    langCodes: {
      "zh-CN": "折叠所有",
      "en-US": "Collapse All",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.expandAll",
    isEnabled: true,
    langCodes: {
      "zh-CN": "展开所有",
      "en-US": "Expand All",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.filter",
    isEnabled: true,
    langCodes: {
      "zh-CN": "筛选",
      "en-US": "Filter",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.results",
    isEnabled: true,
    langCodes: {
      "zh-CN": "个结果",
      "en-US": "results",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.searching",
    isEnabled: true,
    langCodes: {
      "zh-CN": "搜索中...",
      "en-US": "Searching...",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.permanent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "永久",
      "en-US": "Permanent",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.view",
    isEnabled: true,
    langCodes: {
      "zh-CN": "查看",
      "en-US": "View",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.edit",
    isEnabled: true,
    langCodes: {
      "zh-CN": "编辑",
      "en-US": "Edit",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.delete",
    isEnabled: true,
    langCodes: {
      "zh-CN": "删除",
      "en-US": "Delete",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.cancel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "取消",
      "en-US": "Cancel",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.submit",
    isEnabled: true,
    langCodes: {
      "zh-CN": "提交",
      "en-US": "Submit",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.submitting",
    isEnabled: true,
    langCodes: {
      "zh-CN": "提交中...",
      "en-US": "Submitting...",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.loading",
    isEnabled: true,
    langCodes: {
      "zh-CN": "加载中...",
      "en-US": "Loading...",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.deleting",
    isEnabled: true,
    langCodes: {
      "zh-CN": "删除中...",
      "en-US": "Deleting...",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "common.confirmDelete",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确认删除",
      "en-US": "Confirm Delete",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "columns.actions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "操作",
      "en-US": "Actions",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "sidebar.menu.maintenance.auditLogin",
    isEnabled: true,
    langCodes: {
      "zh-CN": "登录审计",
      "en-US": "Login Audit",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "maintenance.auditLogin.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "登录审计日志",
      "en-US": "Login Audit Log",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "maintenance.auditLogin.column.userId",
    isEnabled: true,
    langCodes: {
      "zh-CN": "用户ID",
      "en-US": "User ID",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "maintenance.auditLogin.column.loginTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "登录时间",
      "en-US": "Login Time",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "maintenance.auditLogin.column.ip",
    isEnabled: true,
    langCodes: {
      "zh-CN": "IP地址",
      "en-US": "IP Address",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "maintenance.auditLogin.column.userAgent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "浏览器/设备",
      "en-US": "User Agent",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "businessType.maintenance.audit_login",
    isEnabled: true,
    langCodes: {
      "zh-CN": "登录审计",
      "en-US": "Login Audit",
    },
  },
  {
    application: "frontend",
    business: "maintenance.init",
    tKey: "maintenance.init.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据库初始化",
      "en-US": "Database Initialization",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission.tree",
    tKey: "system.rolePermission.tree.selectRole",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请先选择角色",
      "en-US": "Please select a role first",
    },
  },
  {
    application: "frontend",
    business: "oss.config",
    tKey: "oss.config.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "OSS 配置",
      "en-US": "OSS Configuration",
    },
  },
  {
    application: "frontend",
    business: "oss.config",
    tKey: "oss.config.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "配置名称",
      "en-US": "Config Name",
    },
  },
  {
    application: "frontend",
    business: "oss.config",
    tKey: "oss.config.provider",
    isEnabled: true,
    langCodes: {
      "zh-CN": "提供商",
      "en-US": "Provider",
    },
  },
  {
    application: "frontend",
    business: "oss.config",
    tKey: "oss.config.endpoint",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Endpoint",
      "en-US": "Endpoint",
    },
  },
  {
    application: "frontend",
    business: "oss.config",
    tKey: "oss.config.region",
    isEnabled: true,
    langCodes: {
      "zh-CN": "区域",
      "en-US": "Region",
    },
  },
  {
    application: "frontend",
    business: "oss.config",
    tKey: "oss.config.accessKey",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Access Key",
      "en-US": "Access Key",
    },
  },
  {
    application: "frontend",
    business: "oss.config",
    tKey: "oss.config.secretKey",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Secret Key",
      "en-US": "Secret Key",
    },
  },
  {
    application: "frontend",
    business: "oss.config",
    tKey: "oss.config.bucket",
    isEnabled: true,
    langCodes: {
      "zh-CN": "存储桶",
      "en-US": "Bucket",
    },
  },
  {
    application: "frontend",
    business: "oss.config",
    tKey: "oss.config.isDefault",
    isEnabled: true,
    langCodes: {
      "zh-CN": "默认",
      "en-US": "Is Default",
    },
  },
  {
    application: "frontend",
    business: "oss.config",
    tKey: "oss.config.verify",
    isEnabled: true,
    langCodes: {
      "zh-CN": "验证连接",
      "en-US": "Verify",
    },
  },
  {
    application: "frontend",
    business: "oss.file",
    tKey: "oss.file.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "文件中心",
      "en-US": "File Center",
    },
  },
  {
    application: "frontend",
    business: "oss.file",
    tKey: "oss.file.upload",
    isEnabled: true,
    langCodes: {
      "zh-CN": "上传文件",
      "en-US": "Upload File",
    },
  },
  {
    application: "frontend",
    business: "oss.file",
    tKey: "oss.file.download",
    isEnabled: true,
    langCodes: {
      "zh-CN": "下载文件",
      "en-US": "Download File",
    },
  },
  {
    application: "frontend",
    business: "oss.file",
    tKey: "oss.file.copyUrl",
    isEnabled: true,
    langCodes: {
      "zh-CN": "复制链接",
      "en-US": "Copy URL",
    },
  },
  {
    application: "frontend",
    business: "oss.file",
    tKey: "oss.file.key",
    isEnabled: true,
    langCodes: {
      "zh-CN": "文件对象",
      "en-US": "Object Key",
    },
  },
  {
    application: "frontend",
    business: "oss.file",
    tKey: "oss.file.size",
    isEnabled: true,
    langCodes: {
      "zh-CN": "大小",
      "en-US": "Size",
    },
  },
  {
    application: "frontend",
    business: "oss.file",
    tKey: "oss.file.lastModified",
    isEnabled: true,
    langCodes: {
      "zh-CN": "最后修改",
      "en-US": "Last Modified",
    },
  },
  {
    application: "frontend",
    business: "oss.file",
    tKey: "oss.file.getDownloadUrl",
    isEnabled: true,
    langCodes: {
      "zh-CN": "获取下载链接",
      "en-US": "Get Download Link",
    },
  },
  {
    application: "frontend",
    business: "oss.config",
    tKey: "oss.config.accountId",
    isEnabled: true,
    langCodes: {
      "zh-CN": "账户ID",
      "en-US": "Account ID",
    },
  },
  {
    application: "frontend",
    business: "system",
    tKey: "sidebar.menu.oss",
    isEnabled: true,
    langCodes: {
      "zh-CN": "存储管理",
      "en-US": "Storage",
    },
  },
  {
    application: "frontend",
    business: "system",
    tKey: "sidebar.menu.oss.config",
    isEnabled: true,
    langCodes: {
      "zh-CN": "配置管理",
      "en-US": "Config Management",
    },
  },
  {
    application: "frontend",
    business: "system",
    tKey: "sidebar.menu.oss.file",
    isEnabled: true,
    langCodes: {
      "zh-CN": "文件中心",
      "en-US": "File Center",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.enterprise",
    isEnabled: true,
    langCodes: {
      "zh-CN": "企业管理",
      "en-US": "Enterprise",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "sidebar.menu.enterprise.attendance",
    isEnabled: true,
    langCodes: {
      "zh-CN": "考勤管理",
      "en-US": "Attendance",
    },
  },
  {
    application: "frontend",
    business: "business.type",
    tKey: "businessType.enterprise.attendance",
    isEnabled: true,
    langCodes: {
      "zh-CN": "企业考勤",
      "en-US": "Enterprise Attendance",
    },
  },
  {
    application: "frontend",
    business: "enterprise.attendance",
    tKey: "enterprise.attendance.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "考勤管理",
      "en-US": "Attendance Management",
    },
  },
  {
    application: "frontend",
    business: "enterprise.attendance",
    tKey: "enterprise.attendance.employee",
    isEnabled: true,
    langCodes: {
      "zh-CN": "员工",
      "en-US": "Employee",
    },
  },
  {
    application: "frontend",
    business: "enterprise.attendance",
    tKey: "enterprise.attendance.date",
    isEnabled: true,
    langCodes: {
      "zh-CN": "考勤日期",
      "en-US": "Attendance Date",
    },
  },
  {
    application: "frontend",
    business: "enterprise.attendance",
    tKey: "enterprise.attendance.checkInTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "签到时间",
      "en-US": "Check-in Time",
    },
  },
  {
    application: "frontend",
    business: "enterprise.attendance",
    tKey: "enterprise.attendance.checkOutTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "签退时间",
      "en-US": "Check-out Time",
    },
  },
  {
    application: "frontend",
    business: "enterprise.attendance",
    tKey: "enterprise.attendance.status",
    isEnabled: true,
    langCodes: {
      "zh-CN": "考勤状态",
      "en-US": "Attendance Status",
    },
  },
  {
    application: "frontend",
    business: "enterprise.attendance",
    tKey: "enterprise.attendance.status.normal",
    isEnabled: true,
    langCodes: {
      "zh-CN": "正常",
      "en-US": "Normal",
    },
  },
  {
    application: "frontend",
    business: "enterprise.attendance",
    tKey: "enterprise.attendance.status.late",
    isEnabled: true,
    langCodes: {
      "zh-CN": "迟到",
      "en-US": "Late",
    },
  },
  {
    application: "frontend",
    business: "enterprise.attendance",
    tKey: "enterprise.attendance.status.earlyLeave",
    isEnabled: true,
    langCodes: {
      "zh-CN": "早退",
      "en-US": "Early Leave",
    },
  },
  {
    application: "frontend",
    business: "enterprise.attendance",
    tKey: "enterprise.attendance.status.absent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "旷工",
      "en-US": "Absent",
    },
  },
  {
    application: "frontend",
    business: "enterprise.attendance",
    tKey: "enterprise.attendance.exportCsv",
    isEnabled: true,
    langCodes: {
      "zh-CN": "导出 CSV",
      "en-US": "Export CSV",
    },
  },
  {
    application: "frontend",
    business: "enterprise.attendance",
    tKey: "enterprise.attendance.detailTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "考勤详情",
      "en-US": "Attendance Details",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.i18n.language.duplicateLangCode",
    isEnabled: true,
    langCodes: {
      "zh-CN": "该语言代码已存在",
      "en-US": "Language code already exists",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.i18n.region.duplicateCode",
    isEnabled: true,
    langCodes: {
      "zh-CN": "该国家/地区代码已存在（alpha2、alpha3 或 numeric 重复）",
      "en-US":
        "Region code already exists (duplicate alpha2, alpha3, or numeric)",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.i18n.translation.duplicateTKey",
    isEnabled: true,
    langCodes: {
      "zh-CN": "该翻译键在同一语言下已存在",
      "en-US": "Translation key already exists for this language",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.oss.config.duplicateName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "存储配置名称已存在",
      "en-US": "OSS configuration name already exists",
    },
  },
  {
    application: "backend",
    business: "business.exception",
    tKey: "errorHandler.oss.config.initFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "无法初始化存储实例，请检查配置信息或运行环境",
      "en-US":
        "Failed to initialize storage instance. Please check configuration or environment.",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.category.menu",
    isEnabled: true,
    langCodes: {
      "zh-CN": "菜单",
      "en-US": "Menu",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.category.action",
    isEnabled: true,
    langCodes: {
      "zh-CN": "动作",
      "en-US": "Action",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.system.schema_form",
    isEnabled: true,
    langCodes: {
      "zh-CN": "动态表单配置",
      "en-US": "Schema Form Config",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.system.schema_form_data",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单提交数据",
      "en-US": "Schema Form Data",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.ai",
    isEnabled: true,
    langCodes: {
      "zh-CN": "AI",
      "en-US": "AI",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.ai.config",
    isEnabled: true,
    langCodes: {
      "zh-CN": "AI配置",
      "en-US": "AI Config",
    },
  },
  {
    application: "frontend",
    business: "infra.businessType",
    tKey: "businessType.ai.chat",
    isEnabled: true,
    langCodes: {
      "zh-CN": "AI对话",
      "en-US": "AI Chat",
    },
  },
  // --- 动态表单配置多语言 (Schema Form Config) ---
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "动态表单配置",
      "en-US": "Schema Form Config",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.searchPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "搜索名称或编码...",
      "en-US": "Search name or code...",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.code",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单编码",
      "en-US": "Form Code",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单名称",
      "en-US": "Form Name",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.actions.add",
    isEnabled: true,
    langCodes: {
      "zh-CN": "新增配置",
      "en-US": "Add Configuration",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.actions.preview",
    isEnabled: true,
    langCodes: {
      "zh-CN": "预览与校验测试",
      "en-US": "Preview & Test",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.deleteConfirmText",
    isEnabled: true,
    langCodes: {
      "zh-CN":
        "确定要删除动态表单配置吗？此操作不可撤销，且会影响已提交的关联数据还原。",
      "en-US":
        "Are you sure you want to delete this form config? This cannot be undone and affects submitted data.",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.errors.invalidObject",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Schema 必须是合法的 JSON 对象",
      "en-US": "Schema must be a valid JSON object",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.errors.invalidUiObject",
    isEnabled: true,
    langCodes: {
      "zh-CN": "UI Schema 必须是合法的 JSON 对象",
      "en-US": "UI Schema must be a valid JSON object",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.errors.invalidJson",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请输入合法的 JSON 格式字符串",
      "en-US": "Please enter a valid JSON format string",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.editTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "编辑动态表单配置",
      "en-US": "Edit Schema Form Configuration",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.addTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "新增动态表单配置",
      "en-US": "Add Schema Form Configuration",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.quickTemplate",
    isEnabled: true,
    langCodes: {
      "zh-CN": "快速套用预设模板",
      "en-US": "Quick Preset Template",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.selectTemplate",
    isEnabled: true,
    langCodes: {
      "zh-CN": "-- 选择模板 --",
      "en-US": "-- Select Template --",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.templates.feedback",
    isEnabled: true,
    langCodes: {
      "zh-CN": "用户意见反馈表",
      "en-US": "User Feedback Template",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.templates.rsvp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "活动报名登记表",
      "en-US": "Activity RSVP Template",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.fields.code",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单唯一编码",
      "en-US": "Unique Form Code",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.fields.codePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: customer_survey (仅支持英文字母、数字、下划线和连字符)",
      "en-US":
        "e.g. customer_survey (Letters, numbers, underscores, hyphens only)",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.fields.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单名称",
      "en-US": "Form Name",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.fields.namePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: 客户满意度回访表",
      "en-US": "e.g. Customer Satisfaction Survey",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.fields.schemaData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "JSON Schema 配置数据",
      "en-US": "JSON Schema Data",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.fields.uiSchemaData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "UI Schema 配置数据 (可选)",
      "en-US": "UI Schema Data (Optional)",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.fields.remarkPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请输入备注描述",
      "en-US": "Please enter remark description",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.errors.parseSchemaFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "无法解析该表单的 JSON Schema，请检查配置是否正确。",
      "en-US": "Unable to parse JSON Schema, please check config.",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.errors.submitValidationFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据提交校验失败，请检查填写内容。",
      "en-US": "Validation failed, please check inputs.",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.previewTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单预览与提交测试",
      "en-US": "Form Preview & Submission Test",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.testSubmitSuccess",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据提交测试成功！已写入/更新 system_schema_form_data 关联表。",
      "en-US": "Submission success! Saved to system_schema_form_data.",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.fields.testBusinessId",
    isEnabled: true,
    langCodes: {
      "zh-CN": "测试关联业务 ID (Business ID)",
      "en-US": "Test Business ID",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.fields.testBusinessIdPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请输入用于归属的业务主键 ID",
      "en-US": "Please enter Business ID",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.submitTestData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "提交测试数据",
      "en-US": "Submit Test Data",
    },
  },
  {
    application: "frontend",
    business: "schemaForm",
    tKey: "schemaForm.errors.noValidSchema",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未配置有效的 JSON Schema",
      "en-US": "No valid JSON Schema configured",
    },
  },
  // --- 表单提交数据多语言 (Schema Form Data) ---
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单提交数据",
      "en-US": "Schema Form Data",
    },
  },
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.filter.associatedForm",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关联动态表单",
      "en-US": "Associated Schema Form",
    },
  },
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.filter.allForms",
    isEnabled: true,
    langCodes: {
      "zh-CN": "-- 全部表单 --",
      "en-US": "-- All Forms --",
    },
  },
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.filter.businessId",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关联业务 ID",
      "en-US": "Associated Business ID",
    },
  },
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.filter.businessIdPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请输入业务 ID 过滤",
      "en-US": "Please enter Business ID to filter",
    },
  },
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.errors.noSchemaConfig",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未找到该表单的 Schema 配置数据",
      "en-US": "Schema config data not found for this form",
    },
  },
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.errors.fallbackToRaw",
    isEnabled: true,
    langCodes: {
      "zh-CN": "无法加载原表单配置，已为您降级为原始提交数据展示。",
      "en-US": "Cannot load form config. Falling back to raw JSON.",
    },
  },
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.detailsTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据提交详情",
      "en-US": "Submitted Data Details",
    },
  },
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.rawJsonData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "原始提交数据 (JSON)",
      "en-US": "Raw Submitted Data (JSON)",
    },
  },
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.actions.view",
    isEnabled: true,
    langCodes: {
      "zh-CN": "查看详情",
      "en-US": "View Details",
    },
  },
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.actions.delete",
    isEnabled: true,
    langCodes: {
      "zh-CN": "删除记录",
      "en-US": "Delete Record",
    },
  },
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.deleteConfirmText",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确定要删除此条提交的动态表单数据记录吗？此操作不可逆。",
      "en-US":
        "Are you sure you want to delete this submitted form data? This is irreversible.",
    },
  },
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.dataSummary",
    isEnabled: true,
    langCodes: {
      "zh-CN": "提交数据概要",
      "en-US": "Submitted Data Summary",
    },
  },
  {
    application: "frontend",
    business: "schemaFormData",
    tKey: "schemaFormData.submittedData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "提交数据",
      "en-US": "Submitted Data",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "column.creatorName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "创建人",
      "en-US": "Creator",
    },
  },
  {
    application: "frontend",
    business: "components",
    tKey: "column.updaterName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "修改人",
      "en-US": "Updater",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "sidebar.menu.swarm",
    isEnabled: true,
    langCodes: {
      "zh-CN": "集群管理",
      "en-US": "Swarm Cluster",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "sidebar.menu.swarm.docker",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Docker",
      "en-US": "Docker",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Docker Swarm 服务",
      "en-US": "Docker Swarm Services",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.pause",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂停服务",
      "en-US": "Pause Service",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.play",
    isEnabled: true,
    langCodes: {
      "zh-CN": "恢复服务",
      "en-US": "Resume Service",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.searchPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "输入服务名称筛选...",
      "en-US": "Enter service name to filter...",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.searchLabel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "服务名称搜索",
      "en-US": "Service Name Search",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.id",
    isEnabled: true,
    langCodes: {
      "zh-CN": "服务 ID",
      "en-US": "Service ID",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "服务名称",
      "en-US": "Service Name",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.image",
    isEnabled: true,
    langCodes: {
      "zh-CN": "容器镜像",
      "en-US": "Container Image",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.replicas",
    isEnabled: true,
    langCodes: {
      "zh-CN": "副本数",
      "en-US": "Replicas",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.createdAt",
    isEnabled: true,
    langCodes: {
      "zh-CN": "创建时间",
      "en-US": "Created Time",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.detailTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Swarm 服务配置详情",
      "en-US": "Swarm Service Configuration Detail",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.environment",
    isEnabled: true,
    langCodes: {
      "zh-CN": "容器运行环境变量",
      "en-US": "Container Environment Variables",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.addEnv",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加环境变量",
      "en-US": "Add Environment Variable",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.key",
    isEnabled: true,
    langCodes: {
      "zh-CN": "变量键名 (Key)",
      "en-US": "Variable Key",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.value",
    isEnabled: true,
    langCodes: {
      "zh-CN": "变量键值 (Value)",
      "en-US": "Variable Value",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.globalMode",
    isEnabled: true,
    langCodes: {
      "zh-CN": "全局调度模式 (Global)",
      "en-US": "Global Mode (Scheduler)",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.namePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: web-nginx",
      "en-US": "e.g. web-nginx",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.imagePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: nginx:latest",
      "en-US": "e.g. nginx:latest",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.keyPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "变量键名",
      "en-US": "Variable Key",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.valuePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "变量键值",
      "en-US": "Variable Value",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.noEnv",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂未添加任何环境变量",
      "en-US": "No environment variables added yet",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.basicInfo",
    isEnabled: true,
    langCodes: {
      "zh-CN": "基本信息",
      "en-US": "Basic Information",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.version",
    isEnabled: true,
    langCodes: {
      "zh-CN": "配置版本",
      "en-US": "Configuration Version",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.updatedAt",
    isEnabled: true,
    langCodes: {
      "zh-CN": "更新时间",
      "en-US": "Updated Time",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.rawConfig",
    isEnabled: true,
    langCodes: {
      "zh-CN": "原始配置 JSON",
      "en-US": "Raw Configuration JSON",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.close",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关闭",
      "en-US": "Close",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.ports",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暴露端口映射 (Port Mappings)",
      "en-US": "Port Exposure Mappings",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.addPort",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加端口映射",
      "en-US": "Add Port Mapping",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.pubPort",
    isEnabled: true,
    langCodes: {
      "zh-CN": "外部发布端口",
      "en-US": "Published Port",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.targetPort",
    isEnabled: true,
    langCodes: {
      "zh-CN": "内部容器端口",
      "en-US": "Target Container Port",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.protocol",
    isEnabled: true,
    langCodes: {
      "zh-CN": "网络协议",
      "en-US": "Protocol",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.pubPortPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: 80",
      "en-US": "e.g. 80",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.targetPortPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: 80",
      "en-US": "e.g. 80",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.noPorts",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂未公开任何容器端口",
      "en-US": "No ports exposed yet",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.refresh",
    isEnabled: true,
    langCodes: {
      "zh-CN": "刷新数据",
      "en-US": "Refresh Data",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.tailLines",
    isEnabled: true,
    langCodes: {
      "zh-CN": "日志行数",
      "en-US": "Tail Lines",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.loadingLogs",
    isEnabled: true,
    langCodes: {
      "zh-CN": "正在拉取服务日志...",
      "en-US": "Fetching service logs...",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.noLogs",
    isEnabled: true,
    langCodes: {
      "zh-CN": "当前服务暂无任何日志输出",
      "en-US": "No logs output found for this service",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.metrics",
    isEnabled: true,
    langCodes: {
      "zh-CN": "运行负载",
      "en-US": "Runtime Metrics",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.cpuUsage",
    isEnabled: true,
    langCodes: {
      "zh-CN": "CPU 使用率",
      "en-US": "CPU Usage",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.memUsage",
    isEnabled: true,
    langCodes: {
      "zh-CN": "内存占用",
      "en-US": "Memory Usage",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.netTraffic",
    isEnabled: true,
    langCodes: {
      "zh-CN": "网络流量",
      "en-US": "Network Traffic",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.diskIO",
    isEnabled: true,
    langCodes: {
      "zh-CN": "磁盘 I/O",
      "en-US": "Disk I/O",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.rx",
    isEnabled: true,
    langCodes: {
      "zh-CN": "入流量",
      "en-US": "Inbound (Rx)",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.tx",
    isEnabled: true,
    langCodes: {
      "zh-CN": "出流量",
      "en-US": "Outbound (Tx)",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.read",
    isEnabled: true,
    langCodes: {
      "zh-CN": "读取",
      "en-US": "Read",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.write",
    isEnabled: true,
    langCodes: {
      "zh-CN": "写入",
      "en-US": "Write",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.loadingMetrics",
    isEnabled: true,
    langCodes: {
      "zh-CN": "正在收集实时负载指标...",
      "en-US": "Fetching real-time metrics...",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.noMetrics",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未能成功收集负载，可能任务副本正处于休眠或迁移中",
      "en-US":
        "No metrics available. The tasks might be starting or migrating.",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.taskId",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务实例",
      "en-US": "Task Instance",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.docker.logsTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "容器日志控制台",
      "en-US": "Container Logs Console",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "sidebar.menu.swarm.nodes",
    isEnabled: true,
    langCodes: {
      "zh-CN": "节点列表",
      "en-US": "Nodes",
    },
  },
  {
    application: "backend",
    business: "swarm",
    tKey: "businessType.swarm.nodes",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Swarm 节点管理",
      "en-US": "Swarm Nodes",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.id",
    isEnabled: true,
    langCodes: {
      "zh-CN": "节点 ID",
      "en-US": "Node ID",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.hostname",
    isEnabled: true,
    langCodes: {
      "zh-CN": "主机名称",
      "en-US": "Hostname",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.role",
    isEnabled: true,
    langCodes: {
      "zh-CN": "节点角色",
      "en-US": "Role",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.status",
    isEnabled: true,
    langCodes: {
      "zh-CN": "节点状态",
      "en-US": "Status",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.availability",
    isEnabled: true,
    langCodes: {
      "zh-CN": "调度可用性",
      "en-US": "Availability",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.ip",
    isEnabled: true,
    langCodes: {
      "zh-CN": "节点 IP",
      "en-US": "IP Address",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.engineVersion",
    isEnabled: true,
    langCodes: {
      "zh-CN": "引擎版本",
      "en-US": "Engine Version",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.cpus",
    isEnabled: true,
    langCodes: {
      "zh-CN": "CPU 核心",
      "en-US": "CPU Cores",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.memory",
    isEnabled: true,
    langCodes: {
      "zh-CN": "物理内存",
      "en-US": "Memory",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.taskCount",
    isEnabled: true,
    langCodes: {
      "zh-CN": "运行副本数",
      "en-US": "Running Tasks",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.allocatedCpus",
    isEnabled: true,
    langCodes: {
      "zh-CN": "已分配 CPU",
      "en-US": "Allocated CPUs",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.allocatedMemory",
    isEnabled: true,
    langCodes: {
      "zh-CN": "已分配内存",
      "en-US": "Allocated Memory",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.allocatedRatio",
    isEnabled: true,
    langCodes: {
      "zh-CN": "分配率",
      "en-US": "Allocation Ratio",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.manager",
    isEnabled: true,
    langCodes: {
      "zh-CN": "管理节点",
      "en-US": "Manager",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.worker",
    isEnabled: true,
    langCodes: {
      "zh-CN": "工作节点",
      "en-US": "Worker",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.active",
    isEnabled: true,
    langCodes: {
      "zh-CN": "激活调度",
      "en-US": "Active",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.drain",
    isEnabled: true,
    langCodes: {
      "zh-CN": "下线排空",
      "en-US": "Drain",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.pause",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂停调度",
      "en-US": "Pause",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.ready",
    isEnabled: true,
    langCodes: {
      "zh-CN": "就绪",
      "en-US": "Ready",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.down",
    isEnabled: true,
    langCodes: {
      "zh-CN": "离线",
      "en-US": "Down",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.disconnected",
    isEnabled: true,
    langCodes: {
      "zh-CN": "断开连接",
      "en-US": "Disconnected",
    },
  },
  {
    application: "frontend",
    business: "swarm",
    tKey: "swarm.nodes.details",
    isEnabled: true,
    langCodes: {
      "zh-CN": "节点详细配置",
      "en-US": "Node JSON Details",
    },
  },
] as const satisfies BatchTranslationItem[];
