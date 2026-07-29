import encapsulation from "@hodor/core/middleware/encapsulation";
import service from "./service.js";
import type { BusinessKey } from "@hodor/core/types/business";

function createApp() {
  return encapsulation(service, "admin.voice" satisfies BusinessKey);
}

export default createApp;
