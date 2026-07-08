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
}

/**
 * 全局低代码 CRUD 页面核心配置接口
 */
export interface SchemaCrudConfig<TRecord, TFilters, TApiData, TExtra = unknown> {
  /** 启用游标分页模式：total 与翻页解耦，由 hasMore/cursor 驱动翻页 */
  cursorPagination?: boolean;

  // API 异步网络请求接口定义
  api: {
    list: (args: { data: TApiData }) => Promise<{
      data: {
        data?: { list?: TRecord[]; total?: number; hasMore?: boolean; cursor?: string };
      };
    }>;
    add?: (args: { data: Omit<TRecord, 'id'> }) => Promise<unknown>;
    update?: (args: { data: TRecord }) => Promise<unknown>;
    delete?: (args: { data: { id: number } }) => Promise<unknown>;
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
    columns: (t: (key: string) => string, extraContext?: TExtra) => TableColumn<TRecord>[];
    cardFields: (t: (key: string) => string, extraContext?: TExtra) => CardField<TRecord>[];
    actions?: (t: (key: string) => string, extraContext?: TExtra) => RowAction<TRecord>[];
  };

  // 表单与 JSON Schema 渲染配置
  form: {
    schema: Record<string, unknown> | string;
    updateSchema?: Record<string, unknown> | string;
    defaultForm: Partial<TRecord>;
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
    ) => Partial<TRecord>;
    renderForm?: (
      form: Partial<TRecord>,
      setForm: Dispatch<SetStateAction<Partial<TRecord>>>,
      isMobile: boolean,
      t: (key: string) => string,
      extraContext?: TExtra,
    ) => ReactNode;
  };
}
