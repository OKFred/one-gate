import encapsulation from "@hodor/core/middleware/encapsulation";
import { BusinessKey } from "@hodor/core/types/business";
import {
  clientDeploymentService,
  clientEnvironmentService,
  clientReleaseService,
} from "./service.js";

/** 创建客户端发布路由。 */
export function createClientReleaseApp() {
  return encapsulation(
    clientReleaseService,
    "admin.mobile.client_release" satisfies BusinessKey
  );
}

/** 创建客户端环境路由。 */
export function createClientEnvironmentApp() {
  return encapsulation(
    clientEnvironmentService,
    "admin.mobile.client_environment" satisfies BusinessKey
  );
}

/** 创建客户端部署路由。 */
export function createClientDeploymentApp() {
  return encapsulation(
    clientDeploymentService,
    "admin.mobile.client_deployment" satisfies BusinessKey
  );
}
