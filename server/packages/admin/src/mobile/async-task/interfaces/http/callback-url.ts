/** 根据当前下发请求生成同源的 HTTPS 设备任务回调地址。 */
export function buildTaskCallbackUrl(requestUrl: string): string | undefined {
  const callbackUrl = new URL(requestUrl);
  if (callbackUrl.protocol !== "https:") return undefined;
  callbackUrl.pathname = callbackUrl.pathname.replace(
    /\/admin\/.*$/,
    "/admin/mobile/async-task/callback"
  );
  callbackUrl.search = "";
  callbackUrl.hash = "";
  return callbackUrl.toString();
}
