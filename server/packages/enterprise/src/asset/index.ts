import encapsulation from "@hodor/core/middleware/encapsulation";
import type { BusinessKey } from "@hodor/core/types/business";
import service, { mappingService } from "./service";
import telemetryService from "./telemetry/service";

export default function createAssetApp() {
  const app = encapsulation(service, "enterprise.asset" satisfies BusinessKey);
  app.use("/telemetry/*", async (context, next) => {
    context.header("Cache-Control", "private, no-store");
    await next();
  });
  app.route(
    "/telemetry",
    encapsulation(
      telemetryService,
      "enterprise.asset.telemetry" satisfies BusinessKey
    )
  );
  app.route(
    "/mapping",
    encapsulation(
      mappingService,
      "enterprise.asset.mapping" satisfies BusinessKey
    )
  );
  return app;
}
