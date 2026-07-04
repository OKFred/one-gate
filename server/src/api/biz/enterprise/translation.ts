import type { TranslationInputItem } from "@/db/initTranslation";
import type { BusinessKey } from "@/types/business";

export const enterpriseTranslations = {
  "enterprise.attendance": [
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
    {
      tKey: "workflow.save",
      langCodes: {
        "zh-CN": "保存",
        "en-US": "Save",
      },
    },
    {
      tKey: "workflow.undoTooltip",
      langCodes: {
        "zh-CN": "撤销 (Ctrl+Z)",
        "en-US": "Undo (Ctrl+Z)",
      },
    },
    {
      tKey: "workflow.undo",
      langCodes: {
        "zh-CN": "撤销",
        "en-US": "Undo",
      },
    },
    {
      tKey: "workflow.redoTooltip",
      langCodes: {
        "zh-CN": "重做 (Ctrl+Y)",
        "en-US": "Redo (Ctrl+Y)",
      },
    },
    {
      tKey: "workflow.redo",
      langCodes: {
        "zh-CN": "重做",
        "en-US": "Redo",
      },
    },
    {
      tKey: "workflow.exitFullscreen",
      langCodes: {
        "zh-CN": "退出全屏",
        "en-US": "Exit Fullscreen",
      },
    },
    {
      tKey: "workflow.fullscreen",
      langCodes: {
        "zh-CN": "全屏",
        "en-US": "Fullscreen",
      },
    },
    {
      tKey: "workflow.exitEditor",
      langCodes: {
        "zh-CN": "退出编辑",
        "en-US": "Exit Editor",
      },
    },
    {
      tKey: "workflow.dragPanelTitle",
      langCodes: {
        "zh-CN": "【{{ name }}】拖拽节点栏",
        "en-US": "[ {{ name }} ] Drag Node Panel",
      },
    },
    {
      tKey: "workflow.listFailed",
      langCodes: {
        "zh-CN": "获取工作流列表失败",
        "en-US": "Failed to get workflow list",
      },
    },
    {
      tKey: "workflow.inputNameRequired",
      langCodes: {
        "zh-CN": "请输入工作流名称",
        "en-US": "Please enter workflow name",
      },
    },
    {
      tKey: "workflow.startNodeLabel",
      langCodes: {
        "zh-CN": "开始 (手动或定时触发)",
        "en-US": "Start (Manual or Cron trigger)",
      },
    },
    {
      tKey: "workflow.createSuccess",
      langCodes: {
        "zh-CN": "工作流创建成功",
        "en-US": "Workflow created successfully",
      },
    },
    {
      tKey: "workflow.createFailed",
      langCodes: {
        "zh-CN": "创建工作流失败",
        "en-US": "Failed to create workflow",
      },
    },
    {
      tKey: "workflow.saveSuccess",
      langCodes: {
        "zh-CN": "工作流图数据保存成功！",
        "en-US": "Workflow flow data saved successfully!",
      },
    },
    {
      tKey: "workflow.saveFailed",
      langCodes: {
        "zh-CN": "保存失败，请重试。",
        "en-US": "Save failed, please try again.",
      },
    },
    {
      tKey: "workflow.runSuccess",
      langCodes: {
        "zh-CN": "已触发后台工作流执行，请稍后查看日志",
        "en-US":
          "Background workflow execution triggered, please check logs later",
      },
    },
    {
      tKey: "workflow.runFailed",
      langCodes: {
        "zh-CN": "启动工作流执行失败",
        "en-US": "Failed to start workflow execution",
      },
    },
    {
      tKey: "workflow.deleteSuccess",
      langCodes: {
        "zh-CN": "删除工作流成功",
        "en-US": "Workflow deleted successfully",
      },
    },
    {
      tKey: "workflow.deleteFailed",
      langCodes: {
        "zh-CN": "删除失败",
        "en-US": "Delete failed",
      },
    },
    {
      tKey: "workflow.getLogsFailed",
      langCodes: {
        "zh-CN": "获取运行日志失败",
        "en-US": "Failed to get run logs",
      },
    },
    {
      tKey: "workflow.nodeCdpLabel",
      langCodes: {
        "zh-CN": "CDP 浏览器操作",
        "en-US": "CDP Browser Action",
      },
    },
    {
      tKey: "workflow.nodeDockerLabel",
      langCodes: {
        "zh-CN": "Docker 任务",
        "en-US": "Docker Task",
      },
    },
    {
      tKey: "workflow.startNodeCannotDelete",
      langCodes: {
        "zh-CN": "起点节点不可删除",
        "en-US": "Start node cannot be deleted",
      },
    },
    {
      tKey: "workflow.newWorkflow",
      langCodes: {
        "zh-CN": "新建工作流",
        "en-US": "New Workflow",
      },
    },
    {
      tKey: "workflow.noDescription",
      langCodes: {
        "zh-CN": "暂无描述信息",
        "en-US": "No description available",
      },
    },
    {
      tKey: "workflow.createTime",
      langCodes: {
        "zh-CN": "创建时间",
        "en-US": "Creation Time",
      },
    },
    {
      tKey: "workflow.editFlow",
      langCodes: {
        "zh-CN": "编辑图连线",
        "en-US": "Edit Connections",
      },
    },
    {
      tKey: "workflow.runOnce",
      langCodes: {
        "zh-CN": "手动运行一次",
        "en-US": "Run Once",
      },
    },
    {
      tKey: "workflow.viewHistory",
      langCodes: {
        "zh-CN": "查看执行历史",
        "en-US": "View History",
      },
    },
    {
      tKey: "workflow.deleteWorkflow",
      langCodes: {
        "zh-CN": "删除工作流",
        "en-US": "Delete Workflow",
      },
    },
    {
      tKey: "workflow.workflowName",
      langCodes: {
        "zh-CN": "工作流名称",
        "en-US": "Workflow Name",
      },
    },
    {
      tKey: "workflow.description",
      langCodes: {
        "zh-CN": "描述",
        "en-US": "Description",
      },
    },
    {
      tKey: "workflow.cancel",
      langCodes: {
        "zh-CN": "取消",
        "en-US": "Cancel",
      },
    },
    {
      tKey: "workflow.confirmCreate",
      langCodes: {
        "zh-CN": "确认创建",
        "en-US": "Confirm Create",
      },
    },
    {
      tKey: "workflow.deleteConfirmText",
      langCodes: {
        "zh-CN": "确定要删除该工作流吗？此操作无法撤销。",
        "en-US":
          "Are you sure you want to delete this workflow? This action cannot be undone.",
      },
    },
    {
      tKey: "workflow.confirmDelete",
      langCodes: {
        "zh-CN": "确认删除",
        "en-US": "Confirm Delete",
      },
    },
    {
      tKey: "workflow.logTitle",
      langCodes: {
        "zh-CN": "【{{ name }}】执行日志",
        "en-US": "[ {{ name }} ] Execution Logs",
      },
    },
    {
      tKey: "workflow.runBatchList",
      langCodes: {
        "zh-CN": "运行批次列表",
        "en-US": "Run Batch List",
      },
    },
    {
      tKey: "workflow.statusSuccess",
      langCodes: {
        "zh-CN": "成功",
        "en-US": "Success",
      },
    },
    {
      tKey: "workflow.statusRunning",
      langCodes: {
        "zh-CN": "运行中",
        "en-US": "Running",
      },
    },
    {
      tKey: "workflow.statusFailed",
      langCodes: {
        "zh-CN": "失败",
        "en-US": "Failed",
      },
    },
    {
      tKey: "workflow.time",
      langCodes: {
        "zh-CN": "时间: {{ time }}",
        "en-US": "Time: {{ time }}",
      },
    },
    {
      tKey: "workflow.triggerType",
      langCodes: {
        "zh-CN": "方式: {{ type }}",
        "en-US": "Trigger: {{ type }}",
      },
    },
    {
      tKey: "workflow.triggerManual",
      langCodes: {
        "zh-CN": "手动触发",
        "en-US": "Manual",
      },
    },
    {
      tKey: "workflow.triggerCron",
      langCodes: {
        "zh-CN": "定时任务",
        "en-US": "Cron",
      },
    },
    {
      tKey: "workflow.noLogs",
      langCodes: {
        "zh-CN": "暂无执行日志记录",
        "en-US": "No execution logs",
      },
    },
    {
      tKey: "workflow.stepExecutionTrack",
      langCodes: {
        "zh-CN": "单次步骤执行轨迹",
        "en-US": "Single Step Execution Track",
      },
    },
    {
      tKey: "workflow.systemNode",
      langCodes: {
        "zh-CN": "系统节点",
        "en-US": "System Node",
      },
    },
    {
      tKey: "workflow.stepRan",
      langCodes: {
        "zh-CN": "已运行",
        "en-US": "Ran",
      },
    },
    {
      tKey: "workflow.stepFailed",
      langCodes: {
        "zh-CN": "运行失败",
        "en-US": "Failed",
      },
    },
    {
      tKey: "workflow.executionResult",
      langCodes: {
        "zh-CN": "执行返回值 (Result):",
        "en-US": "Execution Result:",
      },
    },
    {
      tKey: "workflow.browserScreenshot",
      langCodes: {
        "zh-CN": "浏览器截图:",
        "en-US": "Browser Screenshot:",
      },
    },
    {
      tKey: "workflow.parseLogsFailed",
      langCodes: {
        "zh-CN": "解析日志步骤失败",
        "en-US": "Failed to parse log steps",
      },
    },
    {
      tKey: "workflow.selectLogToViewSteps",
      langCodes: {
        "zh-CN": "请在左侧选择一次运行记录查看步骤",
        "en-US": "Please select a run record from the left to view steps",
      },
    },
    {
      tKey: "workflow.nodeParamConfig",
      langCodes: {
        "zh-CN": "节点参数配置",
        "en-US": "Node Parameter Configuration",
      },
    },
    {
      tKey: "workflow.nodeId",
      langCodes: {
        "zh-CN": "节点 ID: {{ id }}",
        "en-US": "Node ID: {{ id }}",
      },
    },
    {
      tKey: "workflow.nodeName",
      langCodes: {
        "zh-CN": "节点名称",
        "en-US": "Node Name",
      },
    },
    {
      tKey: "workflow.actionType",
      langCodes: {
        "zh-CN": "操作类型",
        "en-US": "Action Type",
      },
    },
    {
      tKey: "workflow.actionNavigate",
      langCodes: {
        "zh-CN": "网页导航 (Navigate)",
        "en-US": "Navigate",
      },
    },
    {
      tKey: "workflow.actionClick",
      langCodes: {
        "zh-CN": "元素点击 (Click)",
        "en-US": "Click",
      },
    },
    {
      tKey: "workflow.actionInput",
      langCodes: {
        "zh-CN": "文字输入 (Input)",
        "en-US": "Input",
      },
    },
    {
      tKey: "workflow.actionScreenshot",
      langCodes: {
        "zh-CN": "屏幕截图 (Screenshot)",
        "en-US": "Screenshot",
      },
    },
    {
      tKey: "workflow.actionExtractText",
      langCodes: {
        "zh-CN": "提取文字 (Extract Text)",
        "en-US": "Extract Text",
      },
    },
    {
      tKey: "workflow.actionEvaluateJs",
      langCodes: {
        "zh-CN": "执行页面脚本 (Evaluate JS)",
        "en-US": "Evaluate JS",
      },
    },
    {
      tKey: "workflow.cssSelector",
      langCodes: {
        "zh-CN": "CSS 选择器 (Selector)",
        "en-US": "CSS Selector",
      },
    },
    {
      tKey: "workflow.targetUrl",
      langCodes: {
        "zh-CN": "目标 URL",
        "en-US": "Target URL",
      },
    },
    {
      tKey: "workflow.inputValue",
      langCodes: {
        "zh-CN": "输入值 (Value)",
        "en-US": "Input Value",
      },
    },
    {
      tKey: "workflow.pageScript",
      langCodes: {
        "zh-CN": "页面脚本 (浏览器内执行)",
        "en-US": "Page Script",
      },
    },
    {
      tKey: "workflow.evaluateJsPlaceholder",
      langCodes: {
        "zh-CN":
          "// 此脚本在 CDP 浏览器页面内执行，可访问 DOM\nreturn document.title;",
        "en-US":
          "// This script executes in the CDP browser page and can access the DOM\nreturn document.title;",
      },
    },
    {
      tKey: "workflow.inputContentPlaceholder",
      langCodes: {
        "zh-CN": "输入的内容",
        "en-US": "Content to input",
      },
    },
    {
      tKey: "workflow.dockerImage",
      langCodes: {
        "zh-CN": "Docker 镜像 (Image)",
        "en-US": "Docker Image",
      },
    },
    {
      tKey: "workflow.commandArgs",
      langCodes: {
        "zh-CN": "命令行参数 (Command)",
        "en-US": "Command Args",
      },
    },
    {
      tKey: "workflow.selectNodeToConfigure",
      langCodes: {
        "zh-CN": "请在左侧画布上选择一个节点进行配置",
        "en-US": "Please select a node on the left canvas to configure",
      },
    },
    {
      tKey: "workflow.deleteNode",
      langCodes: {
        "zh-CN": "删除该节点",
        "en-US": "Delete Node",
      },
    },
  ],
  "enterprise.workflow_config": [
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
    {
      tKey: "workflow.config.name",
      langCodes: {
        "zh-CN": "配置名称",
        "en-US": "Configuration Name",
      },
    },
    {
      tKey: "workflow.config.cdpUrlLabel",
      langCodes: {
        "zh-CN": "CDP 调试地址",
        "en-US": "CDP Debug Address",
      },
    },
    {
      tKey: "workflow.config.defaultEnv",
      langCodes: {
        "zh-CN": "默认环境",
        "en-US": "Default Environment",
      },
    },
    {
      tKey: "workflow.config.yes",
      langCodes: {
        "zh-CN": "是",
        "en-US": "Yes",
      },
    },
    {
      tKey: "workflow.config.no",
      langCodes: {
        "zh-CN": "否",
        "en-US": "No",
      },
    },
    {
      tKey: "workflow.config.status",
      langCodes: {
        "zh-CN": "状态",
        "en-US": "Status",
      },
    },
    {
      tKey: "workflow.config.enabled",
      langCodes: {
        "zh-CN": "启用",
        "en-US": "Enabled",
      },
    },
    {
      tKey: "workflow.config.disabled",
      langCodes: {
        "zh-CN": "禁用",
        "en-US": "Disabled",
      },
    },
    {
      tKey: "workflow.config.cdpUrlCardLabel",
      langCodes: {
        "zh-CN": "CDP 地址",
        "en-US": "CDP Address",
      },
    },
    {
      tKey: "workflow.config.default",
      langCodes: {
        "zh-CN": "默认",
        "en-US": "Default",
      },
    },
    {
      tKey: "workflow.config.testConnection",
      langCodes: {
        "zh-CN": "测试连接",
        "en-US": "Test Connection",
      },
    },
    {
      tKey: "workflow.config.verifyError",
      langCodes: {
        "zh-CN": "连通性验证请求出错，请重试。",
        "en-US": "Connection verification request failed, please try again.",
      },
    },
    {
      tKey: "workflow.config.cdpUrlFormLabel",
      langCodes: {
        "zh-CN": "CDP 连接地址 (ws:// 或 host:port)",
        "en-US": "CDP Connection Address (ws:// or host:port)",
      },
    },
    {
      tKey: "workflow.config.cdpUrlHelper",
      langCodes: {
        "zh-CN":
          "示例: 127.0.0.1:9222 或 ws://127.0.0.1:9222/devtools/browser/...",
        "en-US":
          "Example: 127.0.0.1:9222 or ws://127.0.0.1:9222/devtools/browser/...",
      },
    },
    {
      tKey: "workflow.config.setDefaultEnv",
      langCodes: {
        "zh-CN": "设为默认环境 (设置为默认后将自动取消其他环境的默认标识)",
        "en-US":
          "Set as Default Environment (setting as default will automatically cancel other default flags)",
      },
    },
    {
      tKey: "workflow.config.enableEnv",
      langCodes: {
        "zh-CN": "启用环境",
        "en-US": "Enable Environment",
      },
    },
    {
      tKey: "workflow.config.remark",
      langCodes: {
        "zh-CN": "备注",
        "en-US": "Remark",
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
