import { registry } from "./common/registry";
import { assetProjection } from "./asset/projection";

export function initEnterpriseRegistry(): void {
  registry.register("assetProjection", assetProjection);
}
