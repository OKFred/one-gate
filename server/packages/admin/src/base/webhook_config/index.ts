import encapsulation from "@hodor/core/middleware/encapsulation";
import type { BusinessKey } from "@hodor/core/types/business";
import service from "./service.js";

function createApp() {
  return encapsulation(
    service,
    "admin.base.webhook_config" satisfies BusinessKey
  );
}

export default createApp;
