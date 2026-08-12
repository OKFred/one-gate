import encapsulation from "@hodor/core/middleware/encapsulation";
import type { BusinessKey } from "@hodor/core/types/business";
import service from "./service.js";

function createApp() {
  return encapsulation(
    { dispatch: service.dispatch },
    "admin.mobile.async_task" satisfies BusinessKey
  );
}

export default createApp;
