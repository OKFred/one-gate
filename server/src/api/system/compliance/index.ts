import encapsulation from "@/middleware/encapsulation";
import { tableInit } from "./db.table";
import service from "./service";
import { BusinessKey } from "@/types/business";

function createApp() {
  return encapsulation(
    service,
    "system.compliance" satisfies BusinessKey,
    () => {
      tableInit();
    }
  );
}

export default createApp;
export { exportDeletionRecord } from "./service";
