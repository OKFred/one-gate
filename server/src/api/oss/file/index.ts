import encapsulation from "@/middleware/encapsulation";
import service from "./service";
import { BusinessKey } from "@/types/business";

function createApp() {
  // 文件操作权限，可以根据需要调整
  return encapsulation(service, "system.oss_file" satisfies BusinessKey);
}

export default createApp;
