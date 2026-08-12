import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { TikTokTaskApplicationError } from "../../application/error.js";

/** 在 HTTP 边界执行 TikTok 用例并映射应用异常。 */
export async function adaptTikTokTaskHttpError<T>(
  action: () => Promise<T>
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof TikTokTaskApplicationError) {
      throw new BusinessError(error.message);
    }
    throw error;
  }
}
