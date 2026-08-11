/** 设备任务用例可被接口层转换的业务异常。 */
export class DeviceTaskApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeviceTaskApplicationError";
  }
}
