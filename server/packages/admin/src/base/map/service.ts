import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import type { UserObj } from "@hodor/core/types/app";
import { getEnv } from "@hodor/core/utils/env";
import {
  MapConfigurationRequestSchema,
  MapConfigurationResponseSchema,
  type MapConfigurationRequest,
  type MapConfigurationResponse,
} from "./model";

export async function readMapConfiguration(
  _params: MapConfigurationRequest,
  actor: UserObj | undefined
): Promise<MapConfigurationResponse> {
  if (!actor) throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
  if (actor.principal?.kind !== "user")
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);

  const configuredKey: unknown = getEnv("TIANDITU_BROWSER_KEY");
  const browserKey =
    typeof configuredKey === "string" ? configuredKey.trim() : "";
  if (!/^[a-f0-9]{32}$/i.test(browserKey))
    return { configured: false, browserKey: null };
  return { configured: true, browserKey };
}

export default {
  config: {
    req: MapConfigurationRequestSchema,
    res: MapConfigurationResponseSchema,
    pathInfo: {
      path: "/config",
      method: "post",
      summary: "Read authenticated Tianditu browser configuration",
    },
    adapter: bodyUserAdapter,
    service: readMapConfiguration,
    permission: false,
  } satisfies API,
};
