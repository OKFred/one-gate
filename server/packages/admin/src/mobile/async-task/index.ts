import encapsulation from "@hodor/core/middleware/encapsulation";
import service from "./service";
import { BusinessKey } from "@hodor/core/types/business";

function createApp() {
  return encapsulation(
    {
      list: service.list,
    },
    "admin.mobile.async_task" satisfies BusinessKey
  );
}

export default createApp;
