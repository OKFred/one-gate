import encapsulation from "@/middleware/encapsulation";
import service from "./service";

function createApp() {
  return encapsulation(service, "MailAction", () => {
    // 邮件发送不需要初始化表
  });
}

export default createApp;
