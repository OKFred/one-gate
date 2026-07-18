import db from "@hodor/core/db/index";
import { menuTable, type MenuPOLike } from "./model";
import {
  asc,
  count,
  desc,
  eq,
  or,
  and,
  like,
  type SQL,
  type InferInsertModel,
} from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

export const buildWhereCondition = (condition?: {
  id?: number;
  keyword?: string;
  business?: string | null;
  isEnabled?: boolean;
}) => {
  const { id, keyword, business, isEnabled } = condition || {};
  const conditions: SQL<unknown>[] = [];

  if (hasValue(id)) {
    conditions.push(eq(menuTable.id, id!));
  }
  if (hasValue(keyword)) {
    conditions.push(or(like(menuTable.name, `%${keyword}%`)) as SQL<unknown>);
  }
  if (hasValue(business)) {
    conditions.push(eq(menuTable.business, business!));
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(menuTable.isEnabled, isEnabled));
  }

  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

export class MenuRepository {
  async findPage(params: {
    keyword?: string;
    isEnabled?: boolean;
    business?: string | null;
    orderBy?: keyof MenuPOLike;
    descend?: boolean;
    pageNo: number;
    pageSize: number;
  }) {
    const {
      keyword,
      isEnabled,
      business,
      orderBy = "id",
      descend = true,
      pageNo,
      pageSize,
    } = params;
    const offset = (pageNo - 1) * pageSize;
    const orderField = menuTable[orderBy] || menuTable.id;

    const countResult = await db
      .select({ total: count(menuTable.id).as("total") })
      .from(menuTable)
      .where(buildWhereCondition({ keyword, isEnabled, business }));
    const total = countResult[0]?.total || 0;

    if (total === 0) {
      return { total, list: [] };
    }

    const rows = await db
      .select()
      .from(menuTable)
      .where(buildWhereCondition({ keyword, isEnabled, business }))
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(pageSize)
      .offset(offset);

    return { total, list: rows };
  }

  async findAll(params: {
    keyword?: string;
    isEnabled?: boolean;
    business?: string | null;
    orderBy?: keyof MenuPOLike;
    descend?: boolean;
  }) {
    const {
      keyword,
      isEnabled,
      business,
      orderBy = "id",
      descend = true,
    } = params;
    const orderField = menuTable[orderBy] || menuTable.id;
    const maxLimit = 10000;

    const rows = await db
      .select({
        id: menuTable.id,
        name: menuTable.name,
        icon: menuTable.icon,
        path: menuTable.path,
        parentId: menuTable.parentId,
        sort: menuTable.sort,
        business: menuTable.business,
        remark: menuTable.remark,
        isEnabled: menuTable.isEnabled,
      })
      .from(menuTable)
      .where(buildWhereCondition({ keyword, isEnabled, business }))
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(maxLimit);

    return rows;
  }

  async findById(id: number): Promise<MenuPOLike | null> {
    const rows = await db
      .select()
      .from(menuTable)
      .where(eq(menuTable.id, id))
      .limit(1);
    return rows[0] || null;
  }

  async getTreeMenus(showAll?: boolean): Promise<MenuPOLike[]> {
    const conditions: SQL<unknown>[] = [];
    if (showAll !== true) {
      conditions.push(eq(menuTable.isEnabled, true));
    }
    const where = conditions.length > 0 ? conditions[0] : undefined;

    const rows = await db
      .select()
      .from(menuTable)
      .where(where)
      .orderBy(asc(menuTable.sort));
    return rows;
  }

  async getChildMenus(menuId: number): Promise<{ id: number }[]> {
    const rows = await db
      .select({ id: menuTable.id })
      .from(menuTable)
      .where(eq(menuTable.parentId, menuId));
    return rows;
  }

  async getAllMenus(
    isEnabled?: boolean
  ): Promise<{ name: string; id: number; parentId: number | null }[]> {
    const rows = await db
      .select({
        name: menuTable.name,
        id: menuTable.id,
        parentId: menuTable.parentId,
      })
      .from(menuTable)
      .where(
        isEnabled !== undefined ? eq(menuTable.isEnabled, isEnabled) : undefined
      );
    return rows;
  }

  async countEnabledChildMenus(menuId: number): Promise<number> {
    const result = await db
      .select({ total: count(menuTable.id).as("total") })
      .from(menuTable)
      .where(
        and(eq(menuTable.parentId, menuId), eq(menuTable.isEnabled, true))
      );
    return result[0]?.total ?? 0;
  }

  async onInsert(
    data: Omit<
      InferInsertModel<typeof menuTable>,
      "id" | "createTimeUtc" | "updateTimeUtc"
    >
  ): Promise<number> {
    const res = await db
      .insert(menuTable)
      .values({
        ...data,
        createTimeUtc: Date.now(),
      })
      .returning({ id: menuTable.id });
    return res[0].id;
  }

  async onUpdate(
    id: number,
    data: Partial<
      Omit<
        InferInsertModel<typeof menuTable>,
        "id" | "createTimeUtc" | "updateTimeUtc"
      >
    >
  ): Promise<number> {
    const res = await db
      .update(menuTable)
      .set({
        ...data,
        updateTimeUtc: Date.now(),
      })
      .where(eq(menuTable.id, id))
      .returning({ id: menuTable.id });
    return res[0].id;
  }

  async onDelete(id: number): Promise<number> {
    const res = await db
      .delete(menuTable)
      .where(eq(menuTable.id, id))
      .returning({ id: menuTable.id });
    return res[0].id;
  }
}

export const menuRepository = new MenuRepository();
