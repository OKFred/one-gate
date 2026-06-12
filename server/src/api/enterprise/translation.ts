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
} satisfies Record<
  Extract<BusinessKey, "enterprise.attendance">,
  TranslationInputItem[]
>;
