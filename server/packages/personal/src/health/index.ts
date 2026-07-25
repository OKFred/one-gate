import encapsulation from "@hodor/core/middleware/encapsulation/index";
import type { BusinessKey } from "@hodor/core/types/business";
import service from "./service.js";

export default function createHealthApp() {
  return encapsulation(service, "personal.health" satisfies BusinessKey);
}
