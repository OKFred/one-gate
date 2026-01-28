import encapsulation from "@/middleware/encapsulation";
import { tableInit } from "./db.table";
import service from "./service";

function createApp() {
  return encapsulation(service, "SystemRolePermission", () => {
    tableInit();
  });
}

export default createApp;
