import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import { can } from "@hodor/core/middleware/auth/permission";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import type { UserObj } from "@hodor/core/types/app";
import {
  listDeletedDepartments,
  restoreDeletedDepartment,
  purgeDeletedDepartment,
} from "../../system/department/service";
import {
  RecycleBinListReq,
  RecycleBinListRes,
  RecycleBinMutationReq,
  RecycleBinMutationRes,
  type RecycleBinListInput,
  type RecycleBinListOutput,
  type RecycleBinMutationInput,
} from "./model";

async function requirePermission(
  user: UserObj,
  action: "read" | "restore"
): Promise<void> {
  if (
    !(await can(user, action, "admin.maintenance.recycle_bin")) ||
    !(await can(
      user,
      action === "read" ? "read" : "edit",
      "admin.system.department"
    ))
  ) {
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  }
}

export async function onList(
  params: RecycleBinListInput,
  user: UserObj
): Promise<RecycleBinListOutput> {
  await requirePermission(user, "read");
  const { keyword, pageNo = 1, pageSize = 10 } = params;
  const { list, total } = await listDeletedDepartments({
    keyword,
    pageNo,
    pageSize,
  });
  return {
    canPurge: user.isSuperAdmin,
    list: list.map((row) => ({
      resourceType: "department",
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

export async function onRestore(
  params: RecycleBinMutationInput,
  user: UserObj
): Promise<number> {
  await requirePermission(user, "restore");
  return restoreDeletedDepartment(
    params.id,
    params.expectedDeletedTimeUtc,
    user.userId
  );
}

export async function onPurge(
  params: RecycleBinMutationInput,
  user: UserObj
): Promise<number> {
  await user.ensureLoaded();
  if (!user.isSuperAdmin) {
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  }
  return purgeDeletedDepartment(
    params.id,
    params.expectedDeletedTimeUtc,
    user.userId
  );
}

export default {
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
