import encapsulation from "@/middleware/encapsulation";
import { tableInit } from "./model";
import service from "./service";
import { BusinessKey } from "@/types/business";

function createApp() {
  return encapsulation(
    service,
    "system.department" satisfies BusinessKey,
    () => {
      tableInit();
    }
  );
}

export default createApp;
