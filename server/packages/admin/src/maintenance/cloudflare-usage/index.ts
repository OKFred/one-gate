import encapsulation from "@hodor/core/middleware/encapsulation";
import type { BusinessKey } from "@hodor/core/types/business";
import service from "./service";
export default function createApp() {
  return encapsulation(
    service,
    "admin.maintenance.cloudflare_usage" satisfies BusinessKey
  );
}
export { runCloudflareUsageMaintenance } from "./collector";
