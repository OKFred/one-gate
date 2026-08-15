/** 设备应用用例可安全映射到现有业务错误的异常。 */
export class DeviceApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeviceApplicationError";
  }
}
