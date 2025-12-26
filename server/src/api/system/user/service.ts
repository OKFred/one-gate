import db from "@/db/index";
import {
  userIndex,
  userUnique,
  userAudit,
  userTable,
  userData,
  userVOData,
  userOmitPasswordData,
  userOmitPasswordVOData,
  type userAddLike,
  type userLike,
  type userVOLike,
  type userAddVOLike,
} from "./db.table";
import { getDepartmentNameById } from "@/api/system/department/service";
import { getRolesByIds } from "@/api/system/role/service";
import { asc, count, desc, eq, or, like, and, inArray } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import bcrypt from "bcrypt";
import { HTTPException } from "hono/http-exception";
import type { LanguageKey } from "@/types/locales";
import type { NodeHonoContext } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";

const SALT_ROUNDS = 12; // bcrypt盐轮数
const superAdminId = 1; // 超级管理员用户ID

const addReq = {
  type: "object",
  properties: {
    ...userUnique,
    ...userVOData,
  } satisfies Partial<Record<keyof userAddVOLike, JSONSchema>>,
  required: ["username", "password", "langCode", "roleArr"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const addRes = {
  ...userIndex["id"],
} as const satisfies JSONSchema;
async function onAdd(
  c: NodeHonoContext
): Promise<FromSchema<typeof addRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof addReq>;
  const {
    username,
    password,
    langCode,
    roleArr,
    departmentObj,
    isEnabled = true,
  } = obj;
  const departmentId = departmentObj ? departmentObj.value : null;
  const roleIdArr = roleArr.map((o) => o.value);

  // 密码加盐处理
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await db
    .insert(userTable)
    .values({
      username,
      password: hashedPassword,
      langCode,
      departmentId,
      roleIdArr,
      isEnabled,
    } satisfies userAddLike)
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

const deleteReq = {
  type: "object",
  properties: {
    ...userIndex,
  },
  required: ["id"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
const deleteRes = {
  ...userIndex["id"],
} as const satisfies JSONSchema;
async function onDelete(
  c: NodeHonoContext
): Promise<FromSchema<typeof deleteRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof deleteReq>;
  const { id } = uniqueKeyObj;
  if (id === undefined) return null;
  if (id === superAdminId) {
    throw new HTTPException(httpStatusCode.FORBIDDEN as ContentfulStatusCode);
  }
  const result = await db
    .delete(userTable)
    .where(eq(userTable.id, id))
    .returning({
      id: userTable.id,
    });
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
      ] satisfies (keyof userLike)[],
    },
    descend: { type: "boolean" },
    pageNo: { type: "number", minimum: 1, default: 1 },
    pageSize: { type: "number", maximum: 1000, default: 10 },
    keyword: {
      type: "string",
      examples: [""],
      description: "搜索用户名、部门或角色",
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
      items: {
        type: "object",
        properties: {
          ...userIndex,
          ...userUnique,
          ...userOmitPasswordData,
          ...userAudit,
        },
        required: ["id", "username", "langCode", "isEnabled", "createTimeUtc"],
        additionalProperties: false,
      },
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

  // 函数重载：根据 getAll 参数提供不同的返回类型
  function queryDB(getAll: true): Promise<{ total: number }[]>;
  function queryDB(getAll: false): Promise<userLike[]>;
  function queryDB(getAll: boolean): Promise<{ total: number }[] | userLike[]> {
    const baseQuery = db
      .select(getAll ? { total: count(userTable.id).as("total") } : undefined)
      .from(userTable)
      .where(
        and(
          keyword ? or(like(userTable.username, `%${keyword}%`)) : undefined,
          isEnabled !== undefined
            ? eq(userTable.isEnabled, isEnabled)
            : undefined
        )
      )
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(getAll ? maxPageSize : finalPageSize)
      .offset(getAll ? 0 : offset);
    return baseQuery;
  }
  const getAllResult = await queryDB(true);
  const total = getAllResult[0]?.total || 0;
  if (total === 0) {
    return {
      total,
      totalPage: 0,
      currentPage: pageNo,
      pageSize: finalPageSize,
      list: [],
    };
  }
  const rows = await queryDB(false);
  const rowsFiltered: Omit<userLike, "password">[] = rows.map((row) => {
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

const updateReq = {
  type: "object",
  properties: {
    ...userIndex,
    ...userUnique,
    ...userVOData,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateRes = {
  ...userIndex["id"],
} as const satisfies JSONSchema;
async function onUpdate(
  c: NodeHonoContext
): Promise<FromSchema<typeof updateRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof updateReq>;
  const userObj = c.get("userObj");
  const { id, password, departmentObj, roleArr, ...rest } = obj;
  const departmentId = departmentObj ? departmentObj.value : null;
  const roleIdArr = roleArr ? roleArr.map((o) => o.value) : [];
  const isEnabled = id === superAdminId ? true : obj.isEnabled; // 禁止禁用超级管理员
  let updateData = {
    ...rest,
    id,
    password: undefined,
    departmentId,
    roleIdArr,
    isEnabled, // 禁止禁用超级管理员
    updaterId: userObj.userId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  // 如果更新密码，需要重新加盐
  if (password) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    updateData.password = hashedPassword;
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

const getReq = {
  type: "object",
  properties: {
    ...userIndex,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...userIndex,
    ...userUnique,
    ...userOmitPasswordVOData,
    ...userAudit,
  },
  required: [
    "id",
    "username",
    "langCode",
    "isEnabled",
    "roleArr",
    "createTimeUtc",
  ],
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
    throw new HTTPException(404, {
      message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
    });
  }
  const { password, departmentId, roleIdArr, ...rest } = rows[0];
  const departmentObj = departmentId
    ? {
        label: (await getDepartmentNameById(departmentId)) || "",
        value: departmentId,
      }
    : null;
  const roleArr = roleIdArr.length > 0 ? await getRolesByIds(roleIdArr) : [];
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

export async function verifyUsernameAndPassword({
  username,
  password,
}): Promise<{
  userObj?: Omit<userVOLike, "password">;
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

export async function getUserObjByName(
  username: string
): Promise<userVOLike | null> {
  const userArr = await db
    .select()
    .from(userTable)
    .where(eq(userTable.username, username))
    .limit(1);
  if (userArr.length === 0) return null;
  const userObj = userArr[0];
  if (!userObj.isEnabled) return null;
  const { departmentId, roleIdArr, ...rest } = userObj;
  const departmentObj = departmentId
    ? {
        label: (await getDepartmentNameById(departmentId)) || "",
        value: departmentId,
      }
    : null;
  const roleArr = roleIdArr.length > 0 ? await getRolesByIds(roleIdArr) : [];
  return {
    ...rest,
    departmentObj,
    roleArr,
  };
}

const updateLangCodeReq = {
  type: "object",
  properties: {
    id: userIndex.id,
    langCode: userData.langCode,
  },
  required: ["id", "langCode"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateLangCodeRes = {
  ...userIndex["id"],
} as const satisfies JSONSchema;
async function onUpdateLangCode(
  c: NodeHonoContext
): Promise<FromSchema<typeof updateLangCodeRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof updateLangCodeReq>;
  const userObj = c.get("userObj");
  const { id, langCode } = obj;

  const res = await db
    .update(userTable)
    .set({
      langCode,
      // updaterId: userObj.userId,
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

export default {
  add: addApi,
  delete: deleteApi,
  list: listApi,
  update: updateApi,
  get: getApi,
  updateLangCode: updateLangCodeApi,
};
