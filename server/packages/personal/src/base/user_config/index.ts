import encapsulation from "@hodor/core/middleware/encapsulation";
import { apis as service } from "./service";
import { BusinessKey } from "@hodor/core/types/business";

function createApp() {
  return encapsulation(
    service,
    "personal.base.user_config" satisfies BusinessKey
  );
}

export default createApp;
