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
import type { NodeHonoContext, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { SALT_ROUNDS, SUPER_ADMIN_ID } from "@/db/init";
import hasValue from "@/utils/hasValue";

const listReq = {
  type: "object",
  properties: {
    orderBy: {
      type: "string",
      enum: [
        "id",
        "username",
        "langCode",
        "departmentId",
        "isEnabled",
        "createTimeUtc",
      ] satisfies (keyof UserPOLike)[],
    },
    descend: { type: "boolean" },
    pageNo: { type: "number", minimum: 1, default: 1 },
    pageSize: { type: "number", minimum: 1, maximum: 1000, default: 10 },
    keyword: {
      type: "string",
      examples: [""],
      description: "搜索用户名",
    },
    isEnabled: { type: "boolean", description: "是否启用状态过滤" },
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  type: "object",
  properties: {
    total: { type: "number", description: "总记录数" },
    totalPage: { type: "number", description: "总页数" },
    currentPage: { type: "number", description: "当前页码" },
    pageSize: { type: "number", description: "每页记录数" },
    list: {
      type: "array",
      oneOf: [
        {
          type: "array",
          items: {
            type: "object",
            properties: {
              ...UserListVO,
            },
            required: [...UserListKeys] as const satisfies RequiredKeys<
              Omit<UserPOLike, "password">
            >[],
            additionalProperties: false,
          },
        },
        {
          type: "array",
          maxItems: 0,
        },
      ],
    },
  },
  required: ["total", "totalPage", "currentPage", "pageSize", "list"],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onList(c: NodeHonoContext): Promise<FromSchema<typeof listRes>> {
  const listParamObj = c.get("bodyObj") as FromSchema<typeof listReq>;
  const {
    orderBy = "id",
    descend = true,
    pageNo = 1,
    pageSize = 10,
    keyword = "",
    isEnabled,
  } = listParamObj;
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
  service: onList,
};

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
  c: NodeHonoContext
): Promise<FromSchema<typeof addRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof addReq>;
  const userObj = c.get("userObj");
  const { userId: creatorId } = userObj;
  const {
    username,
    password: base64Password,
    langCode,
    roleArr,
    departmentObj,
    isEnabled,
  } = obj;
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
  service: onAdd,
};

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
  c: NodeHonoContext
): Promise<FromSchema<typeof updateRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof updateReq>;
  const userObj = c.get("userObj");
  const { userId: updaterId } = userObj;
  const { id, departmentObj, roleArr, ...rest } = obj;
  const departmentId = departmentObj ? departmentObj.value : null;
  const roleIdArr = roleArr ? roleArr.map((o) => o.value) : [];
  const isEnabled = id === SUPER_ADMIN_ID ? true : obj.isEnabled; // 禁止禁用超级管理员
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
  if (!res || res.length === 0) return null;
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
  service: onUpdate,
};

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
  c: NodeHonoContext
): Promise<FromSchema<typeof deleteRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof deleteReq>;
  const { id } = uniqueKeyObj;
  if (id === SUPER_ADMIN_ID) {
    throw new HTTPException(httpStatusCode.FORBIDDEN as ContentfulStatusCode);
  }
  const result = await db
    .delete(userTable)
    .where(eq(userTable.id, id))
    .returning({ id: userTable.id });
  if (!result || result.length === 0) return null;
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
  service: onDelete,
};

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
  c: NodeHonoContext
): Promise<FromSchema<typeof getRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof getReq>;
  const { id } = uniqueKeyObj;
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
  const departmentObj = departmentId
    ? {
        label:
          (await departmentUtils.getDepartmentNameById(departmentId)) || "",
        value: departmentId,
      }
    : null;
  const roleArr =
    roleIdArr.length > 0 ? await roleUtils.getRolesByIds(roleIdArr) : [];
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
  service: onGet,
};

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
  c: NodeHonoContext
): Promise<FromSchema<typeof updateLangCodeRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof updateLangCodeReq>;
  const userObj = c.get("userObj");
  const { userId: id } = userObj;
  const { userId: updaterId } = userObj;
  const { langCode } = obj;
  const res = await db
    .update(userTable)
    .set({
      langCode,
      updaterId,
      updateTimeUtc: getCurrentTimestampUtcSql(),
    })
    .where(eq(userTable.id, id))
    .returning({ id: userTable.id });
  if (!res || res.length === 0) return null;
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
  service: onUpdateLangCode,
};

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
  c: NodeHonoContext
): Promise<FromSchema<typeof updatePasswordRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof updatePasswordReq>;
  const userObj = c.get("userObj");
  const { userId: id } = userObj;
  const { userId: updaterId } = userObj;
  const { password: base64Password } = obj;
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
  if (!res || res.length === 0) return null;
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
  service: onUpdatePassword,
};

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
  const departmentObj = departmentId
    ? {
        label:
          (await departmentUtils.getDepartmentNameById(departmentId)) || "",
        value: departmentId,
      }
    : null;
  const roleArr =
    roleIdArr.length > 0 ? await roleUtils.getRolesByIds(roleIdArr) : [];
  return {
    ...rest,
    departmentObj,
    roleArr,
  };
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
