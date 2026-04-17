import encapsulation from "@/middleware/encapsulation";
import service from "./service";
import type { BusinessKey } from "@/types/business";

function createApp() {
  return encapsulation(service, "enterprise.attendance" as BusinessKey);
}

export default createApp;
