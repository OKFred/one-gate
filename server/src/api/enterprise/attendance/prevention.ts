import { BusinessError } from "@/middleware/errorHandler/businessError";

/** 考勤校验相关错误码 */
export const ErrorCodes = {
  TIME_CONFLICT: "errorHandler.checkOutTimeEarly",
} as const;

/** 考勤校验逻辑 */
export const preventTimeTravel = (data: {
  checkInTime?: number | null;
  checkOutTime?: number | null;
}) => {
  if (
    data.checkInTime &&
    data.checkOutTime &&
    data.checkOutTime <= data.checkInTime
  ) {
    throw new BusinessError(ErrorCodes.TIME_CONFLICT);
  }
};
