import type { Context } from "@hodor/core/types/app";
import { DeviceApplicationError } from "../../application/error.js";

/** 从 HTTP Context 读取设备令牌，禁止 query/body 传递。 */
export function reportTokenFromContext(context: Context): string {
  const token = context.req.header("x-device-token");
  if (!token) throw new DeviceApplicationError("Missing device report token");
  return token;
}
