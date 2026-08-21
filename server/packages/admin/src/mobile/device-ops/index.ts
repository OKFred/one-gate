import encapsulation from "@hodor/core/middleware/encapsulation";
import type { BusinessKey } from "@hodor/core/types/business";
import service from "./service.js";

/** Create device operations management routes. */
export default function createDeviceOpsApp() {
  return encapsulation(service, "admin.mobile.device" as BusinessKey);
}
