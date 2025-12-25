import db from "@/db/index";
import {
  userIndex,
  userUnique,
  userAudit,
  userTable,
  userData,
  type userAddLike,
  type userLike,
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
    ...userData,
  } satisfies Partial<Record<keyof userAddLike, JSONSchema>>,
  required: ["username", "password", "roleIdArr"],
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
    departmentId,
    roleIdArr,
    isEnabled = true,
  } = obj;

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
        "roleIdArr",
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
          username: userData.username,
          langCode: userData.langCode,
          departmentId: userData.departmentId,
          roleIdArr: userData.roleIdArr,
          isEnabled: userData.isEnabled,
          ...userAudit,
          // 注意：不返回密码字段
        },
      },
    },
  },
} as const satisfies JSONSchema;

// 用于内部查询的类型（包含密码）
type userLikeWithoutPassword = Omit<userLike, "password">;

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
  function queryDB(getAll: false): Promise<userLikeWithoutPassword[]>;
  function queryDB(
    getAll: boolean
  ): Promise<{ total: number }[] | userLikeWithoutPassword[]> {
    const baseQuery = db
      .select(
        getAll
          ? { total: count(userTable.id).as("total") }
          : {
              id: userTable.id,
              username: userTable.username,
              langCode: userTable.langCode,
              departmentId: userTable.departmentId,
              roleIdArr: userTable.roleIdArr,
              isEnabled: userTable.isEnabled,
              createTimeUtc: userTable.createTimeUtc,
              updateTimeUtc: userTable.updateTimeUtc,
              // 注意：不返回密码字段
            }
      )
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

    return baseQuery as any;
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
  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: rows,
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
    ...userData,
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
  const { id, password, isEnabled, roleIdArr, ...rest } = obj;
  // 如果更新密码，需要重新加盐
  let updateData: any = {
    ...rest,
    isEnabled: id === superAdminId ? true : isEnabled, // 禁止禁用超级管理员
    updaterId: userObj.userId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

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
    username: userData.username,
    langCode: userData.langCode,
    departmentId: userData.departmentId,
    roleIdArr: userData.roleIdArr,
    isEnabled: userData.isEnabled,
    ...userAudit,
    // 注意：不返回密码字段
  },
} as const satisfies JSONSchema;
async function onGet(
  c: NodeHonoContext
): Promise<FromSchema<typeof getRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof getReq>;
  const { id } = uniqueKeyObj;
  const rows = await db
    .select({
      id: userTable.id,
      username: userTable.username,
      langCode: userTable.langCode,
      departmentId: userTable.departmentId,
      roleIdArr: userTable.roleIdArr,
      isEnabled: userTable.isEnabled,
      createTimeUtc: userTable.createTimeUtc,
      updateTimeUtc: userTable.updateTimeUtc,
      // 注意：不返回密码字段
    })
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1);
  if (rows.length === 0) {
    throw new HTTPException(404, {
      message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
    });
  }
  return rows[0];
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

const verifyReq = {
  type: "object",
  properties: {
    username: {
      type: "string",
      description: "用户名",
    },
    password: {
      type: "string",
      description: "密码",
    },
  },
  required: ["username", "password"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
const verifyRes = {
  type: "object",
  properties: {
    valid: {
      type: "boolean",
      description: "验证结果，true 表示验证成功",
    },
    userObj: {
      type: "object",
      nullable: true,
      description: "用户对象，验证成功时返回用户信息，验证失败时为 null",
      properties: {
        ...userIndex,
        username: userData.username,
        langCode: userData.langCode,
        departmentId: userData.departmentId,
        roleIdArr: userData.roleIdArr,
        isEnabled: userData.isEnabled,
        departmentName: { type: "string", nullable: true },
        roleArr: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              value: { type: "number" },
            },
            required: ["label", "value"],
          },
        },
      },
    },
  },
  required: ["valid"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onVerify(
  c: NodeHonoContext
): Promise<FromSchema<typeof verifyRes>> {
  const obj = c.get("bodyObj") as FromSchema<typeof verifyReq>;
  const { username, password } = obj;
  const userArr = await db
    .select()
    .from(userTable)
    .where(eq(userTable.username, username))
    .limit(1);
  if (userArr.length === 0) {
    return { valid: false };
  }
  const userObj = userArr[0];
  if (!userObj.isEnabled) {
    return { valid: false };
  }
  const isValid = await bcrypt.compare(password, userObj.password);

  if (!isValid) {
    return { valid: false, userObj: null };
  }

  // Fetch department name
  let departmentName = null;
  if (userObj.departmentId) {
    departmentName = await getDepartmentNameById(userObj.departmentId);
  }

  let roleArr: { label: string; value: number }[] = [];
  const roleIdArr = userObj.roleIdArr;
  if (roleIdArr.length > 0) {
    const roles = await getRolesByIds(roleIdArr);
    roleArr = roles.map((o) => ({ label: o.name, value: o.id }));
  }

  return {
    valid: true,
    userObj: {
      ...userObj,
      departmentName,
      roleArr,
    },
  };
}
const verifyApi = {
  req: verifyReq,
  res: verifyRes,
  pathInfo: {
    path: "/verify",
    method: "post",
    summary: "验证用户密码",
  } as const,
  service: onVerify,
};

export default {
  add: addApi,
  delete: deleteApi,
  list: listApi,
  update: updateApi,
  get: getApi,
  verify: verifyApi,
};
