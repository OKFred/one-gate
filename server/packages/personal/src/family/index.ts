import encapsulation from "@hodor/core/middleware/encapsulation/index";
import type { BusinessKey } from "@hodor/core/types/business";
import service from "./service.js";

export default function createFamilyApp() {
  return encapsulation(service, "personal.family" satisfies BusinessKey);
}
