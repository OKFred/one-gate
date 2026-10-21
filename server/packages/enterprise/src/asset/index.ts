import encapsulation from "@hodor/core/middleware/encapsulation";
import type { BusinessKey } from "@hodor/core/types/business";
import service, { mappingService } from "./service";

export default function createAssetApp() {
  const app = encapsulation(service, "enterprise.asset" satisfies BusinessKey);
  app.route(
    "/mapping",
    encapsulation(
      mappingService,
      "enterprise.asset.mapping" satisfies BusinessKey
    )
  );
  return app;
}
