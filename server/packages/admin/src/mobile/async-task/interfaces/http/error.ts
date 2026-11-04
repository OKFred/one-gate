import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { DeviceTaskApplicationError } from "../../application/error.js";
import { HTTPException } from "hono/http-exception";
import { TaskRuntimeError } from "../../runtime/domain.js";

/** 将设备任务应用异常映射为现有接口业务异常。 */
export function throwDeviceTaskBusinessError(error: unknown): never {
  if (error instanceof TaskRuntimeError) {
    const status = {
      MOBILE_TASK_RUNTIME_INVALID: 422,
      MOBILE_TASK_RUNTIME_STALE: 409,
      MOBILE_TASK_DEVICE_UNAVAILABLE: 404,
      MOBILE_TASK_NOT_CANCELLABLE: 409,
      MOBILE_TASK_CANCEL_OUTCOME_UNKNOWN: 503,
    } as const;
    throw new HTTPException(status[error.code], {
      message: error.code,
      cause: { error: { code: error.code } },
    });
  }
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
