import encapsulation from "@/middleware/encapsulation";
import { tableInit } from "./db.table";
import service from "./service";

function createApp() {
  return encapsulation(service, "SystemMenu", () => {
    tableInit();
  });
}

export default createApp;
