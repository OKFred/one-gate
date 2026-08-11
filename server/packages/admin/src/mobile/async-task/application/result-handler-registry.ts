import type { DeviceTaskResultPayload } from "../domain/task.js";
import {
  isTrustedScriptId,
  type TrustedScriptId,
} from "../domain/trusted-script.js";
import type { DeviceTaskResultHandler } from "./ports.js";

/** 按可信脚本标识管理任务结果后处理器。 */
export class DeviceTaskResultHandlerRegistry {
  private readonly handlers = new Map<
    TrustedScriptId,
    DeviceTaskResultHandler
  >();

  /** 注册或幂等替换一个脚本结果处理器。 */
  register(scriptId: TrustedScriptId, handler: DeviceTaskResultHandler): void {
    this.handlers.set(scriptId, handler);
  }

  /** 执行与结果脚本匹配的后处理器。 */
  async handle(result: DeviceTaskResultPayload): Promise<void> {
    if (!isTrustedScriptId(result.scriptId)) return;
    const handler = this.handlers.get(result.scriptId);
    if (handler) await handler(result);
  }
}
