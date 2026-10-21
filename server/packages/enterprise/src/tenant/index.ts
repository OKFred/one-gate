import encapsulation from "@hodor/core/middleware/encapsulation";
import service from "./service";
import type { BusinessKey } from "@hodor/core/types/business";

export default function createTenantApp() {
  return encapsulation(service, "enterprise.tenant" satisfies BusinessKey);
}
