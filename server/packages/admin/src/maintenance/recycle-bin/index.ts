import encapsulation from "@hodor/core/middleware/encapsulation";
import type { BusinessKey } from "@hodor/core/types/business";
import service from "./service";

export default function createApp() {
  return encapsulation(
    service,
    "admin.maintenance.recycle_bin" satisfies BusinessKey
  );
}
