import encapsulation from "@/middleware/encapsulation";
import { tableInit } from "./model";
import service from "./service";
import { BusinessKey } from "@/types/business";

function createApp() {
  return encapsulation(
    service,
    "i18n.translation" satisfies BusinessKey,
    () => {
      tableInit();
    }
  );
}

export default createApp;
