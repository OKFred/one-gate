import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const attendanceTranslations = {
  "organization.attendance": [
    {
      tKey: "organization.attendance.employee",
      langCodes: {
        "zh-CN": "员工",
        "en-US": "Employee",
      },
    },
    {
      tKey: "organization.attendance.date",
      langCodes: {
        "zh-CN": "考勤日期",
        "en-US": "Attendance Date",
      },
    },
    {
      tKey: "organization.attendance.checkInTime",
      langCodes: {
        "zh-CN": "签到时间",
        "en-US": "Check-in Time",
      },
    },
    {
      tKey: "organization.attendance.checkOutTime",
      langCodes: {
        "zh-CN": "签退时间",
        "en-US": "Check-out Time",
      },
    },
    {
      tKey: "organization.attendance.status",
      langCodes: {
        "zh-CN": "考勤状态",
        "en-US": "Attendance Status",
      },
    },
    {
      tKey: "organization.attendance.status.normal",
      langCodes: {
        "zh-CN": "正常",
        "en-US": "Normal",
      },
    },
    {
      tKey: "organization.attendance.status.late",
      langCodes: {
        "zh-CN": "迟到",
        "en-US": "Late",
      },
    },
    {
      tKey: "organization.attendance.status.earlyLeave",
      langCodes: {
        "zh-CN": "早退",
        "en-US": "Early Leave",
      },
    },
    {
      tKey: "organization.attendance.status.absent",
      langCodes: {
        "zh-CN": "旷工",
        "en-US": "Absent",
      },
    },
    {
      tKey: "organization.attendance.exportCsv",
      langCodes: {
        "zh-CN": "导出 CSV",
        "en-US": "Export CSV",
      },
    },
    {
      tKey: "organization.attendance.detailTitle",
      langCodes: {
        "zh-CN": "考勤详情",
        "en-US": "Attendance Details",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "organization.attendance">,
  TranslationInputItem[]
>;
