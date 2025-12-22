import encapsulation from "@/middleware/encapsulation";
import { tableInit } from "./db.table";
import service from "./service";

function createApp() {
  return encapsulation(service, "MailAccount", () => {
    tableInit();
  });
}

export default createApp;
