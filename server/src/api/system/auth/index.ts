import encapsulation from "@/middleware/encapsulation";
import service from "./service";

function createApp() {
  return encapsulation(service, "SystemAuth", () => {
    // SystemAuth 不需要初始化表
  });
}

export default createApp;
