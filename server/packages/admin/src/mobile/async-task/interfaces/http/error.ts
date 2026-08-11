import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { DeviceTaskApplicationError } from "../../application/error.js";

/** 将设备任务应用异常映射为现有接口业务异常。 */
export function throwDeviceTaskBusinessError(error: unknown): never {
  if (error instanceof DeviceTaskApplicationError) {
    throw new BusinessError(error.message);
  }
  throw error;
}

/** 在 HTTP 边界执行设备任务用例并映射应用异常。 */
export async function adaptDeviceTaskHttpError<T>(
  action: () => Promise<T>
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throwDeviceTaskBusinessError(error);
  }
}
