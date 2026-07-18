import type { Context, UserObj } from "../../types/app";

/**
 * 快捷适配器：只需要 body
 * @param handler 业务逻辑函数，接收 body 参数
 * @returns 绑定了 Context 的 service 函数
 */
export function bodyAdapter<TBody, TRes>(
  handler: (body: TBody) => Promise<TRes>
): (c: Context) => Promise<TRes> {
  return async (c: Context): Promise<TRes> => {
    const bodyObj = c.get("bodyObj") as TBody;
    return await handler(bodyObj);
  };
}

/**
 * 快捷适配器：需要 body 和 user
 * @param handler 业务逻辑函数，接收 body 和 userObj 参数
 * @returns 绑定了 Context 的 service 函数
 */
export function bodyUserAdapter<TBody, TRes>(
  handler: (body: TBody, userObj: UserObj) => Promise<TRes>
): (c: Context) => Promise<TRes> {
  return async (c: Context): Promise<TRes> => {
    const bodyObj = c.get("bodyObj") as TBody;
    const userObj = c.get("userObj") as UserObj;
    return await handler(bodyObj, userObj);
  };
}

/**
 * 快捷适配器：需要 body, user 和 context
 * @param handler 业务逻辑函数，接收 body, userObj 和 c 参数
 * @returns 绑定了 Context 的 service 函数
 */
export function bodyUserContextAdapter<TBody, TRes>(
  handler: (body: TBody, userObj: UserObj, c: Context) => Promise<TRes>
): (c: Context) => Promise<TRes> {
  return async (c: Context): Promise<TRes> => {
    const bodyObj = c.get("bodyObj") as TBody;
    const userObj = c.get("userObj") as UserObj;
    return await handler(bodyObj, userObj, c);
  };
}

/**
 * 快捷适配器：需要 body 和 clientInfo (ip, userAgent)
 * @param handler 业务逻辑函数，接收 body 和 clientInfo 参数
 * @returns 绑定了 Context 的 service 函数
 */
export function bodyClientInfoAdapter<TBody, TRes>(
  handler: (
    body: TBody,
    clientInfo: { ip: string; userAgent: string }
  ) => Promise<TRes>
): (c: Context) => Promise<TRes> {
  return async (c: Context): Promise<TRes> => {
    const bodyObj = c.get("bodyObj") as TBody;
    const ip =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const userAgent = c.req.header("user-agent") || "unknown";
    return await handler(bodyObj, { ip, userAgent });
  };
}

/**
 * 快捷适配器：只需要 query 参数
 * @param handler 业务逻辑函数，接收 query 参数
 * @returns 绑定了 Context 的 service 函数
 */
export function queryAdapter<
  TQuery extends Record<string, string | string[]>,
  TRes,
>(handler: (query: TQuery) => Promise<TRes>): (c: Context) => Promise<TRes> {
  return async (c: Context): Promise<TRes> => {
    const query = c.req.query() as TQuery;
    return await handler(query);
  };
}

/**
 * 原始适配器：直接操作 Context，适用于流式响应、文件下载等特殊场景
 * @param handler 业务逻辑函数，接收完整 Context
 * @returns 绑定了 Context 的 service 函数
 */
export function rawAdapter<TRes>(
  handler: (c: Context) => Promise<TRes>
): (c: Context) => Promise<TRes> {
  return async (c: Context): Promise<TRes> => {
    return await handler(c);
  };
}
