import db from "@/db/index";
import {
  userIndex,
  userUnique,
  userTimestamp,
  userTable,
  userData,
  type userAddLike,
  type userLike,
} from "./db.table";
import { asc, count, desc, eq, or, like } from "drizzle-orm";
import { FromSchema, JSONSchema } from "json-schema-to-ts";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12; // bcrypt盐轮数

const addReq = {
  type: "object",
  properties: {
    ...userData,
  } satisfies Partial<Record<keyof userAddLike, JSONSchema>>,
  required: ["username", "password", "department", "role"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const addRes = {
  ...userIndex["id"],
} as const satisfies JSONSchema;
async function onAdd(
  obj: FromSchema<typeof addReq>
): Promise<FromSchema<typeof addRes> | null> {
  const {
    username,
    password,
    department,
    role,
    isEnabled = true,
  } = obj;
  
  // 密码加盐处理
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  const result = await db
    .insert(userTable)
    .values({
      username,
      password: hashedPassword,
      department,
      role,
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
    summary: `添加用户`,
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
  uniqueKeyObj: FromSchema<typeof deleteReq>
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = uniqueKeyObj;
  if (id === undefined) return null;
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
    summary: `删除用户`,
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
        "department",
        "role",
        "createTimeUtc",
      ] satisfies (keyof userLike)[],
    },
    descend: { type: "boolean" },
    pageNo: { type: "number", minimum: 1, default: 1 },
    pageSize: { type: "number", maximum: 1000, default: 10 },
    keyword: { type: "string", examples: [""], description: "搜索用户名、部门或角色" },
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
          department: userData.department,
          role: userData.role,
          isEnabled: userData.isEnabled,
          ...userTimestamp,
          // 注意：不返回密码字段
        },
      },
    },
  },
} as const satisfies JSONSchema;

// 用于内部查询的类型（包含密码）
type userLikeWithoutPassword = Omit<userLike, 'password'>;

async function onList(
  listParamObj: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
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
    if (keyword) {
      conditions.push(
        or(
          like(userTable.username, `%${keyword}%`),
          like(userTable.department, `%${keyword}%`),
          like(userTable.role, `%${keyword}%`)
        )
      );
    }
    if (isEnabled !== undefined) {
      conditions.push(eq(userTable.isEnabled, isEnabled));
    }
    return conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : or(...conditions)) : undefined;
  };

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
              department: userTable.department,
              role: userTable.role,
              isEnabled: userTable.isEnabled,
              createTimeUtc: userTable.createTimeUtc,
              updateTimeUtc: userTable.updateTimeUtc,
              // 注意：不返回密码字段
            }
      )
      .from(userTable)
      .where(buildWhereCondition())
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
    summary: `获取用户列表`,
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
  obj: FromSchema<typeof updateReq>
): Promise<FromSchema<typeof updateRes> | null> {
  const { id, password, ...rest } = obj;
  const updateTimeUtc = new Date().valueOf();
  
  // 如果更新密码，需要重新加盐
  let updateData: any = {
    ...rest,
    updateTimeUtc,
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
    summary: `更新用户`,
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
    department: userData.department,
    role: userData.role,
    isEnabled: userData.isEnabled,
    ...userTimestamp,
    // 注意：不返回密码字段
  },
} as const satisfies JSONSchema;
async function onGet(
  uniqueKeyObj: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = uniqueKeyObj;
  const rows = await db
    .select({
      id: userTable.id,
      username: userTable.username,
      department: userTable.department,
      role: userTable.role,
      isEnabled: userTable.isEnabled,
      createTimeUtc: userTable.createTimeUtc,
      updateTimeUtc: userTable.updateTimeUtc,
      // 注意：不返回密码字段
    })
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  return rows[0];
}
const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: `获取用户`,
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
    userId: {
      type: "number",
      nullable: true,
      description: "用户ID（验证成功时返回）",
    },
  },
  required: ["valid"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onVerify(
  obj: FromSchema<typeof verifyReq>
): Promise<FromSchema<typeof verifyRes>> {
  const { username, password } = obj;
  const user = await db
    .select()
    .from(userTable)
    .where(eq(userTable.username, username))
    .limit(1);
    
  if (user.length === 0) {
    return { valid: false, userId: null };
  }
  
  const userData = user[0];
  if (!userData.isEnabled) {
    return { valid: false, userId: null };
  }
  
  const isValid = await bcrypt.compare(password, userData.password);
  return {
    valid: isValid,
    userId: isValid ? userData.id : null,
  };
}
const verifyApi = {
  req: verifyReq,
  res: verifyRes,
  pathInfo: {
    path: "/verify",
    method: "post",
    summary: `验证用户密码`,
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
