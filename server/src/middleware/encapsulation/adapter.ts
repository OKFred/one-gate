import type { Context } from "@/types/app";

/**
 * 快捷适配器：只需要 body
 * @param handler 业务逻辑函数，接收 body 参数
 * @returns service 函数
 */
export function bodyAdapter<TRes>(handler: (body) => Promise<TRes>) {
  return async (c: Context): Promise<TRes> => {
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
  return async (c: Context): Promise<TRes> => {
    const bodyObj = c.get("bodyObj");
    const userObj = c.get("userObj");
    return await handler(bodyObj, userObj);
  };
}

/**
 * 快捷适配器：需要 body, user 和 context
 * @param handler 业务逻辑函数，接收 body, userObj 和 c 参数
 * @returns service 函数
 */
export function bodyUserContextAdapter<TRes>(
  handler: (body: any, userObj: any, c: Context) => Promise<TRes>
) {
  return async (c: Context): Promise<TRes> => {
    const bodyObj = c.get("bodyObj");
    const userObj = c.get("userObj");
    return await handler(bodyObj, userObj, c);
  };
}
/**
 * 快捷适配器：需要 body 和 clientInfo (ip, userAgent)
 * @param handler 业务逻辑函数，接收 body 和 clientInfo 参数
 * @returns service 函数
 */
export function bodyClientInfoAdapter<TRes>(
  handler: (
    body,
    clientInfo: { ip: string; userAgent: string }
  ) => Promise<TRes>
) {
  return async (c: Context): Promise<TRes> => {
    const bodyObj = c.get("bodyObj");
    const ip =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";
    return await handler(bodyObj, { ip, userAgent });
  };
}

export function rawAdapter<TRes>(handler: (c: Context) => Promise<TRes>) {
  return async (c: Context): Promise<TRes> => {
    return await handler(c);
  };
}
