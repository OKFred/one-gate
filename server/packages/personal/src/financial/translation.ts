import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const financialTranslations = {
  "personal.finance": [
    // Tabs
    {
      application: "frontend",
      tKey: "personal.finance.tab.dashboard",
      langCodes: {
        "zh-CN": "财务总览仪表盘",
        "en-US": "Financial Overview Dashboard",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.tab.income",
      langCodes: {
        "zh-CN": "收入管理明细",
        "en-US": "Income Details Management",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.tab.expense",
      langCodes: {
        "zh-CN": "支出管理明细",
        "en-US": "Expense Details Management",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.tab.dataSource",
      langCodes: {
        "zh-CN": "数据源抓取与接口联动",
        "en-US": "Data Source Fetching & API Linkage",
      },
    },

    // Dashboard
    {
      application: "frontend",
      tKey: "personal.finance.dash.totalIncome",
      langCodes: {
        "zh-CN": "总收入 (Total Income)",
        "en-US": "Total Income",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dash.totalIncomeDesc",
      langCodes: {
        "zh-CN": "包含固定薪资、绩效奖金与投资收益",
        "en-US": "Includes salary, performance bonuses, and investment returns",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dash.totalExpense",
      langCodes: {
        "zh-CN": "总支出 (Total Expenses)",
        "en-US": "Total Expenses",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dash.totalExpenseDesc",
      langCodes: {
        "zh-CN": "包含房贷、日常生活与医疗健康",
        "en-US": "Includes mortgage, daily living, and healthcare",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dash.netBalance",
      langCodes: {
        "zh-CN": "净盈余 (Net Balance)",
        "en-US": "Net Balance",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dash.netBalanceDesc",
      langCodes: {
        "zh-CN": "结余资金储备",
        "en-US": "Surplus Capital Reserve",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dash.savingsRate",
      langCodes: {
        "zh-CN": "储蓄率 (Savings Rate)",
        "en-US": "Savings Rate",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dash.incomeRatio",
      langCodes: {
        "zh-CN": "收入来源结构占比",
        "en-US": "Income Source Breakdown Ratio",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dash.expenseRatio",
      langCodes: {
        "zh-CN": "支出消费结构占比",
        "en-US": "Expense Category Breakdown Ratio",
      },
    },

    // Categories
    {
      application: "frontend",
      tKey: "personal.finance.cat.salary",
      langCodes: {
        "zh-CN": "固定薪资",
        "en-US": "Fixed Salary",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.cat.bonus",
      langCodes: {
        "zh-CN": "绩效奖金",
        "en-US": "Performance Bonus",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.cat.investment",
      langCodes: {
        "zh-CN": "理财分红",
        "en-US": "Investment Dividend",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.cat.side_hustle",
      langCodes: {
        "zh-CN": "兼职副业",
        "en-US": "Side Hustle",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.cat.other_income",
      langCodes: {
        "zh-CN": "其他收入",
        "en-US": "Other Income",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.cat.housing",
      langCodes: {
        "zh-CN": "房租房贷",
        "en-US": "Rent & Mortgage",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.cat.daily",
      langCodes: {
        "zh-CN": "日常消费",
        "en-US": "Daily Consumption",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.cat.medical",
      langCodes: {
        "zh-CN": "医疗健康",
        "en-US": "Medical & Health",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.cat.entertainment",
      langCodes: {
        "zh-CN": "娱乐休闲",
        "en-US": "Entertainment & Leisure",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.cat.education",
      langCodes: {
        "zh-CN": "教育培训",
        "en-US": "Education & Training",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.cat.transport",
      langCodes: {
        "zh-CN": "交通出行",
        "en-US": "Transportation",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.cat.other_expense",
      langCodes: {
        "zh-CN": "其他支出",
        "en-US": "Other Expenses",
      },
    },

    // Payment Methods
    {
      application: "frontend",
      tKey: "personal.finance.pay.alipay",
      langCodes: {
        "zh-CN": "支付宝",
        "en-US": "Alipay",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.pay.wechat",
      langCodes: {
        "zh-CN": "微信支付",
        "en-US": "WeChat Pay",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.pay.bank_card",
      langCodes: {
        "zh-CN": "银行卡/房贷扣款",
        "en-US": "Bank Card / Mortgage Deduction",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.pay.cash",
      langCodes: {
        "zh-CN": "现金",
        "en-US": "Cash",
      },
    },

    // Expense List
    {
      application: "frontend",
      tKey: "personal.finance.expense.title",
      langCodes: {
        "zh-CN": "支出分类管理",
        "en-US": "Expense Classification Management",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.add",
      langCodes: {
        "zh-CN": "添加支出明细",
        "en-US": "Add Expense Item",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.deleteConfirm",
      langCodes: {
        "zh-CN": "确定要删除此条支出记录吗？",
        "en-US": "Are you sure you want to delete this expense record?",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.dialogAddTitle",
      langCodes: {
        "zh-CN": "新增支出记录",
        "en-US": "New Expense Record",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.dialogEditTitle",
      langCodes: {
        "zh-CN": "编辑支出记录",
        "en-US": "Edit Expense Record",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.colDate",
      langCodes: {
        "zh-CN": "扣款/消费日期",
        "en-US": "Deduction / Consumption Date",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.colCategory",
      langCodes: {
        "zh-CN": "支出分类",
        "en-US": "Expense Category",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.colAmount",
      langCodes: {
        "zh-CN": "金额(元)",
        "en-US": "Amount (CNY)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.colPayee",
      langCodes: {
        "zh-CN": "收款方/商户",
        "en-US": "Payee / Merchant",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.colPaymentMethod",
      langCodes: {
        "zh-CN": "支付方式",
        "en-US": "Payment Method",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.colRemark",
      langCodes: {
        "zh-CN": "备注说明",
        "en-US": "Remarks",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.empty",
      langCodes: {
        "zh-CN": "暂无支出记录",
        "en-US": "No expense records",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.formCategory",
      langCodes: {
        "zh-CN": "支出分类",
        "en-US": "Expense Category",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.formAmount",
      langCodes: {
        "zh-CN": "支出金额 (元)",
        "en-US": "Expense Amount (CNY)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.formPayee",
      langCodes: {
        "zh-CN": "收款方 / 商户",
        "en-US": "Payee / Merchant",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.formPaymentMethod",
      langCodes: {
        "zh-CN": "支付方式",
        "en-US": "Payment Method",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.expense.formRemark",
      langCodes: {
        "zh-CN": "备注说明",
        "en-US": "Remarks",
      },
    },

    // Income List
    {
      application: "frontend",
      tKey: "personal.finance.income.title",
      langCodes: {
        "zh-CN": "收入分类管理",
        "en-US": "Income Classification Management",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.add",
      langCodes: {
        "zh-CN": "添加收入明细",
        "en-US": "Add Income Item",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.deleteConfirm",
      langCodes: {
        "zh-CN": "确定要删除此条收入记录吗？",
        "en-US": "Are you sure you want to delete this income record?",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.dialogAddTitle",
      langCodes: {
        "zh-CN": "新增收入记录",
        "en-US": "New Income Record",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.dialogEditTitle",
      langCodes: {
        "zh-CN": "编辑收入记录",
        "en-US": "Edit Income Record",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.colDate",
      langCodes: {
        "zh-CN": "入账日期",
        "en-US": "Credit Date",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.colCategory",
      langCodes: {
        "zh-CN": "收入分类",
        "en-US": "Income Category",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.colAmount",
      langCodes: {
        "zh-CN": "金额(元)",
        "en-US": "Amount (CNY)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.colPayer",
      langCodes: {
        "zh-CN": "付款方/来源",
        "en-US": "Payer / Source",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.colRemark",
      langCodes: {
        "zh-CN": "备注说明",
        "en-US": "Remarks",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.empty",
      langCodes: {
        "zh-CN": "暂无收入记录",
        "en-US": "No income records",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.formCategory",
      langCodes: {
        "zh-CN": "收入分类",
        "en-US": "Income Category",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.formAmount",
      langCodes: {
        "zh-CN": "收入金额 (元)",
        "en-US": "Income Amount (CNY)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.formPayer",
      langCodes: {
        "zh-CN": "付款方 / 来源",
        "en-US": "Payer / Source",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.income.formRemark",
      langCodes: {
        "zh-CN": "备注说明",
        "en-US": "Remarks",
      },
    },

    // Data Source Config
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.title",
      langCodes: {
        "zh-CN": "接口数据源联动与自动抓取配置",
        "en-US": "API Data Source Linkage & Auto-Fetch Config",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.desc",
      langCodes: {
        "zh-CN":
          "联动 /admin/maintenance/api-task (API 抓取) 与 /admin/data/schema_form (动态表单)，实现财务流水的定时抓取与自动导入。",
        "en-US":
          "Link /admin/maintenance/api-task (API Fetch) and /admin/data/schema_form (Dynamic Form) to enable scheduled fetching and auto-import of financial records.",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.addBinding",
      langCodes: {
        "zh-CN": "新建数据源绑定",
        "en-US": "New Data Source Binding",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.alertTip",
      langCodes: {
        "zh-CN":
          "提示：若选择 API 任务抓取，系统将调用全局预设的 API 采集器；若选择动态表单，可直接映射 /admin/data/schema_form_data 中的用户填报表单。",
        "en-US":
          "Tip: If API Task Fetch is selected, the system calls global API collectors; if Dynamic Form is selected, user-filled forms in /admin/data/schema_form_data can be directly mapped.",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.colSourceName",
      langCodes: {
        "zh-CN": "数据源名称",
        "en-US": "Data Source Name",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.colMode",
      langCodes: {
        "zh-CN": "模式",
        "en-US": "Mode",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.colRelatedTaskOrForm",
      langCodes: {
        "zh-CN": "关联任务/表单",
        "en-US": "Related Task/Form",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.colSyncCron",
      langCodes: {
        "zh-CN": "定时抓取 Cron",
        "en-US": "Scheduled Cron",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.colLastSyncTime",
      langCodes: {
        "zh-CN": "最近同步时间",
        "en-US": "Last Sync Time",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.empty",
      langCodes: {
        "zh-CN": "暂无配置的数据源",
        "en-US": "No configured data sources",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.typeApiTaskChip",
      langCodes: {
        "zh-CN": "API Task (抓取)",
        "en-US": "API Task (Fetch)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.typeSchemaFormChip",
      langCodes: {
        "zh-CN": "Schema Form (表单)",
        "en-US": "Schema Form (Form)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.manualTrigger",
      langCodes: {
        "zh-CN": "手动触发",
        "en-US": "Manual Trigger",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.neverSynced",
      langCodes: {
        "zh-CN": "尚未同步",
        "en-US": "Not yet synced",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.enabled",
      langCodes: {
        "zh-CN": "已启用",
        "en-US": "Enabled",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.disabled",
      langCodes: {
        "zh-CN": "已禁用",
        "en-US": "Disabled",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.syncNow",
      langCodes: {
        "zh-CN": "立即抓取",
        "en-US": "Fetch Now",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.deleteConfirm",
      langCodes: {
        "zh-CN": "确定要删除此数据源配置吗？",
        "en-US":
          "Are you sure you want to delete this data source configuration?",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.dialogEditTitle",
      langCodes: {
        "zh-CN": "编辑数据源配置",
        "en-US": "Edit Data Source Config",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.dialogAddTitle",
      langCodes: {
        "zh-CN": "新建数据源配置",
        "en-US": "New Data Source Config",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.formSourceName",
      langCodes: {
        "zh-CN": "数据源配置名称",
        "en-US": "Data Source Config Name",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.formSourceType",
      langCodes: {
        "zh-CN": "抓取模式 (Source Type)",
        "en-US": "Fetch Mode (Source Type)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.optionApiTask",
      langCodes: {
        "zh-CN": "API Task (联动 /admin/maintenance/api-task)",
        "en-US": "API Task (Linked to /admin/maintenance/api-task)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.optionSchemaForm",
      langCodes: {
        "zh-CN": "Schema Form (联动 /admin/data/schema_form)",
        "en-US": "Schema Form (Linked to /admin/data/schema_form)",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.formApiTaskId",
      langCodes: {
        "zh-CN": "关联 API Task ID",
        "en-US": "Associated API Task ID",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.formApiTaskIdHelper",
      langCodes: {
        "zh-CN": "填入 /admin/maintenance/api-task 中已配置的接口任务 ID",
        "en-US":
          "Enter configured API task ID from /admin/maintenance/api-task",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.formSchemaFormCode",
      langCodes: {
        "zh-CN": "关联 Schema Form Code",
        "en-US": "Associated Schema Form Code",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.formSchemaFormCodeHelper",
      langCodes: {
        "zh-CN": "填入 /admin/data/schema_form 中的表单唯一标识 Code",
        "en-US":
          "Enter unique form identifier Code from /admin/data/schema_form",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.formFieldMapping",
      langCodes: {
        "zh-CN": "字段映射 JSON 配置 (Field Mapping)",
        "en-US": "Field Mapping JSON Config",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.formFieldMappingHelper",
      langCodes: {
        "zh-CN":
          "将源接口/表单 JSON 响应字段映射到 income/expense 的 amount, category, date",
        "en-US":
          "Map source API/Form JSON response fields to income/expense amount, category, date",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.formSyncCron",
      langCodes: {
        "zh-CN": "定时抓取 Cron 表达式",
        "en-US": "Scheduled Fetch Cron Expression",
      },
    },
    {
      application: "frontend",
      tKey: "personal.finance.dataSource.formSyncCronPlaceholder",
      langCodes: {
        "zh-CN": "0 0 1 * * ? (每日凌晨1点抓取)",
        "en-US": "0 0 1 * * ? (Fetch daily at 1 AM)",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "personal.finance">,
  TranslationInputItem[]
>;
