import type { ReactNode, Dispatch, SetStateAction } from 'react';
import type { TableColumn, CardField } from '@/components/Responsive/ResponsiveList';

export interface QueryState<TFilters> {
  page: number;
  pageSize: number;
  filters: TFilters;
}

/**
 * 辅助行操作的回调工具集合
 */
export interface CrudHelpers<TRecord> {
  openEdit: (row: TRecord) => void;
  deleteRow: (row: TRecord) => Promise<void>;
  refreshTable: () => void;
}

/**
 * 表格行操作按钮配置
 */
export interface RowAction<TRecord> {
  key: string;
  label?: string;
  icon: ReactNode | ((row: TRecord) => ReactNode);
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info' | 'inherit';
  permissionCodes?: string[];
  onClick: (row: TRecord, helpers: CrudHelpers<TRecord>) => void | Promise<void>;
  visible?: (row: TRecord) => boolean;
  disabled?: boolean | ((row: TRecord) => boolean);
}

/**
 * 筛选字段配置
 */
export interface FilterFieldConfig<TFilters> {
  name: keyof TFilters;
  type: 'text' | 'select' | 'switch';
  label?: string;
  placeholder?: string;
  options?: { label: string; value: boolean | string | number | undefined }[];
  isKeyword?: boolean;
  debounceMs?: number;
  searchIcon?: boolean;
}

/** A resource opts into the shared receipt, undo and refresh lifecycle. */
export interface CrudSoftDeleteConfig<TRecord, TKey extends string | number = number> {
  resourceType: string;
  displayName: (row: TRecord, t: (key: string) => string) => string;
  expectedUpdateTimeUtc: (row: TRecord) => number | null;
  confirmationContent: (row: TRecord, t: (key: string) => string) => ReactNode;
  delete: (args: {
    data: { id: TKey; expectedUpdateTimeUtc: number | null };
    errorPresentation: 'local';
  }) => Promise<{ data: { ok?: boolean; data?: unknown } }>;
  canOpenRecycleBin: () => boolean;
  verifyCurrent?: (row: TRecord) => Promise<true | null>;
  retryableErrorCodes?: readonly string[];
  stateChangedErrorCodes?: readonly string[];
}

/**
 * 全局低代码 CRUD 页面核心配置接口
 */
export interface SchemaCrudConfig<
  TRecord,
  TFilters,
  TApiData,
  TExtra = unknown,
  TAddData = never,
  TUpdateData = never,
  TKey extends string | number = number,
> {
  /** 嵌入式模式（省去 PageLayout 壳，供 Tabs 或 Drawer 内嵌使用） */
  embedded?: boolean;

  /** 页面可见时静默刷新间隔；不设置则不轮询。 */
  refreshIntervalMs?: number;

  /** 启用游标分页模式：total 与翻页解耦，由 hasMore/cursor 驱动翻页 */
  cursorPagination?: boolean;

  /** Omit this option to retain the existing hard-delete interaction. */
  softDelete?: CrudSoftDeleteConfig<TRecord, TKey>;

  /**
   * Reused instances that switch ordinary CRUD resources must supply a stable business key.
   * Changing render callbacks does not change this identity.
   */
  resourceKey?: string;

  // API 异步网络请求接口定义
  api: {
    list: (args: { data: TApiData; errorPresentation?: 'global' | 'local' }) => Promise<{
      data: {
        ok?: boolean;
        data?: { list?: TRecord[]; total?: number; hasMore?: boolean; cursor?: string };
      };
    }>;
    detail?: {
      fn: (args: {
        data: Record<string, unknown>;
        errorPresentation?: 'global' | 'local';
      }) => Promise<{
        data: { ok?: boolean; data?: Partial<TRecord> };
      }>;
      loadOnEdit?: boolean;
      payloadKey?: string;
    };
    add?: (args: { data: TAddData }) => Promise<unknown>;
    update?: (args: { data: TUpdateData }) => Promise<unknown>;
    delete?: (args: { data: { id: TKey } }) => Promise<unknown>;
  };

  // 国际化与标识符主键定义
  apiKeyName?: keyof TRecord; // 默认 'id'

  // 全局 CRUD 各类功能模块权限代码配置
  permissions?: {
    add?: string[];
    edit?: string[];
    delete?: string[];
  };

  // 筛选器配置
  filter: {
    defaultFilters: TFilters;
    fields: (t: (key: string) => string, extraContext?: TExtra) => FilterFieldConfig<TFilters>[];
    transformRequest?: (filters: TFilters) => TApiData;
  };

  // 表格与卡片配置
  table: {
    columns: (
      t: (key: string) => string,
      extraContext?: TExtra,
      helpers?: CrudHelpers<TRecord>,
    ) => TableColumn<TRecord>[];
    cardFields: (t: (key: string) => string, extraContext?: TExtra) => CardField<TRecord>[];
    actions?: (
      t: (key: string) => string,
      extraContext?: TExtra,
      helpers?: CrudHelpers<TRecord>,
    ) => RowAction<TRecord>[];
  };

  // 表单与 JSON Schema 渲染配置
  form: {
    schema: Record<string, unknown> | string;
    updateSchema?: Record<string, unknown> | string;
    defaultForm: Partial<TRecord>;
    /** 若开启，则先执行 beforeSubmit 转换后再做 AJV 客户端校验 */
    validateAfterTransform?: boolean;
    afterOpen?: (
      form: Partial<TRecord>,
      isEdit: boolean,
      row?: TRecord,
      extraContext?: TExtra,
    ) => Partial<TRecord>;
    beforeSubmit?: (
      form: Partial<TRecord>,
      isEdit: boolean,
      extraContext?: TExtra,
    ) => Partial<TRecord> | Promise<Partial<TRecord>>;
    afterAdd?: (
      response: unknown,
      submittedForm: Partial<TRecord>,
      helpers: { refreshTable: () => void },
    ) => void | Promise<void>;
    renderForm?: (
      form: Partial<TRecord>,
      setForm: Dispatch<SetStateAction<Partial<TRecord>>>,
      isMobile: boolean,
      t: (key: string) => string,
      extraContext?: TExtra,
      isEdit?: boolean,
    ) => ReactNode;
  };
}
