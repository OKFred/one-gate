import { publishDeviceManagementCommand } from "../../../mqtt/service.js";
import { findDeviceTaskTarget } from "../../device/facade.js";
import { TaskRuntimeCenter } from "./application.js";
import { TaskRuntimeRepository } from "./repository.js";

export const taskRuntimeCenter = new TaskRuntimeCenter({
  repository: new TaskRuntimeRepository(),
  devices: { getByClientId: findDeviceTaskTarget },
  clock: { now: () => Date.now() },
  ids: { next: () => crypto.randomUUID() },
  publisher: {
    publish: async (clientId, command, actor) => {
      await publishDeviceManagementCommand({
        topic: `autojs6/v2/devices/${clientId}/task-control`,
        payload: { ...command },
        actor,
        sessionId: command.commandId,
        clientId,
        commandType: "TASK_CANCEL",
        requireTls: true,
      });
    },
  },
});
