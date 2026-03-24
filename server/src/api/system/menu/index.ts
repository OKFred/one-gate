import encapsulation from "@/middleware/encapsulation";
import { tableInit } from "./model";
import service from "./service";
import { BusinessKey } from "@/types/business";

function createApp() {
  return encapsulation(service, "system.menu" satisfies BusinessKey, () => {
    tableInit();
  });
}

export default createApp;
