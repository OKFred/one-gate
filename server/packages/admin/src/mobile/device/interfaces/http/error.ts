import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import { DeviceApplicationError } from "../../application/error.js";

/** 在 HTTP 边界将设备应用异常映射为现有业务错误。 */
export async function adaptDeviceHttpError<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (error instanceof DeviceApplicationError) {
      throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
        message: error.message,
      });
    }
    throw error;
  }
}
