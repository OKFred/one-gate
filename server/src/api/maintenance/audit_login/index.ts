import encapsulation from "@/middleware/encapsulation";
import { tableInit } from "./model";
import service from "./service";
import { BusinessKey } from "@/types/business";

function createApp() {
  return encapsulation(
    service,
    "maintenance.audit_login" as BusinessKey,
    () => {
      tableInit();
    }
  );
}

export default createApp;
