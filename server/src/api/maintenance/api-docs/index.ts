import encapsulation from "@/middleware/encapsulation";
import service from "./service";
import { BusinessKey } from "@/types/business";

function createApp() {
  return encapsulation(service, "maintenance.api_docs" satisfies BusinessKey);
}

export default createApp;
