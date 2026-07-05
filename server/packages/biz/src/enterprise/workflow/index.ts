import encapsulation from "@hodor/core/middleware/encapsulation";
import service from "./service";
import type { BusinessKey } from "@hodor/core/types/business";

function createApp() {
  return encapsulation(service, "enterprise.workflow" satisfies BusinessKey);
}

export default createApp;
