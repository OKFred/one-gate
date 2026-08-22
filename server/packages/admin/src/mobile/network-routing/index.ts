import encapsulation from "@hodor/core/middleware/encapsulation";
import type { BusinessKey } from "@hodor/core/types/business";
import service from "./service.js";

export default function createNetworkRoutingApp() {
  return encapsulation(
    service,
    "admin.mobile.network_routing" satisfies BusinessKey
  );
}
