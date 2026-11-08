import type { SQL } from "drizzle-orm";
import type { UserObj } from "@hodor/core/types/app";

export type AssetProjection = {
  assetId: string;
  name: string;
  category: "host" | "disk" | "gpu" | "board" | "sensor" | "meter" | "other";
  inventoryStatus: "active" | "retired";
  hostAssetId: string | null;
};

export interface EnterpriseAssetProjection {
  list(
    tenantId: number,
    user: UserObj,
    asOfUtc: number
  ): Promise<AssetProjection[]>;
  assertReadable(
    tenantId: number,
    assetId: string,
    user: UserObj
  ): Promise<void>;
  /** Public structural guard keeps a consumer's write subject to current source access. */
  readableAssetSql(tenantId: number, assetId: string, user: UserObj): SQL;
}

export class ServiceRegistry {
  private services: Partial<{ assetProjection: EnterpriseAssetProjection }> =
    {};

  register(
    domain: "assetProjection",
    implementation: EnterpriseAssetProjection
  ) {
    this.services[domain] = implementation;
  }

  get assetProjection(): EnterpriseAssetProjection {
    if (!this.services.assetProjection)
      throw new Error("Enterprise asset projection is not registered");
    return this.services.assetProjection;
  }
}

export const registry = new ServiceRegistry();
