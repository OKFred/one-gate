import type { TranslationInputItem } from "@/db/initTranslation";
import type { BusinessKey } from "@/types/business";

export const enterpriseTranslations = {
  "enterprise.attendance": [
    {
      tKey: "enterprise.attendance.title",
      langCodes: {
        "zh-CN": "考勤管理",
        "en-US": "Attendance Management",
      },
    },
    {
      tKey: "enterprise.attendance.employee",
      langCodes: {
        "zh-CN": "员工",
        "en-US": "Employee",
      },
    },
    {
      tKey: "enterprise.attendance.date",
      langCodes: {
        "zh-CN": "考勤日期",
        "en-US": "Attendance Date",
      },
    },
    {
      tKey: "enterprise.attendance.checkInTime",
      langCodes: {
        "zh-CN": "签到时间",
        "en-US": "Check-in Time",
      },
    },
    {
      tKey: "enterprise.attendance.checkOutTime",
      langCodes: {
        "zh-CN": "签退时间",
        "en-US": "Check-out Time",
      },
    },
    {
      tKey: "enterprise.attendance.status",
      langCodes: {
        "zh-CN": "考勤状态",
        "en-US": "Attendance Status",
      },
    },
    {
      tKey: "enterprise.attendance.status.normal",
      langCodes: {
        "zh-CN": "正常",
        "en-US": "Normal",
      },
    },
    {
      tKey: "enterprise.attendance.status.late",
      langCodes: {
        "zh-CN": "迟到",
        "en-US": "Late",
      },
    },
    {
      tKey: "enterprise.attendance.status.earlyLeave",
      langCodes: {
        "zh-CN": "早退",
        "en-US": "Early Leave",
      },
    },
    {
      tKey: "enterprise.attendance.status.absent",
      langCodes: {
        "zh-CN": "旷工",
        "en-US": "Absent",
      },
    },
    {
      tKey: "enterprise.attendance.exportCsv",
      langCodes: {
        "zh-CN": "导出 CSV",
        "en-US": "Export CSV",
      },
    },
    {
      tKey: "enterprise.attendance.detailTitle",
      langCodes: {
        "zh-CN": "考勤详情",
        "en-US": "Attendance Details",
      },
    },
  ],
  "maintenance.api_docs": [
    {
      tKey: "errorHandler.apiDocs.invalidFormat",
      langCodes: {
        "zh-CN": "文档格式错误，无法解析为 JSON 或 YAML",
        "en-US": "Document format error, cannot be parsed as JSON or YAML",
      },
    },
    {
      tKey: "errorHandler.apiDocs.unsupportedFormat",
      langCodes: {
        "zh-CN": "不支持的文档格式，仅支持 Swagger 2.0 或 OpenAPI 3.x",
        "en-US":
          "Unsupported document format, only Swagger 2.0 or OpenAPI 3.x is supported",
      },
    },
    {
      tKey: "errorHandler.apiDocs.parseFailed",
      langCodes: {
        "zh-CN": "文档解析失败，请检查 Swagger 2.0 / OAS 3.0 格式",
        "en-US":
          "Document parsing failed, please check Swagger 2.0 / OAS 3.0 format",
      },
    },
    {
      tKey: "errorHandler.apiDocs.parseFailedGeneral",
      langCodes: {
        "zh-CN": "文档解析失败，请检查格式",
        "en-US": "Document parsing failed, please check the format",
      },
    },
  ],
  "enterprise.workflow": [
    {
      tKey: "enterprise.workflow.title",
      langCodes: {
        "zh-CN": "工作流编排",
        "en-US": "Workflow Orchestration",
      },
    },
    {
      tKey: "sidebar.menu.enterprise.workflowGroup",
      langCodes: {
        "zh-CN": "工作流",
        "en-US": "Workflow",
      },
    },
    {
      tKey: "sidebar.menu.enterprise.workflow",
      langCodes: {
        "zh-CN": "工作流编排",
        "en-US": "Workflow Orchestration",
      },
    },
  ],
  "enterprise.workflow_config": [
    {
      tKey: "enterprise.workflow_config.title",
      langCodes: {
        "zh-CN": "工作流配置",
        "en-US": "Workflow Configuration",
      },
    },
    {
      tKey: "sidebar.menu.enterprise.workflowConfig",
      langCodes: {
        "zh-CN": "工作流配置",
        "en-US": "Workflow Configuration",
      },
    },
    {
      tKey: "workflow.config.verifySuccess",
      langCodes: {
        "zh-CN": "CDP 浏览器环境连通性验证成功！",
        "en-US": "CDP environment connection verified successfully!",
      },
    },
    {
      tKey: "workflow.config.verifyFailed",
      langCodes: {
        "zh-CN": "验证失败，请确认 CDP WebSocket 服务是否正常开启。",
        "en-US":
          "Verification failed. Please verify that the CDP WebSocket service is active.",
      },
    },
  ],
} satisfies Record<
  Extract<
    BusinessKey,
    | "enterprise.attendance"
    | "maintenance.api_docs"
    | "enterprise.workflow"
    | "enterprise.workflow_config"
  >,
  TranslationInputItem[]
>;
