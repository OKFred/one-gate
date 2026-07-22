import encapsulation from "@hodor/core/middleware/encapsulation/index";
import type { BusinessKey } from "@hodor/core/types/business";
import service from "./service.js";

export default function initApp() {
  return encapsulation(service, "enterprise.mail.edm" satisfies BusinessKey);
}
