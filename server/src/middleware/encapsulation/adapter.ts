import type { NodeHonoContext } from "@/types/app";

/**
 * 快捷适配器：只需要 body
 * @param handler 业务逻辑函数，接收 body 参数
 * @returns service 函数
 */
export function bodyAdapter<TRes>(handler: (body) => Promise<TRes>) {
  return async (c: NodeHonoContext): Promise<TRes> => {
    const bodyObj = c.get("bodyObj");
    return await handler(bodyObj);
  };
}

/**
 * 快捷适配器：需要 body 和 user
 * @param handler 业务逻辑函数，接收 body 和 userObj 参数
 * @returns service 函数
 */
export function bodyUserAdapter<TRes>(
  handler: (body, userObj) => Promise<TRes>
) {
  return async (c: NodeHonoContext): Promise<TRes> => {
    const bodyObj = c.get("bodyObj")
    const userObj = c.get("userObj")
    return await handler(bodyObj, userObj);
  };
}
