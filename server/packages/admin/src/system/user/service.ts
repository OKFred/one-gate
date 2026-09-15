import {
  IndexVO,
  UserUniqueVO,
  UserVO,
  UserListVO,
  UserAddVO,
  UserUpdateVO,
  UserListKeys,
  UserDetailKeys,
  UserGetKeys,
  UserDeleteKeys,
  UserAddKeys,
  UserUpdateKeys,
  UserUniqueKeys,
  UserSortableKeys,
  type UserPOLike,
  type UserVOLike,
  type UserAddVOLike,
  type UserUpdateVOLike,
  type UserDeleteVOLike,
  type UserGetVOLike,
  UserBasePO,
} from "./model";
import { utils as departmentUtils } from "../department/service";
import { utils as roleUtils } from "../role/service";
import { registry } from "../../common/registry.js";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { hashPassword, verifyPassword } from "@hodor/core/utils/crypto";
import type { RequiredKeys, UserObj } from "@hodor/core/types/app";
import {
  preventSuperAdminDelete,
  preventSuperAdminDisable,
  preventAssignSuperAdminRole,
  preventMissingDepartment,
  preventMissingRoles,
  preventMissingRegion,
  preventInvalidLangCode,
} from "./prevention";
import {
  listAllReqBase,
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { kv } from "@hodor/core/middleware/cache";
import { userRepository } from "./repository";

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: UserVO["isEnabled"],
    orderBy: orderByWrapper<(keyof UserPOLike)[]>(UserSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...IndexVO,
      ...UserUniqueVO,
      ...UserBasePO,
    },
    required: [...UserGetKeys, ...UserUniqueKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  return await userRepository.findAll(params);
}
const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有用户（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: UserVO["isEnabled"],
    orderBy: orderByWrapper<(keyof UserPOLike)[]>(UserSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<Omit<UserPOLike, "password">>[]>(
    {
      ...UserListVO,
    },
    [...UserListKeys]
  ),
} as const satisfies JSONSchema;
async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const finalPageSize = pageSize > 1000 ? 1000 : pageSize;

  const { total, list } = await userRepository.findPage({
    keyword: params.keyword,
    isEnabled: params.isEnabled,
    orderBy,
    descend,
    pageNo,
    pageSize: finalPageSize,
  });

  const rowsFiltered = list.map((row) => {
    const { password, ...rest } = row; // 注意：不返回密码字段
    return rest;
  });
  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: rowsFiltered,
  };
}
const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取用户列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...UserAddVO,
  } satisfies Partial<Record<keyof UserAddVOLike, JSONSchema>>,
  required: [...UserAddKeys] as const satisfies RequiredKeys<UserAddVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const addRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onAdd(
  params: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;
  const {
    username,
    password: base64Password,
    langCode,
    remark,
    roleArr,
    departmentObj,
    regionObj,
    isEnabled,
  } = params;
  const departmentId = departmentObj ? departmentObj.value : null;
  const regionId = regionObj ? regionObj.value : null;
  const roleIdArr = roleArr.map((o) => o.value);
  const password = await convertPassword(base64Password);

  // 前置校验
  preventAssignSuperAdminRole(roleIdArr);
  await preventMissingDepartment(departmentId);
  await preventMissingRegion(regionId);
  await preventMissingRoles(roleIdArr);
  await preventInvalidLangCode(langCode);

  // 插入用户数据
  const insertedId = await userRepository.onInsert({
    username,
    password,
    langCode,
    remark,
    departmentId,
    regionId,
    roleIdArr,
    isEnabled,
    creatorId,
  });
  return insertedId;
}
const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加用户",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...UserUpdateVO,
  },
  required: [
    ...UserUpdateKeys,
  ] as const satisfies RequiredKeys<UserUpdateVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateRes> | null> {
  const { userId: updaterId } = userObj;
  const { id, departmentObj, regionObj, roleArr, langCode, ...rest } = params;

  // 前置校验
  if (roleArr !== undefined) {
    const roleIdArr = roleArr.map((o) => o.value);
    preventAssignSuperAdminRole(roleIdArr);
    preventSuperAdminDisable(roleIdArr, params.isEnabled);
    await preventMissingRoles(roleIdArr);
  }
  if (langCode !== undefined) await preventInvalidLangCode(langCode);
  if (departmentObj !== undefined)
    await preventMissingDepartment(departmentObj?.value ?? null);
  if (regionObj !== undefined)
    await preventMissingRegion(regionObj?.value ?? null);

  const updateData = {
    ...rest,
    updaterId,
    departmentId:
      departmentObj === undefined ? undefined : (departmentObj?.value ?? null),
    regionId: regionObj?.value,
    roleIdArr: roleArr?.map((o) => o.value),
    isEnabled: params.isEnabled,
    langCode,
  };

  const updatedId = await userRepository.onUpdate(id, updateData);
  kv.delete(`system.auth.bundle:${id}`).catch(() => {});
  return updatedId;
}
const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新用户",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

const deleteReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...UserDeleteKeys,
  ] as const satisfies RequiredKeys<UserDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onDelete(
  params: FromSchema<typeof deleteReq>
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = params;
  const thisUser = await onGet({ id });

  // 前置校验
  preventSuperAdminDelete(thisUser?.roleArr.map((r) => r.value) ?? []);
  const deletedId = await userRepository.onDelete(id);
  kv.delete(`system.auth.bundle:${id}`).catch(() => {});
  return deletedId;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除用户",
  } as const,
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [...UserGetKeys] as const satisfies RequiredKeys<UserGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...UserVO,
  },
  required: [...UserDetailKeys] as const satisfies RequiredKeys<UserVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

export type { UserObj };
async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = params;
  const row = await userRepository.findById(id);
  preventEmpty(row);
  const { password, departmentId, regionId, roleIdArr, ...rest } = row;
  const { departmentObj, regionObj, roleArr } = await getDTOs({
    departmentId,
    regionId,
    roleIdArr,
  });
  return {
    ...rest,
    departmentObj,
    regionObj,
    roleArr,
  };
}
const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取用户",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

async function convertPassword(base64Password: string): Promise<string> {
  const plainPassword = Buffer.from(base64Password, "base64").toString("utf-8");
  const hashedPassword = await hashPassword(plainPassword);
  return hashedPassword;
}

async function verifyUsernameAndPassword({
  username,
  password,
}: {
  username: string;
  password: string;
}): Promise<{
  userObj?: Omit<UserVOLike, "password">;
  valid: boolean;
}> {
  const _userObj = await getUserObjByName(username);
  if (!_userObj) return { valid: false };
  const isValid = await verifyPassword(password, _userObj.password);
  if (!isValid) return { valid: false };
  const { password: _, ...rest } = _userObj; // 注意：不返回密码字段
  return {
    valid: true,
    userObj: {
      ...rest,
    },
  };
}

async function updatePassword(
  { id, newHashedPassword },
  userObj: UserObj
): Promise<number> {
  const { userId: updaterId } = userObj;
  const updatedId = await userRepository.onUpdate(id, {
    password: newHashedPassword,
    updaterId,
  });
  return updatedId;
}

async function getUserObjByName(username: string): Promise<UserVOLike | null> {
  const userObj = await userRepository.findByUsername(username);
  preventEmpty(userObj);
  const { departmentId, regionId, roleIdArr, ...rest } = userObj;
  const { departmentObj, regionObj, roleArr } = await getDTOs({
    departmentId,
    regionId,
    roleIdArr,
  });
  return {
    ...rest,
    departmentObj,
    regionObj,
    roleArr,
  };
}

async function getDTOs({
  departmentId,
  regionId,
  roleIdArr,
}: {
  departmentId: number | null;
  regionId: number | null;
  roleIdArr: number[];
}) {
  const departmentObj =
    departmentId === null
      ? null
      : {
          label:
            (await departmentUtils.getDepartmentNameById(departmentId)) || "",
          value: departmentId,
        };
  const roleArr =
    roleIdArr.length > 0 ? await roleUtils.getRolesByIds(roleIdArr) : [];
  const regionObj = await getRegionObj(regionId);
  return { regionObj, departmentObj, roleArr };
}

async function getRegionObj(
  regionId: number | null
): Promise<{ value: number; label: string } | null> {
  if (regionId === null) return null;
  try {
    const regionData = await registry.i18n.getRegion(regionId);
    if (!regionData) return null;
    return {
      value: regionId,
      label: regionData.alpha2Code,
    };
  } catch (error) {
    return null;
  }
}

/**
 * 检查部门下的人员数量
 * @param departmentIds 部门ID列表
 * @returns 人员数量
 */
async function countDepartmentUsers(
  departmentIds: number[],
  isEnabled: boolean
): Promise<number> {
  return await userRepository.countDepartmentUsers(departmentIds, isEnabled);
}

/** 更新用户语言 */
export async function updateLangCode(
  updateData: {
    id: number;
    langCode: string;
  },
  userObj: UserObj
): Promise<number> {
  const updatedId = await userRepository.onUpdate(updateData.id, {
    langCode: updateData.langCode,
    updaterId: userObj.userId,
  });
  return updatedId;
}

/** 更新用户信息 */
async function updateUserInfo(
  updateData: {
    id: number;
    regionObj?: { value: number; label: string } | null;
    remark?: string;
  },
  userObj: UserObj
): Promise<number> {
  const { id, regionObj, remark } = updateData;
  const setData: Partial<UserPOLike> = {
    updaterId: userObj.userId,
  };
  if (regionObj !== undefined) {
    const regionId = regionObj ? regionObj.value : null;
    if (regionId) await registry.i18n.verifyRegion(regionId);
    setData.regionId = regionId;
  }
  if (remark !== undefined) {
    setData.remark = remark;
  }
  const updatedId = await userRepository.onUpdate(id, setData);
  return updatedId;
}

async function getUserNameById(
  userId: UserVOLike["id"]
): Promise<UserVOLike["username"]> {
  const username = await userRepository.getUserNameById(userId);
  preventEmpty(username);
  return username;
}

async function getUser(id: number) {
  return await onGet({ id });
}

async function getUserNameMapByIds(userIds: number[]) {
  return await userRepository.getUserNameMapByIds(userIds);
}

async function onInsert(data: Parameters<typeof userRepository.onInsert>[0]) {
  return await userRepository.onInsert(data);
}

export const utils = {
  countDepartmentUsers,
  convertPassword,
  verifyUsernameAndPassword,
  updatePassword,
  updateLangCode,
  updateUserInfo,
  getUserNameById,
  getUserNameMapByIds,
  getUser,
  onInsert,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
