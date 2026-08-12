/** 可映射到接口业务错误的 TikTok 任务应用异常。 */
export class TikTokTaskApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TikTokTaskApplicationError";
  }
}
