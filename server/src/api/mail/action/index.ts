import encapsulation from "@/middleware/encapsulation";
import service from "./service";
import { BusinessKey } from "@/types/business";

function createApp() {
  return encapsulation(service, "mail.action" satisfies BusinessKey, () => {
    // 邮件发送不需要初始化表
  });
}

export default createApp;
