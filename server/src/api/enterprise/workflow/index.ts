import encapsulation from "@/middleware/encapsulation";
import service from "./service";
import type { BusinessKey } from "@/types/business";

function createApp() {
  return encapsulation(service, "enterprise.workflow" satisfies BusinessKey);
}

export default createApp;
