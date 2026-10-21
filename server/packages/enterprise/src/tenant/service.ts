import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { UserObj } from "@hodor/core/types/app";
import { registry } from "@hodor/admin/common/registry";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import {
  TenantListReq,
  TenantListRes,
  TenantCreateReq,
  TenantUpdateReq,
  TenantChildrenListReq,
  TenantMemberListRes,
  TenantMemberSetReq,
  TenantOwnerTransferReq,
  TenantOwnerRecoverReq,
  TenantTokenGrantListRes,
  TenantTokenGrantSetReq,
  TenantIdRes,
  type TenantListInput,
  type TenantCreateInput,
  type TenantUpdateInput,
  type TenantChildrenListInput,
  type TenantMemberSetInput,
  type TenantOwnerTransferInput,
  type TenantOwnerRecoverInput,
  type TenantTokenGrantSetInput,
} from "./model";
import { getTenantContext, requireHuman } from "./context";
import { tenantRepository } from "./repository";
import { TenantError } from "./errors";

async function platform(user: UserObj) {
  const principal = requireHuman(user);
  await user.ensureLoaded();
  if (
    !user.isSuperAdmin ||
    !(await tenantRepository.canManagePlatform(principal))
  )
    throw new BusinessError(TenantError.PLATFORM_REQUIRED);
  return principal;
}

async function onList(input: TenantListInput, user: UserObj) {
  return tenantRepository.list(input, requireHuman(user));
}
async function onPlatformList(input: TenantListInput, user: UserObj) {
  return tenantRepository.list(input, await platform(user), true);
}
async function onCreate(input: TenantCreateInput, user: UserObj) {
  const actor = await platform(user);
  if (!input.name.trim())
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
  const owner = await registry.system.access.getUserMetadata(input.ownerUserId);
  if (!owner?.isEnabled) throw new BusinessError(TenantError.USER_UNAVAILABLE);
  return tenantRepository.create({ ...input, name: input.name.trim() }, actor);
}
async function onUpdate(input: TenantUpdateInput, user: UserObj) {
  const actor = await platform(user);
  if (!input.name.trim())
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
  return tenantRepository.update({ ...input, name: input.name.trim() }, actor);
}
async function onMemberList(input: TenantChildrenListInput, user: UserObj) {
  return tenantRepository.members(
    input,
    await getTenantContext(input.tenantId, user, "manage")
  );
}
async function onMemberSet(input: TenantMemberSetInput, user: UserObj) {
  const context = await getTenantContext(input.tenantId, user, "manage");
  if (input.isEnabled) {
    const target = await registry.system.access.getUserMetadata(input.userId);
    if (!target?.isEnabled)
      throw new BusinessError(TenantError.USER_UNAVAILABLE);
  }
  return tenantRepository.memberSet(input, context);
}
async function onTransferOwner(input: TenantOwnerTransferInput, user: UserObj) {
  const context = await getTenantContext(input.tenantId, user, "manage");
  return tenantRepository.transferOwner(input, context);
}
async function onRecoverOwner(input: TenantOwnerRecoverInput, user: UserObj) {
  const actor = await platform(user);
  if (!input.reason.trim())
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
  const target = await registry.system.access.getUserMetadata(input.userId);
  if (!target?.isEnabled) throw new BusinessError(TenantError.USER_UNAVAILABLE);
  const id = await tenantRepository.recoverOwner(
    { ...input, reason: input.reason.trim() },
    actor
  );
  console.info(
    JSON.stringify({
      event: "enterprise.tenant.owner_recovered",
      tenantId: id,
      actorId: actor.userId,
      ownerUserId: input.userId,
      reason: input.reason.trim(),
      timeUtc: Date.now(),
    })
  );
  return id;
}
async function onTokenGrantList(input: TenantChildrenListInput, user: UserObj) {
  return tenantRepository.tokenGrants(
    input,
    await getTenantContext(input.tenantId, user, "manage")
  );
}
async function onTokenGrantSet(input: TenantTokenGrantSetInput, user: UserObj) {
  const context = await getTenantContext(input.tenantId, user, "manage");
  let ownedTokenId: number | null = null;
  if (input.isEnabled) {
    const token = await registry.system.access.getApiTokenMetadata(
      input.tokenId
    );
    if (!token || token.creatorId !== user.userId || token.status !== "active")
      throw new BusinessError(TenantError.TOKEN_UNAVAILABLE);
    ownedTokenId = token.id;
  }
  return tenantRepository.tokenGrantSet(input, context, ownedTokenId);
}

export default {
  list: {
    req: TenantListReq,
    res: TenantListRes,
    pathInfo: { path: "/list", method: "post", summary: "List my enterprises" },
    adapter: bodyUserAdapter,
    service: onList,
    permission: { action: "read" },
  },
  platformList: {
    req: TenantListReq,
    res: TenantListRes,
    pathInfo: {
      path: "/platformList",
      method: "post",
      summary: "Platform enterprise management",
    },
    adapter: bodyUserAdapter,
    service: onPlatformList,
    permission: { action: "read" },
  },
  create: {
    req: TenantCreateReq,
    res: TenantIdRes,
    pathInfo: {
      path: "/create",
      method: "post",
      summary: "Create an enterprise and its first owner",
    },
    adapter: bodyUserAdapter,
    service: onCreate,
    permission: { action: "add" },
  },
  update: {
    req: TenantUpdateReq,
    res: TenantIdRes,
    pathInfo: {
      path: "/update",
      method: "post",
      summary: "Update enterprise settings",
    },
    adapter: bodyUserAdapter,
    service: onUpdate,
    permission: { action: "edit" },
  },
  memberList: {
    req: TenantChildrenListReq,
    res: TenantMemberListRes,
    pathInfo: {
      path: "/memberList",
      method: "post",
      summary: "List enterprise members",
    },
    adapter: bodyUserAdapter,
    service: onMemberList,
    permission: { action: "read" },
  },
  memberSet: {
    req: TenantMemberSetReq,
    res: TenantIdRes,
    pathInfo: {
      path: "/memberSet",
      method: "post",
      summary: "Add or update an enterprise member",
    },
    adapter: bodyUserAdapter,
    service: onMemberSet,
    permission: { action: "edit" },
  },
  transferOwner: {
    req: TenantOwnerTransferReq,
    res: TenantIdRes,
    pathInfo: {
      path: "/transferOwner",
      method: "post",
      summary: "Transfer enterprise ownership atomically",
    },
    adapter: bodyUserAdapter,
    service: onTransferOwner,
    permission: { action: "edit" },
  },
  recoverOwner: {
    req: TenantOwnerRecoverReq,
    res: TenantIdRes,
    pathInfo: {
      path: "/recoverOwner",
      method: "post",
      summary: "Platform owner recovery with an audit reason",
    },
    adapter: bodyUserAdapter,
    service: onRecoverOwner,
    permission: { action: "edit" },
  },
  tokenGrantList: {
    req: TenantChildrenListReq,
    res: TenantTokenGrantListRes,
    pathInfo: {
      path: "/tokenGrantList",
      method: "post",
      summary: "List enterprise machine grants",
    },
    adapter: bodyUserAdapter,
    service: onTokenGrantList,
    permission: { action: "read" },
  },
  tokenGrantSet: {
    req: TenantTokenGrantSetReq,
    res: TenantIdRes,
    pathInfo: {
      path: "/tokenGrantSet",
      method: "post",
      summary: "Manage an enterprise mapping token grant",
    },
    adapter: bodyUserAdapter,
    service: onTokenGrantSet,
    permission: { action: "edit" },
  },
} satisfies Record<string, API>;
