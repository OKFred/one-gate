import encapsulation from "@hodor/core/middleware/encapsulation";
import service from "./service.js";
import { type BusinessKey } from "@hodor/core/types/business";

/**
 * MQTT 消息管理应用工厂
 * @returns Encapsulated Hono/App
 */
function createApp() {
  return encapsulation(service, "admin.mqtt" satisfies BusinessKey);
}

export default createApp;
