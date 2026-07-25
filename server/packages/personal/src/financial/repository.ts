import db from "@hodor/core/db";
import {
  incomeRecordsTable,
  expenseRecordsTable,
  financialDataSourcesTable,
  type IncomeRecordPOLike,
  type ExpenseRecordPOLike,
  type FinancialDataSourcePOLike,
} from "./model.js";
import {
  eq,
  like,
  or,
  and,
  count,
  desc,
  asc,
  sum,
  type SQL,
} from "drizzle-orm";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";

export const financialRepository = {
  // Income
  async findIncomePage(params: {
    keyword?: string;
    sourceCategory?: string;
    creatorId?: number;
    orderBy?: keyof IncomeRecordPOLike;
    descend?: boolean;
    pageNo?: number;
    pageSize?: number;
  }) {
    const {
      keyword,
      sourceCategory,
      creatorId,
      orderBy = "incomeDateUtc",
      descend = true,
      pageNo = 1,
      pageSize = 10,
    } = params;
    const conditions: SQL[] = [];

    if (creatorId) conditions.push(eq(incomeRecordsTable.creatorId, creatorId));
    if (sourceCategory)
      conditions.push(eq(incomeRecordsTable.sourceCategory, sourceCategory));
    if (keyword) {
      const pattern = `%${keyword}%`;
      conditions.push(
        or(
          like(incomeRecordsTable.payer, pattern),
          like(incomeRecordsTable.remark, pattern)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalRow] = await db
      .select({ total: count() })
      .from(incomeRecordsTable)
      .where(whereClause);
    const total = totalRow?.total || 0;

    const getIncomeOrder = () => {
      if (orderBy === "id")
        return descend
          ? desc(incomeRecordsTable.id)
          : asc(incomeRecordsTable.id);
      if (orderBy === "amount")
        return descend
          ? desc(incomeRecordsTable.amount)
          : asc(incomeRecordsTable.amount);
      return descend
        ? desc(incomeRecordsTable.incomeDateUtc)
        : asc(incomeRecordsTable.incomeDateUtc);
    };

    const list = await db
      .select()
      .from(incomeRecordsTable)
      .where(whereClause)
      .orderBy(getIncomeOrder())
      .offset((pageNo - 1) * pageSize)
      .limit(pageSize);

    return { total, list };
  },

  async insertIncome(
    data: Omit<IncomeRecordPOLike, "id" | "createTimeUtc" | "updateTimeUtc">
  ) {
    const [res] = await db
      .insert(incomeRecordsTable)
      .values({ ...data, createTimeUtc: getCurrentTimestampUtcSql() })
      .returning({ id: incomeRecordsTable.id });
    return res;
  },

  async updateIncome(
    id: number,
    data: Partial<
      Omit<IncomeRecordPOLike, "id" | "createTimeUtc" | "updateTimeUtc">
    >
  ) {
    await db
      .update(incomeRecordsTable)
      .set({ ...data, updateTimeUtc: getCurrentTimestampUtcSql() })
      .where(eq(incomeRecordsTable.id, id));
    return true;
  },

  async deleteIncome(id: number) {
    await db.delete(incomeRecordsTable).where(eq(incomeRecordsTable.id, id));
    return true;
  },

  // Expense
  async findExpensePage(params: {
    keyword?: string;
    expenseCategory?: string;
    creatorId?: number;
    orderBy?: keyof ExpenseRecordPOLike;
    descend?: boolean;
    pageNo?: number;
    pageSize?: number;
  }) {
    const {
      keyword,
      expenseCategory,
      creatorId,
      orderBy = "expenseDateUtc",
      descend = true,
      pageNo = 1,
      pageSize = 10,
    } = params;
    const conditions: SQL[] = [];

    if (creatorId)
      conditions.push(eq(expenseRecordsTable.creatorId, creatorId));
    if (expenseCategory)
      conditions.push(eq(expenseRecordsTable.expenseCategory, expenseCategory));
    if (keyword) {
      const pattern = `%${keyword}%`;
      conditions.push(
        or(
          like(expenseRecordsTable.payee, pattern),
          like(expenseRecordsTable.remark, pattern)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalRow] = await db
      .select({ total: count() })
      .from(expenseRecordsTable)
      .where(whereClause);
    const total = totalRow?.total || 0;

    const getExpenseOrder = () => {
      if (orderBy === "id")
        return descend
          ? desc(expenseRecordsTable.id)
          : asc(expenseRecordsTable.id);
      if (orderBy === "amount")
        return descend
          ? desc(expenseRecordsTable.amount)
          : asc(expenseRecordsTable.amount);
      return descend
        ? desc(expenseRecordsTable.expenseDateUtc)
        : asc(expenseRecordsTable.expenseDateUtc);
    };

    const list = await db
      .select()
      .from(expenseRecordsTable)
      .where(whereClause)
      .orderBy(getExpenseOrder())
      .offset((pageNo - 1) * pageSize)
      .limit(pageSize);

    return { total, list };
  },

  async insertExpense(
    data: Omit<ExpenseRecordPOLike, "id" | "createTimeUtc" | "updateTimeUtc">
  ) {
    const [res] = await db
      .insert(expenseRecordsTable)
      .values({ ...data, createTimeUtc: getCurrentTimestampUtcSql() })
      .returning({ id: expenseRecordsTable.id });
    return res;
  },

  async updateExpense(
    id: number,
    data: Partial<
      Omit<ExpenseRecordPOLike, "id" | "createTimeUtc" | "updateTimeUtc">
    >
  ) {
    await db
      .update(expenseRecordsTable)
      .set({ ...data, updateTimeUtc: getCurrentTimestampUtcSql() })
      .where(eq(expenseRecordsTable.id, id));
    return true;
  },

  async deleteExpense(id: number) {
    await db.delete(expenseRecordsTable).where(eq(expenseRecordsTable.id, id));
    return true;
  },

  // Dashboard Aggregation
  async getDashboardStats(creatorId: number) {
    const [incomeRes] = await db
      .select({ totalIncome: sum(incomeRecordsTable.amount) })
      .from(incomeRecordsTable)
      .where(eq(incomeRecordsTable.creatorId, creatorId));

    const [expenseRes] = await db
      .select({ totalExpense: sum(expenseRecordsTable.amount) })
      .from(expenseRecordsTable)
      .where(eq(expenseRecordsTable.creatorId, creatorId));

    const totalIncome = Number(incomeRes?.totalIncome || 0);
    const totalExpense = Number(expenseRes?.totalExpense || 0);
    const netBalance = totalIncome - totalExpense;
    const savingsRate =
      totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    const incomeCategoryRows = await db
      .select({
        category: incomeRecordsTable.sourceCategory,
        total: sum(incomeRecordsTable.amount),
      })
      .from(incomeRecordsTable)
      .where(eq(incomeRecordsTable.creatorId, creatorId))
      .groupBy(incomeRecordsTable.sourceCategory);

    const expenseCategoryRows = await db
      .select({
        category: expenseRecordsTable.expenseCategory,
        total: sum(expenseRecordsTable.amount),
      })
      .from(expenseRecordsTable)
      .where(eq(expenseRecordsTable.creatorId, creatorId))
      .groupBy(expenseRecordsTable.expenseCategory);

    return {
      totalIncome,
      totalExpense,
      netBalance,
      savingsRate: Math.max(0, Math.round(savingsRate * 100) / 100),
      incomeBreakdown: incomeCategoryRows.map((r) => ({
        category: r.category,
        amount: Number(r.total || 0),
      })),
      expenseBreakdown: expenseCategoryRows.map((r) => ({
        category: r.category,
        amount: Number(r.total || 0),
      })),
    };
  },

  // Data Sources
  async findDataSourcePage(params: {
    creatorId?: number;
    pageNo?: number;
    pageSize?: number;
  }) {
    const { creatorId, pageNo = 1, pageSize = 10 } = params;
    const whereClause = creatorId
      ? eq(financialDataSourcesTable.creatorId, creatorId)
      : undefined;
    const [totalRow] = await db
      .select({ total: count() })
      .from(financialDataSourcesTable)
      .where(whereClause);
    const total = totalRow?.total || 0;

    const list = await db
      .select()
      .from(financialDataSourcesTable)
      .where(whereClause)
      .orderBy(desc(financialDataSourcesTable.id))
      .offset((pageNo - 1) * pageSize)
      .limit(pageSize);

    return { total, list };
  },

  async insertDataSource(
    data: Omit<
      FinancialDataSourcePOLike,
      "id" | "createTimeUtc" | "updateTimeUtc"
    >
  ) {
    const [res] = await db
      .insert(financialDataSourcesTable)
      .values({ ...data, createTimeUtc: getCurrentTimestampUtcSql() })
      .returning({ id: financialDataSourcesTable.id });
    return res;
  },

  async updateDataSource(
    id: number,
    data: Partial<
      Omit<FinancialDataSourcePOLike, "id" | "createTimeUtc" | "updateTimeUtc">
    >
  ) {
    await db
      .update(financialDataSourcesTable)
      .set({ ...data, updateTimeUtc: getCurrentTimestampUtcSql() })
      .where(eq(financialDataSourcesTable.id, id));
    return true;
  },

  async deleteDataSource(id: number) {
    await db
      .delete(financialDataSourcesTable)
      .where(eq(financialDataSourcesTable.id, id));
    return true;
  },

  async findDataSourceById(id: number) {
    const [row] = await db
      .select()
      .from(financialDataSourcesTable)
      .where(eq(financialDataSourcesTable.id, id));
    return row || null;
  },
};
