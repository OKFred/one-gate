import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import type { UserObj } from "@hodor/core/types/app";
import type { JSONSchema } from "json-schema-to-ts";
import { getTenantContext, getMappingContext } from "../tenant/context";
import {
  AssetListReq,
  AssetListRes,
  AssetGetReq,
  AssetGetRes,
  AssetAddReq,
  AssetUpdateReq,
  AssetStateReq,
  MutationRes,
  ChildListReq,
  IdentifierListRes,
  IdentifierAddReq,
  IdentifierUpdateReq,
  AssignmentListRes,
  AssignReq,
  CloseRelationReq,
  BindingListRes,
  BindReq,
  MappingResolveReq,
  MappingResolveRes,
  MappingListReq,
  MappingListRes,
  type AssetListInput,
  type AssetGetInput,
  type AssetAddInput,
  type AssetUpdateInput,
  type AssetStateInput,
  type IdentifierAddInput,
  type IdentifierUpdateInput,
  type ChildListInput,
  type AssignInput,
  type BindInput,
  type CloseRelationInput,
  type MappingResolveInput,
  type MappingListInput,
} from "./model";
import { assetRepository } from "./repository";
import { AssetError } from "./errors";

function api<
  const Req extends JSONSchema,
  const Res extends JSONSchema,
  Input,
  Result,
>(
  path: string,
  req: Req,
  res: Res,
  action: "read" | "add" | "edit",
  service: (params: Input, user: UserObj) => Promise<Result>
) {
  return {
    req,
    res,
    pathInfo: {
      path,
      method: "post",
      summary: `Enterprise asset ${path.slice(1)}`,
    } as const,
    adapter: bodyUserAdapter,
    service,
    permission: { action },
  };
}

function requireText(...values: string[]) {
  if (values.some((value) => value.trim().length === 0))
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS);
}
function requireInterval(input: {
  validFromUtc: number;
  validToUtc?: number | null;
  replacesId?: number;
  expectedUpdateTimeUtc?: number | null;
}) {
  if (
    input.validToUtc !== undefined &&
    input.validToUtc !== null &&
    input.validToUtc <= input.validFromUtc
  )
    throw new BusinessError(AssetError.INVALID_INTERVAL);
  if (
    input.replacesId !== undefined &&
    !Object.hasOwn(input, "expectedUpdateTimeUtc")
  )
    throw new BusinessError(AssetError.STATE_CONFLICT);
}

export function normalizeIdentifier(input: IdentifierAddInput): string {
  requireText(input.value, input.source);
  const raw = input.value.trim();
  const placeholder = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (
    !placeholder ||
    /^(?:0+|f+|na|none|null|unknown|notavailable|defaultstring|tobefilledbyoem|systemserialnumber|serialnumber)$/i.test(
      placeholder
    )
  )
    throw new BusinessError(AssetError.INVALID_IDENTIFIER);
  if (input.isVerified && input.namespace.trim().length === 0)
    throw new BusinessError(AssetError.INVALID_IDENTIFIER);
  if (input.identifierType === "wwn") {
    const normalized = raw
      .replace(/^0x/i, "")
      .replace(/[:\s-]/g, "")
      .toLowerCase();
    if (!/^[0-9a-f]{16}$/.test(normalized) || /^(?:0+|f+)$/.test(normalized))
      throw new BusinessError(AssetError.INVALID_IDENTIFIER);
    return normalized;
  }
  if (input.identifierType === "gpu_uuid") {
    const normalized = raw.replace(/^gpu-/i, "").toLowerCase();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        normalized
      ) ||
      /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(normalized)
    )
      throw new BusinessError(AssetError.INVALID_IDENTIFIER);
    return `gpu-${normalized}`;
  }
  // SN/SID can be case-sensitive and contain meaningful separators or leading zeroes.
  return raw;
}

const list = api(
  "/list",
  AssetListReq,
  AssetListRes,
  "read",
  async (params: AssetListInput, user) =>
    assetRepository.findPage(
      await getTenantContext(
        params.tenantId,
        user,
        "read",
        "enterprise.asset:read"
      ),
      params
    )
);
const get = api(
  "/get",
  AssetGetReq,
  AssetGetRes,
  "read",
  async (params: AssetGetInput, user) => {
    const item = await assetRepository.findById(
      await getTenantContext(
        params.tenantId,
        user,
        "read",
        "enterprise.asset:read"
      ),
      params.id
    );
    if (!item) throw new BusinessError(AssetError.NOT_VISIBLE);
    return item;
  }
);
const add = api(
  "/add",
  AssetAddReq,
  MutationRes,
  "add",
  async (params: AssetAddInput, user) => {
    requireText(params.name);
    return assetRepository.add(
      await getTenantContext(
        params.tenantId,
        user,
        "edit",
        "enterprise.asset:add"
      ),
      params
    );
  }
);
const update = api(
  "/update",
  AssetUpdateReq,
  MutationRes,
  "edit",
  async (params: AssetUpdateInput, user) => {
    requireText(params.name);
    return assetRepository.update(
      await getTenantContext(
        params.tenantId,
        user,
        "edit",
        "enterprise.asset:edit"
      ),
      params
    );
  }
);
const retire = api(
  "/retire",
  AssetStateReq,
  MutationRes,
  "edit",
  async (params: AssetStateInput, user) => {
    requireText(params.reason);
    return assetRepository.retire(
      await getTenantContext(
        params.tenantId,
        user,
        "edit",
        "enterprise.asset:edit"
      ),
      params
    );
  }
);
const activate = api(
  "/activate",
  AssetStateReq,
  MutationRes,
  "edit",
  async (params: AssetStateInput, user) => {
    requireText(params.reason);
    return assetRepository.activate(
      await getTenantContext(
        params.tenantId,
        user,
        "edit",
        "enterprise.asset:edit"
      ),
      params
    );
  }
);
const identifierList = api(
  "/identifierList",
  ChildListReq,
  IdentifierListRes,
  "read",
  async (params: ChildListInput, user) =>
    assetRepository.identifiers(
      await getTenantContext(
        params.tenantId,
        user,
        "read",
        "enterprise.asset:read"
      ),
      params
    )
);
const identifierAdd = api(
  "/identifierAdd",
  IdentifierAddReq,
  MutationRes,
  "edit",
  async (params: IdentifierAddInput, user) =>
    assetRepository.addIdentifier(
      await getTenantContext(
        params.tenantId,
        user,
        "edit",
        "enterprise.asset:edit"
      ),
      params,
      normalizeIdentifier(params)
    )
);
const identifierUpdate = api(
  "/identifierUpdate",
  IdentifierUpdateReq,
  MutationRes,
  "edit",
  async (params: IdentifierUpdateInput, user) =>
    assetRepository.updateIdentifier(
      await getTenantContext(
        params.tenantId,
        user,
        "edit",
        "enterprise.asset:edit"
      ),
      params,
      normalizeIdentifier(params)
    )
);
const assignmentList = api(
  "/assignmentList",
  ChildListReq,
  AssignmentListRes,
  "read",
  async (params: ChildListInput, user) =>
    assetRepository.assignments(
      await getTenantContext(
        params.tenantId,
        user,
        "read",
        "enterprise.asset:read"
      ),
      params
    )
);
const assign = api(
  "/assign",
  AssignReq,
  MutationRes,
  "edit",
  async (params: AssignInput, user) => {
    requireText(params.reason);
    requireInterval(params);
    return assetRepository.assign(
      await getTenantContext(
        params.tenantId,
        user,
        "edit",
        "enterprise.asset:edit"
      ),
      params
    );
  }
);
const closeAssignment = api(
  "/closeAssignment",
  CloseRelationReq,
  MutationRes,
  "edit",
  async (params: CloseRelationInput, user) => {
    requireText(params.reason);
    return assetRepository.closeAssignment(
      await getTenantContext(
        params.tenantId,
        user,
        "edit",
        "enterprise.asset:edit"
      ),
      params
    );
  }
);
const bindingList = api(
  "/bindingList",
  ChildListReq,
  BindingListRes,
  "read",
  async (params: ChildListInput, user) =>
    assetRepository.bindings(
      await getTenantContext(
        params.tenantId,
        user,
        "read",
        "enterprise.asset:read"
      ),
      params
    )
);
const bind = api(
  "/bind",
  BindReq,
  MutationRes,
  "edit",
  async (params: BindInput, user) => {
    requireText(
      params.sourceSystem,
      params.collectorId,
      params.deviceId,
      params.metric,
      params.reason
    );
    requireInterval(params);
    return assetRepository.bind(
      await getTenantContext(
        params.tenantId,
        user,
        "edit",
        "enterprise.asset:edit"
      ),
      params
    );
  }
);
const closeBinding = api(
  "/closeBinding",
  CloseRelationReq,
  MutationRes,
  "edit",
  async (params: CloseRelationInput, user) => {
    requireText(params.reason);
    return assetRepository.closeBinding(
      await getTenantContext(
        params.tenantId,
        user,
        "edit",
        "enterprise.asset:edit"
      ),
      params
    );
  }
);
export const mappingService = {
  resolve: api(
    "/resolve",
    MappingResolveReq,
    MappingResolveRes,
    "read",
    async (params: MappingResolveInput, user) => {
      requireText(
        params.sourceSystem,
        params.collectorId,
        params.deviceId,
        params.metric
      );
      return assetRepository.resolve(
        await getMappingContext(
          params.tenantId,
          user,
          "enterprise.asset.mapping:read"
        ),
        params
      );
    }
  ),
  list: api(
    "/list",
    MappingListReq,
    MappingListRes,
    "read",
    async (params: MappingListInput, user) =>
      assetRepository.mappingPage(
        await getMappingContext(
          params.tenantId,
          user,
          "enterprise.asset.mapping:read"
        ),
        params
      )
  ),
} satisfies Record<string, API>;
export default {
  list,
  get,
  add,
  update,
  retire,
  activate,
  identifierList,
  identifierAdd,
  identifierUpdate,
  assignmentList,
  assign,
  closeAssignment,
  bindingList,
  bind,
  closeBinding,
} satisfies Record<string, API>;
