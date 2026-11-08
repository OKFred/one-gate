import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import type { UserObj } from "@hodor/core/types/app";
import { registry as enterprise } from "@hodor/enterprise/common/registry";
import {
  AssetOverviewRequestSchema,
  AssetOverviewResponseSchema,
  AssetPlaceRequestSchema,
  PlacementResponseSchema,
  type AssetOverview,
  type AssetOverviewRequest,
  type AssetPlaceRequest,
  type AssetPlacement,
} from "./model";
import { getPlacementRepository } from "./repository";
import { PersonalAssetError, personalAssetError } from "./errors";

function ownerId(user: UserObj | undefined): number {
  if (!user) throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
  if (
    user.principal?.kind !== "user" ||
    user.principal.userId !== user.userId ||
    !Number.isSafeInteger(user.principal.userId) ||
    user.principal.userId <= 0
  )
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  return user.principal.userId;
}

export async function overviewPersonalAssets(
  params: AssetOverviewRequest,
  user: UserObj
): Promise<AssetOverview> {
  const owner = ownerId(user);
  const asOfUtc = Date.now();
  const assets = await enterprise.assetProjection.list(
    params.tenantId,
    user,
    asOfUtc
  );
  const placements = await getPlacementRepository().list(
    owner,
    params.tenantId
  );
  return {
    asOfUtc,
    presenceSource: "unconfigured",
    assets: assets.map((asset) => ({
      assetId: asset.assetId,
      name: asset.name,
      category: asset.category,
      inventoryStatus: asset.inventoryStatus,
      hostAssetId: asset.hostAssetId,
      placement: placements.get(asset.assetId) ?? {
        site: null,
        floor: null,
        version: null,
        updateTimeUtc: null,
      },
      presence: {
        status: "unknown",
        basis: "not_connected",
        lastHeartbeatTimeUtc: null,
        observedTimeUtc: null,
        expiresTimeUtc: null,
      },
    })),
  };
}

export async function placePersonalAsset(
  params: AssetPlaceRequest,
  user: UserObj
): Promise<AssetPlacement> {
  const owner = ownerId(user);
  const validLocation =
    (params.site === null && params.floor === null) ||
    (params.site === "OpenLife" && params.floor === 1) ||
    (params.site === "OpenMind" &&
      params.floor !== null &&
      Number.isInteger(params.floor) &&
      params.floor >= 1 &&
      params.floor <= 4);
  if (
    !validLocation ||
    (params.expectedVersion !== null &&
      (!Number.isSafeInteger(params.expectedVersion) ||
        params.expectedVersion < 1 ||
        params.expectedVersion >= Number.MAX_SAFE_INTEGER))
  )
    throw personalAssetError(PersonalAssetError.INVALID_PLACEMENT);
  const input = { ...params, assetId: params.assetId.toLowerCase() };
  await enterprise.assetProjection.assertReadable(
    input.tenantId,
    input.assetId,
    user
  );
  const placement = await getPlacementRepository().place(
    owner,
    input,
    enterprise.assetProjection.readableAssetSql(
      input.tenantId,
      input.assetId,
      user
    ),
    Date.now()
  );
  if (!placement) throw personalAssetError(PersonalAssetError.STATE_CONFLICT);
  return placement;
}

export default {
  overview: {
    req: AssetOverviewRequestSchema,
    res: AssetOverviewResponseSchema,
    pathInfo: {
      path: "/overview",
      method: "post",
      summary: "Read private asset spaces",
    },
    adapter: bodyUserAdapter,
    permission: { action: "read" },
    service: overviewPersonalAssets,
  },
  place: {
    req: AssetPlaceRequestSchema,
    res: PlacementResponseSchema,
    pathInfo: {
      path: "/place",
      method: "post",
      summary: "Place an asset in a private space",
    },
    adapter: bodyUserAdapter,
    permission: { action: "update" },
    service: placePersonalAsset,
  },
} satisfies Record<string, API>;
