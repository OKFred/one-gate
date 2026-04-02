import encapsulation from "@/middleware/encapsulation";
import service from "./service";
import { BusinessKey } from "@/types/business";

function createApp() {
  return encapsulation(
    service,
    "system.role_permission" satisfies BusinessKey
  );
}

export default createApp;
