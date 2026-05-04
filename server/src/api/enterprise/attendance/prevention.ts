import { BusinessError } from "@/middleware/errorHandler/businessError";

/** 考勤校验相关错误码 */
export const ErrorVO = {
  TIME_CONFLICT: "errorHandler.checkOutTimeEarly",
} as const;

/** 考勤校验逻辑 */
export const validateAttendance = (data: {
  checkInTime?: number | null;
  checkOutTime?: number | null;
}) => {
  if (
    data.checkInTime &&
    data.checkOutTime &&
    data.checkOutTime <= data.checkInTime
  ) {
    throw new BusinessError(ErrorVO.TIME_CONFLICT);
  }
};
