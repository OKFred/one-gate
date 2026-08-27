import encapsulation from "@hodor/core/middleware/encapsulation";
import service from "./service";
import { BusinessKey } from "@hodor/core/types/business";
import {
  createTotpGateHttpApp,
  type TotpGateCenterResolver,
} from "./totp-gate/index.js";

export interface AuthAppOptions {
  readonly resolveTotpGateCenter: TotpGateCenterResolver;
}

function createApp(options: AuthAppOptions) {
  const app = encapsulation(service, "admin.system.auth" satisfies BusinessKey);
  app.route("/gate", createTotpGateHttpApp(options.resolveTotpGateCenter));
  return app;
}

export default createApp;
