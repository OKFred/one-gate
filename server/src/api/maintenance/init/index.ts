import encapsulation from "@/middleware/encapsulation";
import service from "./service";
import { BusinessKey } from "@/types/business";

function createApp() {
  return encapsulation(
    service,
    "maintenance.init" as BusinessKey
  );
}

export default createApp;
