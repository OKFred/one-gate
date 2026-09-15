import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import { can } from "@hodor/core/middleware/auth/permission";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import type { UserObj } from "@hodor/core/types/app";
import {
  recycleBinRegistry,
  type RecycleBinRegistry,
  type RecycleBinAction,
  type RecycleBinResourceAdapter,
  type RecycleBinRecordId,
} from "@hodor/core/db/recycle-bin";
import {
  RecycleBinResourcesReq,
  RecycleBinResourcesRes,
  RecycleBinListReq,
  RecycleBinListRes,
  RecycleBinMutationReq,
  RecycleBinMutationRes,
  type RecycleBinResourcesInput,
  type RecycleBinResourcesOutput,
  type RecycleBinListInput,
  type RecycleBinListOutput,
  type RecycleBinMutationInput,
} from "./model";

const business = "admin.maintenance.recycle_bin";

async function allows(
  adapter: RecycleBinResourceAdapter,
  action: RecycleBinAction,
  user: UserObj
): Promise<boolean> {
  if (!(await can(user, action, business))) return false;
  if (!(await adapter.can(action, user))) return false;
  if (action === "purge") {
    await user.ensureLoaded();
    return user.isSuperAdmin;
  }
  return true;
}

async function requirePermission(
  adapter: RecycleBinResourceAdapter,
  action: RecycleBinAction,
  user: UserObj
): Promise<void> {
  if (!(await allows(adapter, action, user))) {
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  }
}

/** A registry instance keeps isolated tests separate from the application composition. */
export function createRecycleBinHandlers(registry: RecycleBinRegistry) {
  function requireResource(resourceType: string): RecycleBinResourceAdapter {
    const adapter = registry.get(resourceType);
    if (!adapter) throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
    return adapter;
  }

  async function onResources(
    _params: RecycleBinResourcesInput,
    user: UserObj
  ): Promise<RecycleBinResourcesOutput> {
    if (!(await can(user, "read", business))) {
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    }
    const list: RecycleBinResourcesOutput["list"] = [];
    for (const adapter of registry.list()) {
      if (!(await adapter.can("read", user))) continue;
      list.push({
        resourceType: adapter.resourceType,
        labelKey: adapter.labelKey,
        canRestore: await allows(adapter, "restore", user),
        canPurge: await allows(adapter, "purge", user),
      });
    }
    return { list };
  }

  async function onList(
    params: RecycleBinListInput,
    user: UserObj
  ): Promise<RecycleBinListOutput> {
    const adapter = requireResource(params.resourceType);
    await requirePermission(adapter, "read", user);
    const { keyword, pageNo = 1, pageSize = 10 } = params;
    const { list, total } = await adapter.list(
      { keyword, pageNo, pageSize },
      user
    );
    return {
      canRestore: await allows(adapter, "restore", user),
      canPurge: await allows(adapter, "purge", user),
      list: list.map((row) => ({
        resourceType: adapter.resourceType,
        id: row.id,
        name: row.name,
        deleterId: row.deleterId,
        deleterName: row.deleterName,
        deletedTimeUtc: row.deletedTimeUtc,
        expiresTimeUtc: row.expiresTimeUtc,
        canRestore: row.canRestore,
      })),
      total,
      totalPage: Math.ceil(total / pageSize),
      currentPage: pageNo,
      pageSize,
    };
  }

  async function onRestore(
    params: RecycleBinMutationInput,
    user: UserObj
  ): Promise<RecycleBinRecordId> {
    const adapter = requireResource(params.resourceType);
    await requirePermission(adapter, "restore", user);
    return adapter.restore(
      { id: params.id, expectedDeletedTimeUtc: params.expectedDeletedTimeUtc },
      user
    );
  }

  async function onPurge(
    params: RecycleBinMutationInput,
    user: UserObj
  ): Promise<RecycleBinRecordId> {
    const adapter = requireResource(params.resourceType);
    await requirePermission(adapter, "purge", user);
    return adapter.purge(
      { id: params.id, expectedDeletedTimeUtc: params.expectedDeletedTimeUtc },
      user
    );
  }

  return { onResources, onList, onRestore, onPurge };
}

export const { onResources, onList, onRestore, onPurge } =
  createRecycleBinHandlers(recycleBinRegistry);

export default {
  resources: {
    req: RecycleBinResourcesReq,
    res: RecycleBinResourcesRes,
    pathInfo: {
      path: "/resources",
      method: "post",
      summary: "查询可用回收站资源",
    },
    adapter: bodyUserAdapter,
    service: onResources,
    permission: { action: "read" },
  },
  list: {
    req: RecycleBinListReq,
    res: RecycleBinListRes,
    pathInfo: { path: "/list", method: "post", summary: "查询回收站" },
    adapter: bodyUserAdapter,
    service: onList,
    permission: { action: "read" },
  },
  restore: {
    req: RecycleBinMutationReq,
    res: RecycleBinMutationRes,
    pathInfo: { path: "/restore", method: "post", summary: "恢复回收站记录" },
    adapter: bodyUserAdapter,
    service: onRestore,
    permission: { action: "restore" },
  },
  purge: {
    req: RecycleBinMutationReq,
    res: RecycleBinMutationRes,
    pathInfo: {
      path: "/purge",
      method: "post",
      summary: "提前彻底删除回收站记录",
    },
    adapter: bodyUserAdapter,
    service: onPurge,
    permission: { action: "purge" },
  },
} satisfies Record<string, API>;
