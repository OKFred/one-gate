import db from "@/db/index";
import {
  userTable,
  IndexVO,
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
  type UserPOLike,
  type UserVOLike,
  type UserAddVOLike,
  type UserUpdateVOLike,
  type UserDeleteVOLike,
  type UserGetVOLike,
} from "./db.table";
import { utils as departmentUtils } from "@/api/system/department/service";
import { utils as roleUtils } from "@/api/system/role/service";
import { asc, count, desc, eq, or, like, and } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import bcrypt from "bcrypt";
import { HTTPException } from "hono/http-exception";
import type { LanguageKey } from "@/types/locales";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { SALT_ROUNDS, SUPER_ADMIN_ID } from "@/db/init";
import hasValue from "@/utils/hasValue";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import { bodyAdapter, bodyUserAdapter } from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    orderBy: orderByWrapper<(keyof UserPOLike)[]>([
      "id",
      "username",
      "langCode",
      "departmentId",
      "isEnabled",
      "createTimeUtc",
    ]),
    isEnabled: { type: "boolean", description: "是否启用状态过滤" },
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
  const {
    orderBy = "id",
    descend = true,
    pageNo = 1,
    pageSize = 10,
    keyword = "",
    isEnabled,
  } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = userTable[orderBy] || userTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 构建查询条件
  const buildWhereCondition = () => {
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

  // 查询总数
  const countResult = await db
    .select({ total: count(userTable.id).as("total") })
    .from(userTable)
    .where(buildWhereCondition());
  const total = countResult[0]?.total || 0;
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
    .where(buildWhereCondition())
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
    roleArr,
    departmentObj,
    isEnabled,
  } = params;
  const departmentId = departmentObj ? departmentObj.value : null;
  const roleIdArr = roleArr.map((o) => o.value);
  const password = await convertPassword(base64Password);

  const result = await db
    .insert(userTable)
    .values({
      username,
      password,
      langCode,
      departmentId,
      roleIdArr,
      isEnabled,
      creatorId,
    })
    .returning({ id: userTable.id });
  return result[0]?.id;
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
  const { id, departmentObj, roleArr, ...rest } = params;
  const departmentId = departmentObj ? departmentObj.value : null;
  const roleIdArr = roleArr ? roleArr.map((o) => o.value) : [];
  const isEnabled = id === SUPER_ADMIN_ID ? true : params.isEnabled; // 禁止禁用超级管理员
  let updateData = {
    ...rest,
    updaterId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
    password: undefined,
    departmentId: undefined,
    roleIdArr: undefined,
    isEnabled: undefined,
  };
  if (departmentObj !== undefined) {
    updateData = {
      ...updateData,
      departmentId,
    };
  }
  if (roleArr !== undefined) {
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
    throw new HTTPException(httpStatusCode.NOT_FOUND as ContentfulStatusCode, {
      message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
    });
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
    throw new HTTPException(httpStatusCode.FORBIDDEN as ContentfulStatusCode);
  }
  const result = await db
    .delete(userTable)
    .where(eq(userTable.id, id))
    .returning({ id: userTable.id });
  if (!result || result.length === 0) {
    throw new HTTPException(httpStatusCode.NOT_FOUND as ContentfulStatusCode, {
      message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
    });
  }
  return result[0].id;
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
    throw new HTTPException(httpStatusCode.NOT_FOUND as ContentfulStatusCode, {
      message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
    });
  }
  const { password, departmentId, roleIdArr, ...rest } = rows[0];
  const { departmentObj, roleArr } = await getDepartmentAndRoles(
    departmentId,
    roleIdArr
  );
  return {
    ...rest,
    departmentObj,
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

const updateLangCodeReq = {
  type: "object",
  properties: {
    langCode: UserVO.langCode,
  },
  required: ["langCode"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateLangCodeRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onUpdateLangCode(
  params: FromSchema<typeof updateLangCodeReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateLangCodeRes> | null> {
  const { userId: id } = userObj;
  const { userId: updaterId } = userObj;
  const { langCode } = params;
  const res = await db
    .update(userTable)
    .set({
      langCode,
      updaterId,
      updateTimeUtc: getCurrentTimestampUtcSql(),
    })
    .where(eq(userTable.id, id))
    .returning({ id: userTable.id });
  if (!res || res.length === 0) {
    throw new HTTPException(httpStatusCode.NOT_FOUND as ContentfulStatusCode, {
      message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
    });
  }
  return res[0].id;
}
const updateLangCodeApi = {
  req: updateLangCodeReq,
  res: updateLangCodeRes,
  pathInfo: {
    path: "/updateLangCode",
    method: "post",
    summary: "更新用户语言",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdateLangCode,
} satisfies API;

const updatePasswordReq = {
  type: "object",
  properties: {
    password: UserAddVO.password,
  },
  required: ["password"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
const updatePasswordRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onUpdatePassword(
  params: FromSchema<typeof updatePasswordReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updatePasswordRes> | null> {
  const { userId: id } = userObj;
  const { userId: updaterId } = userObj;
  const { password: base64Password } = params;
  const password = await convertPassword(base64Password);
  const res = await db
    .update(userTable)
    .set({
      password,
      updaterId,
      updateTimeUtc: getCurrentTimestampUtcSql(),
    })
    .where(eq(userTable.id, id))
    .returning({ id: userTable.id });
  if (!res || res.length === 0) {
    throw new HTTPException(httpStatusCode.NOT_FOUND as ContentfulStatusCode, {
      message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
    });
  }
  return res[0].id;
}
const updatePasswordApi = {
  req: updatePasswordReq,
  res: updatePasswordRes,
  pathInfo: {
    path: "/updatePassword",
    method: "post",
    summary: "更新用户密码",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdatePassword,
} satisfies API;

async function convertPassword(base64Password: string): Promise<string> {
  const plainPassword = Buffer.from(base64Password, "base64").toString("utf-8");
  const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  return hashedPassword;
}

async function verifyUsernameAndPassword({ username, password }): Promise<{
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

async function getUserObjByName(username: string): Promise<UserVOLike | null> {
  const userArr = await db
    .select()
    .from(userTable)
    .where(eq(userTable.username, username))
    .limit(1);
  if (userArr.length === 0) return null;
  const userObj = userArr[0];
  const { departmentId, roleIdArr, ...rest } = userObj;
  const { departmentObj, roleArr } = await getDepartmentAndRoles(
    departmentId,
    roleIdArr
  );
  return {
    ...rest,
    departmentObj,
    roleArr,
  };
}

async function getDepartmentAndRoles(
  departmentId: number | null,
  roleIdArr: number[]
) {
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
  return { departmentObj, roleArr };
}

export const utils = {
  getUserObjByName,
  convertPassword,
  verifyUsernameAndPassword,
};

export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
  updatePassword: updatePasswordApi,
  updateLangCode: updateLangCodeApi,
};
