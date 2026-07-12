import encapsulation from "@hodor/core/middleware/encapsulation";
import service from "./service";
import { BusinessKey } from "@hodor/core/types/business";

function createApp() {
  return encapsulation(service, "admin.maintenance.cron" satisfies BusinessKey);
}

export default createApp;
