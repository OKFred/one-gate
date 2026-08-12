import {
  DeviceTaskApplicationError,
  dispatchTrustedTask,
} from "../../async-task/facade.js";
import { TikTokTaskApplicationError } from "../application/error.js";
import type { TikTokDeviceTaskDispatcher } from "../application/ports.js";
import { TikTokTaskCenter } from "../application/task-center.js";

const tasks: TikTokDeviceTaskDispatcher = {
  dispatch: async (command, actor) => {
    try {
      return await dispatchTrustedTask(command, actor);
    } catch (error) {
      if (error instanceof DeviceTaskApplicationError) {
        throw new TikTokTaskApplicationError(error.message);
      }
      throw error;
    }
  },
};

/** 默认 TikTok 任务应用服务，兼容 Node 与 Cloudflare Workers。 */
export const tiktokTaskCenter = new TikTokTaskCenter({
  tasks,
  publicationIds: { next: () => crypto.randomUUID() },
});
