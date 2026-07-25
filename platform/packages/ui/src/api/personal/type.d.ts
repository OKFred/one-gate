import * as FamilyAPI from '@/api/personal/family';
import * as HealthAPI from '@/api/personal/health';
import * as FinancialAPI from '@/api/personal/financial';
import * as SocialAPI from '@/api/personal/social';

// ─── Family ──────────────────────────────────────────────────────────────────

export type ListFamilyReq = NonNullable<Parameters<typeof FamilyAPI.listFn>[0]['data']>;
export type ListFamilyRes = Awaited<ReturnType<typeof FamilyAPI.listFn>>['data']['data'];

export type AddFamilyReq = NonNullable<Parameters<typeof FamilyAPI.addFn>[0]['data']>;
export type AddFamilyRes = Awaited<ReturnType<typeof FamilyAPI.addFn>>['data']['data'];

export type UpdateFamilyReq = NonNullable<Parameters<typeof FamilyAPI.updateFn>[0]['data']>;
export type UpdateFamilyRes = Awaited<ReturnType<typeof FamilyAPI.updateFn>>['data']['data'];

export type DeleteFamilyReq = NonNullable<Parameters<typeof FamilyAPI.deleteFn>[0]['data']>;
export type DeleteFamilyRes = Awaited<ReturnType<typeof FamilyAPI.deleteFn>>['data']['data'];

// ─── Health ───────────────────────────────────────────────────────────────────

export type ListHealthReq = NonNullable<Parameters<typeof HealthAPI.listFn>[0]['data']>;
export type ListHealthRes = Awaited<ReturnType<typeof HealthAPI.listFn>>['data']['data'];

export type AddHealthReq = NonNullable<Parameters<typeof HealthAPI.addFn>[0]['data']>;
export type AddHealthRes = Awaited<ReturnType<typeof HealthAPI.addFn>>['data']['data'];

export type UpdateHealthReq = NonNullable<Parameters<typeof HealthAPI.updateFn>[0]['data']>;
export type UpdateHealthRes = Awaited<ReturnType<typeof HealthAPI.updateFn>>['data']['data'];

export type DeleteHealthReq = NonNullable<Parameters<typeof HealthAPI.deleteFn>[0]['data']>;
export type DeleteHealthRes = Awaited<ReturnType<typeof HealthAPI.deleteFn>>['data']['data'];

// ─── Financial ────────────────────────────────────────────────────────────────

export type FinanceDashboardRes = Awaited<
  ReturnType<typeof FinancialAPI.dashboardFn>
>['data']['data'];

export type ListIncomeReq = NonNullable<Parameters<typeof FinancialAPI.incomeListFn>[0]['data']>;
export type ListIncomeRes = Awaited<ReturnType<typeof FinancialAPI.incomeListFn>>['data']['data'];

export type AddIncomeReq = NonNullable<Parameters<typeof FinancialAPI.incomeAddFn>[0]['data']>;
export type AddIncomeRes = Awaited<ReturnType<typeof FinancialAPI.incomeAddFn>>['data']['data'];

export type UpdateIncomeReq = NonNullable<
  Parameters<typeof FinancialAPI.incomeUpdateFn>[0]['data']
>;
export type UpdateIncomeRes = Awaited<
  ReturnType<typeof FinancialAPI.incomeUpdateFn>
>['data']['data'];

export type DeleteIncomeReq = NonNullable<
  Parameters<typeof FinancialAPI.incomeDeleteFn>[0]['data']
>;
export type DeleteIncomeRes = Awaited<
  ReturnType<typeof FinancialAPI.incomeDeleteFn>
>['data']['data'];

export type ListExpenseReq = NonNullable<Parameters<typeof FinancialAPI.expenseListFn>[0]['data']>;
export type ListExpenseRes = Awaited<ReturnType<typeof FinancialAPI.expenseListFn>>['data']['data'];

export type AddExpenseReq = NonNullable<Parameters<typeof FinancialAPI.expenseAddFn>[0]['data']>;
export type AddExpenseRes = Awaited<ReturnType<typeof FinancialAPI.expenseAddFn>>['data']['data'];

export type UpdateExpenseReq = NonNullable<
  Parameters<typeof FinancialAPI.expenseUpdateFn>[0]['data']
>;
export type UpdateExpenseRes = Awaited<
  ReturnType<typeof FinancialAPI.expenseUpdateFn>
>['data']['data'];

export type DeleteExpenseReq = NonNullable<
  Parameters<typeof FinancialAPI.expenseDeleteFn>[0]['data']
>;
export type DeleteExpenseRes = Awaited<
  ReturnType<typeof FinancialAPI.expenseDeleteFn>
>['data']['data'];

export type ListDataSourceReq = NonNullable<
  Parameters<typeof FinancialAPI.dataSourceListFn>[0]['data']
>;
export type ListDataSourceRes = Awaited<
  ReturnType<typeof FinancialAPI.dataSourceListFn>
>['data']['data'];

export type AddDataSourceReq = NonNullable<
  Parameters<typeof FinancialAPI.dataSourceAddFn>[0]['data']
>;
export type AddDataSourceRes = Awaited<
  ReturnType<typeof FinancialAPI.dataSourceAddFn>
>['data']['data'];

export type UpdateDataSourceReq = NonNullable<
  Parameters<typeof FinancialAPI.dataSourceUpdateFn>[0]['data']
>;
export type UpdateDataSourceRes = Awaited<
  ReturnType<typeof FinancialAPI.dataSourceUpdateFn>
>['data']['data'];

export type SyncDataSourceReq = NonNullable<
  Parameters<typeof FinancialAPI.dataSourceSyncFn>[0]['data']
>;
export type SyncDataSourceRes = Awaited<
  ReturnType<typeof FinancialAPI.dataSourceSyncFn>
>['data']['data'];

// ─── Social ───────────────────────────────────────────────────────────────────

export type ListContactReq = NonNullable<Parameters<typeof SocialAPI.contactListFn>[0]['data']>;
export type ListContactRes = Awaited<ReturnType<typeof SocialAPI.contactListFn>>['data']['data'];

export type AddContactReq = NonNullable<Parameters<typeof SocialAPI.contactAddFn>[0]['data']>;
export type AddContactRes = Awaited<ReturnType<typeof SocialAPI.contactAddFn>>['data']['data'];

export type UpdateContactReq = NonNullable<Parameters<typeof SocialAPI.contactUpdateFn>[0]['data']>;
export type UpdateContactRes = Awaited<
  ReturnType<typeof SocialAPI.contactUpdateFn>
>['data']['data'];

export type DeleteContactReq = NonNullable<Parameters<typeof SocialAPI.contactDeleteFn>[0]['data']>;
export type DeleteContactRes = Awaited<
  ReturnType<typeof SocialAPI.contactDeleteFn>
>['data']['data'];

export type GraphRes = Awaited<ReturnType<typeof SocialAPI.graphFn>>['data']['data'];
