import db from "@/db/index";
import {
  userTable,
  IndexVO,
  UserUniqueVO,
  UserBaseVO,
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
} from "./db.table";
import { utils as departmentUtils } from "@/api/system/department/service";
import { utils as roleUtils } from "@/api/system/role/service";
import regionService, { utils as regionUtils } from "@/api/i18n/region/service";
import { utils as languageUtils } from "@/api/i18n/language/service";
import { asc, count, desc, eq, or, like, and } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import bcrypt from "bcrypt";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import { SALT_ROUNDS, SUPER_ADMIN_ID } from "@/db/init";
import hasValue from "@/utils/hasValue";
import {
  listAllReqBase,
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError/index";

// 构建查询条件(列表和全部通用)
const buildWhereCondition = ({
  keyword,
  isEnabled,
}: Pick<FromSchema<typeof listReq>, "keyword" | "isEnabled">) => {
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(or(like(userTable.username, `%${keyword}%`)));
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(userTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

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
  const { orderBy = "id", descend = true } = params;
  const orderField = userTable[orderBy] || userTable.id;
  const maxLimit = 10000; // 设置最大返回数量限制，防止数据过大
  // 查询所有匹配的数据
  const rows = await db
    .select({
      id: userTable.id,
      username: userTable.username,
      langCode: userTable.langCode,
      remark: userTable.remark,
      departmentId: userTable.departmentId,
      roleIdArr: userTable.roleIdArr,
      isEnabled: userTable.isEnabled,
    })
    .from(userTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(maxLimit);
  return rows;
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
  const offset = (pageNo - 1) * pageSize;
  const orderField = userTable[orderBy] || userTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 查询总数
  const countResult = await db
    .select({ total: count(userTable.id).as("total") })
    .from(userTable)
    .where(buildWhereCondition(params));
  const total = countResult[0]?.total;
  if (total === 0) {
    return {
      total,
      totalPage: 0,
      currentPage: pageNo,
      pageSize: finalPageSize,
      list: [],
    };
  }
  // 查询列表数据
  const rows = await db
    .select()
    .from(userTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(finalPageSize)
    .offset(offset);
  const rowsFiltered = rows.map((row) => {
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
  if (departmentId) await departmentUtils.verifyDepartment(departmentId);
  if (regionId) await regionUtils.verifyRegion(regionId);
  await roleUtils.verifyRoles(roleIdArr);

  // 插入用户数据
  const res = await db
    .insert(userTable)
    .values({
      username,
      password,
      langCode,
      remark,
      departmentId,
      regionId,
      roleIdArr,
      isEnabled,
      creatorId,
    })
    .returning({ id: userTable.id });
  if (!res || res.length === 0) {
    throw new BusinessError(BusinessErrorCode["NOT_EXIST_OR_DISABLED"]);
  }
  return res[0].id;
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
  const isEnabled = id === SUPER_ADMIN_ID ? true : params.isEnabled; // 禁止禁用超级管理员
  let updateData = {
    ...rest,
    updaterId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
    password: undefined,
    departmentId: undefined,
    regionId: undefined,
    roleIdArr: undefined,
    isEnabled: undefined,
    langCode: undefined,
  };
  if (langCode !== undefined) {
    await languageUtils.verifyLangCode(langCode);
    updateData = {
      ...updateData,
      langCode,
    };
  }
  if (departmentObj !== undefined) {
    const departmentId = departmentObj ? departmentObj.value : null;
    if (departmentId) await departmentUtils.verifyDepartment(departmentId);
    updateData = {
      ...updateData,
      departmentId,
    };
  }
  if (regionObj !== undefined) {
    const regionId = regionObj ? regionObj.value : null;
    if (regionId) await regionUtils.verifyRegion(regionId);
    updateData = {
      ...updateData,
      regionId,
    };
  }
  if (roleArr !== undefined) {
    const roleIdArr = roleArr ? roleArr.map((o) => o.value) : [];
    await roleUtils.verifyRoles(roleIdArr);
    updateData = {
      ...updateData,
      roleIdArr,
    };
  }
  if (isEnabled !== undefined) {
    updateData = {
      ...updateData,
      isEnabled,
    };
  }

  const res = await db
    .update(userTable)
    .set(updateData)
    .where(eq(userTable.id, id))
    .returning({ id: userTable.id });
  if (!res || res.length === 0) {
    throw new BusinessError(BusinessErrorCode["NOT_EXIST_OR_DISABLED"]);
  }
  return res[0].id;
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
  if (id === SUPER_ADMIN_ID) {
    throw new BusinessError(BusinessErrorCode["PERMISSION_DENIED"]);
  }
  const res = await db
    .delete(userTable)
    .where(eq(userTable.id, id))
    .returning({ id: userTable.id });
  if (!res || res.length === 0) {
    throw new BusinessError(BusinessErrorCode["NOT_EXIST_OR_DISABLED"]);
  }
  return res[0].id;
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
async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = params;
  const rows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1);
  if (rows.length === 0) {
    throw new BusinessError(BusinessErrorCode["NOT_EXIST_OR_DISABLED"]);
  }
  const { password, departmentId, regionId, roleIdArr, ...rest } = rows[0];
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
} satisfies API;

async function convertPassword(base64Password: string): Promise<string> {
  const plainPassword = Buffer.from(base64Password, "base64").toString("utf-8");
  const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
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
  const isValid = await bcrypt.compare(password, _userObj.password);
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
  const res = await db
    .update(userTable)
    .set({
      password: newHashedPassword,
      updaterId,
      updateTimeUtc: getCurrentTimestampUtcSql(),
    })
    .where(eq(userTable.id, id))
    .returning({ id: userTable.id });
  if (res?.length === 0) {
    throw new BusinessError(BusinessErrorCode["NOT_EXIST_OR_DISABLED"]);
  }
  return res[0].id;
}

async function getUserObjByName(username: string): Promise<UserVOLike | null> {
  const userArr = await db
    .select()
    .from(userTable)
    .where(eq(userTable.username, username))
    .limit(1);
  if (userArr.length === 0) {
    throw new BusinessError(BusinessErrorCode["NOT_EXIST_OR_DISABLED"]);
  }
  const userObj = userArr[0];
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
    const regionData = await regionService.get.service({ id: regionId });
    if (!regionData) return null;
    return {
      value: regionId,
      label: regionData.alpha2Code,
    };
  } catch (error) {
    return null;
  }
}

export const utils = {
  getUserObjByName,
  convertPassword,
  verifyUsernameAndPassword,
  updatePassword,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
