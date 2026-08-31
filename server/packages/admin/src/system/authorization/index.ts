import encapsulation from "@hodor/core/middleware/encapsulation";
import type { BusinessKey } from "@hodor/core/types/business";
import service from "./interfaces/http/service.js";

export default function createAuthorizationApp() {
  return encapsulation(
    service,
    "admin.system.authorization" satisfies BusinessKey
  );
}
