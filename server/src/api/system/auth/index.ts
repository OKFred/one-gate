import encapsulation from "@/middleware/encapsulation";
import service from "./service";
import { BusinessKey } from "@/types/business";

function createApp() {
  return encapsulation(service, "system.auth" satisfies BusinessKey, () => {
    // SystemAuth 不需要初始化表
  });
}

export default createApp;
