import encapsulation from "@/middleware/encapsulation";
import service from "./service";
import { BusinessKey } from "@/types/business";

function createApp() {
  // 使用与 system.department 类似的权限控制逻辑
  return encapsulation(service, "system.oss_config" satisfies BusinessKey);
}

export default createApp;
