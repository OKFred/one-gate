import type { BatchTranslationItem } from "@/db/initTranslation";

export const enterpriseTranslations: BatchTranslationItem[] = [
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
];
