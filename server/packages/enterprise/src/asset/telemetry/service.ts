import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { UserObj } from "@hodor/core/types/app";
import {
  TelemetryCatalogReq,
  TelemetryCatalogRes,
  TelemetryResolveBatchReq,
  TelemetryResolveBatchRes,
  type TelemetryCatalogInput,
  type TelemetryResolveBatchInput,
} from "./model";
import { buildCatalog, resolveBatch } from "./domain";
import { getTelemetryContext } from "./context";
import { telemetryRepository } from "./repository";

async function catalog(input: TelemetryCatalogInput, user: UserObj) {
  const context = getTelemetryContext(input.tenantId, user);
  const content = await telemetryRepository.catalogContent(
    context,
    input.hostAssetId
  );
  return buildCatalog(content, Date.now());
}
async function resolve(input: TelemetryResolveBatchInput, user: UserObj) {
  const current = await catalog(input, user);
  return resolveBatch(current, input.items, Date.now());
}

export default {
  catalog: {
    req: TelemetryCatalogReq,
    res: TelemetryCatalogRes,
    pathInfo: {
      path: "/catalog",
      method: "post",
      summary: "Read the authorized hardware identity catalog",
    },
    adapter: bodyUserAdapter,
    service: catalog,
    permission: { action: "read" },
  },
  resolveBatch: {
    req: TelemetryResolveBatchReq,
    res: TelemetryResolveBatchRes,
    pathInfo: {
      path: "/resolveBatch",
      method: "post",
      summary: "Resolve hardware identities from one authorized catalog",
    },
    adapter: bodyUserAdapter,
    service: resolve,
    permission: { action: "read" },
  },
} satisfies Record<string, API>;
