import React, { useState, useEffect, useRef } from 'react';
import { Stack } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

import { PageLayout } from '@/components/Responsive/index';
import ResponsiveList from '@/components/Responsive/ResponsiveList';
import { ResponsiveButton, ResponsiveIconButton } from '@/components/Responsive/index';

import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import { useFormError } from '@/hooks/useFormError';
import { useValidator } from '@/utils/validator';

import type { SchemaCrudConfig, CrudHelpers, QueryState } from './types';
import { Filter } from './components/Filter';
import { FormDialog } from './components/FormDialog';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

interface FetchListOptions<TRecord, TFilters, TApiData, TExtra> {
  config: SchemaCrudConfig<TRecord, TFilters, TApiData, TExtra>;
  setList: (list: TRecord[]) => void;
  setTotal: (total: number) => void;
  setFilterCount: (count: number) => void;
  setQuery: React.Dispatch<React.SetStateAction<QueryState<TFilters>>>;
  setLoading: (loading: boolean) => void;
  setIsSearching: (isSearching: boolean) => void;
  // 游标分页支持
  cursorMapRef?: React.MutableRefObject<Record<number, string | undefined>>;
  setCursorMap?: React.Dispatch<React.SetStateAction<Record<number, string | undefined>>>;
  setHasMore?: (hasMore: boolean) => void;
}

async function executeFetchList<TRecord, TFilters, TApiData, TExtra>(
  query: QueryState<TFilters>,
  options: FetchListOptions<TRecord, TFilters, TApiData, TExtra>,
) {
  const {
    config,
    setList,
    setTotal,
    setFilterCount,
    setQuery,
    setLoading,
    setIsSearching,
    cursorMapRef,
    setCursorMap,
    setHasMore,
  } = options;

  setLoading(true);
  try {
    let dataPayload = {
      pageNo: query.page,
      pageSize: query.pageSize,
      ...query.filters,
    } as unknown as TApiData;

    if (config.filter.transformRequest) {
      dataPayload = config.filter.transformRequest(query.filters);
      // 确保包含分页字段
      (dataPayload as unknown as { pageNo: number }).pageNo = query.page;
      (dataPayload as unknown as { pageSize: number }).pageSize = query.pageSize;
    }

    // 游标分页：注入 cursor
    if (config.cursorPagination && cursorMapRef) {
      (dataPayload as unknown as { cursor?: string }).cursor = cursorMapRef.current[query.page];
    }

    const res = await config.api.list({ data: dataPayload });
    const responseData = res.data?.data;
    const dataList = responseData?.list || [];

    setList(dataList);
    setQuery((prev) => ({ ...prev, page: query.page }));

    if (config.cursorPagination) {
      // 游标分页：用 hasMore 计算虚拟 total
      const hasMoreFlag = responseData?.hasMore ?? false;
      const nextCursor = responseData?.cursor;
      setHasMore?.(hasMoreFlag);
      setCursorMap?.((prev) => ({ ...prev, [query.page + 1]: nextCursor }));
      const virtualTotal = hasMoreFlag
        ? query.page * query.pageSize + 1
        : (query.page - 1) * query.pageSize + dataList.length;
      setTotal(virtualTotal);
      setFilterCount(dataList.length);
    } else {
      const totalCount = responseData?.total || 0;
      setTotal(totalCount);
      setFilterCount(totalCount);
    }
  } catch {
    setList([]);
    setTotal(0);
    setFilterCount(0);
  } finally {
    setLoading(false);
    setIsSearching(false);
  }
}

interface SchemaCrudPageProps<TRecord, TFilters, TApiData, TExtra = unknown> {
  config: SchemaCrudConfig<TRecord, TFilters, TApiData, TExtra>;
  extraContext?: TExtra;
  customActions?: React.ReactNode;
}

export function SchemaCrudPage<TRecord, TFilters, TApiData, TExtra = unknown>({
  config,
  extraContext,
  customActions,
}: SchemaCrudPageProps<TRecord, TFilters, TApiData, TExtra>) {
  const t = useTranslation();
  const { isMobile } = useResponsive();

  // 使用 ref 持有 config，避免 config 对象引用变化触发 useEffect 重复执行
  const configRef = useRef(config);
  configRef.current = config;

  // 1. 列表核心状态与查询参数大对象管理
  const [list, setList] = useState<TRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState<QueryState<TFilters>>({
    page: 1,
    pageSize: 10,
    filters: config.filter.defaultFilters,
  });

  // 1.5 游标分页状态
  const [cursorMap, setCursorMap] = useState<Record<number, string | undefined>>({});
  const cursorMapRef = useRef(cursorMap);
  cursorMapRef.current = cursorMap;
  const [, setHasMore] = useState(false);

  // 2. 辅助筛选器状态管理
  const [keywordInput, setKeywordInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filterCount, setFilterCount] = useState(0);

  // 3. 表单/对话框状态管理
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<TRecord>>(config.form.defaultForm);
  const [formLoading, setFormLoading] = useState(false);

  // 4. 删除确认框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<TRecord | null>(null);

  // 5. AJV 表单验证与校验错误处理 Hook
  const { fieldErrors, handleFormError, clearErrors, setFieldErrors, clearFieldError, rootSchema } =
    useFormError(config.form.schema);
  const { validate: validateAdd } = useValidator(config.form.schema);
  const { validate: validateUpdate } = useValidator(config.form.updateSchema || config.form.schema);

  const errorContextValue = { fieldErrors, clearFieldError, rootSchema };

  // 获取/刷新表格数据
  const fetchList = (currentQuery: QueryState<TFilters>) => {
    executeFetchList(currentQuery, {
      config: configRef.current,
      setList,
      setTotal,
      setFilterCount,
      setQuery,
      setLoading,
      setIsSearching,
      cursorMapRef,
      setCursorMap,
      setHasMore,
    });
  };

  // 初始加载及分页大小变化监听
  useEffect(() => {
    const cfg = configRef.current;
    const newQuery = {
      page: 1,
      pageSize: query.pageSize,
      filters: cfg.filter.defaultFilters,
    };
    setQuery(newQuery);
    // 重置游标
    setCursorMap({});
    executeFetchList(newQuery, {
      config: cfg,
      setList,
      setTotal,
      setFilterCount,
      setQuery,
      setLoading,
      setIsSearching,
      cursorMapRef,
      setCursorMap,
      setHasMore,
    });
    // 检查关键字字段，如果有则初始化 keywordInput
    if ('keyword' in (cfg.filter.defaultFilters as Record<string, unknown>)) {
      setKeywordInput((cfg.filter.defaultFilters as unknown as { keyword: string }).keyword || '');
    }
  }, [query.pageSize]);

  // 关键字搜索防抖
  useEffect(() => {
    const filtersRecord = query.filters as unknown as Record<string, unknown>;
    if ('keyword' in filtersRecord) {
      const currentKeyword = filtersRecord.keyword as string;
      if (keywordInput !== currentKeyword) {
        setIsSearching(true);
        const timer = setTimeout(() => {
          const newQuery = {
            ...query,
            page: 1,
            filters: { ...query.filters, keyword: keywordInput },
          };
          setQuery(newQuery);
          // 搜索变化时重置游标
          setCursorMap({});
          executeFetchList(newQuery, {
            config: configRef.current,
            setList,
            setTotal,
            setFilterCount,
            setQuery,
            setLoading,
            setIsSearching,
            cursorMapRef,
            setCursorMap,
            setHasMore,
          });
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [keywordInput, query]);

  // 筛选事件处理
  const handleFilterChange = (
    key: keyof TFilters,
    value: boolean | string | number | undefined,
  ) => {
    if (key === 'keyword') {
      setKeywordInput(value as string);
    } else {
      const newQuery = {
        ...query,
        page: 1,
        filters: {
          ...query.filters,
          [key]: value,
        },
      };
      setQuery(newQuery);
      setCursorMap({});
      fetchList(newQuery);
    }
  };

  const handleClearFilters = () => {
    setKeywordInput('');
    setCursorMap({});
    const newQuery = {
      page: 1,
      pageSize: query.pageSize,
      filters: config.filter.defaultFilters,
    };
    setQuery(newQuery);
    fetchList(newQuery);
  };

  const hasActiveFilters = () => {
    const defaultRecord = config.filter.defaultFilters as Record<string, unknown>;
    const currentRecord = query.filters as Record<string, unknown>;
    return Object.keys(currentRecord).some((key) => {
      if (key === 'keyword') return !!keywordInput;
      return currentRecord[key] !== defaultRecord[key];
    });
  };

  // 表单操作处理
  const handleOpenAdd = () => {
    setEditId(null);
    let initialForm = { ...config.form.defaultForm };
    if (config.form.afterOpen) {
      initialForm = config.form.afterOpen(initialForm, false);
    }
    setForm(initialForm);
    clearErrors();
    setFormOpen(true);
  };

  const handleOpenEdit = (row: TRecord) => {
    const idKey = (config.apiKeyName || 'id') as keyof TRecord;
    const recordId = row[idKey] as unknown as number;
    setEditId(recordId);
    let initialForm = { ...row } as Partial<TRecord>;
    if (config.form.afterOpen) {
      initialForm = config.form.afterOpen(initialForm, true, row);
    }
    setForm(initialForm);
    clearErrors();
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditId(null);
    setForm(config.form.defaultForm);
    clearErrors();
    setFormOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isEdit = !!editId;
    // 根据操作类型选择对应的 schema 和验证器
    const activeSchema = isEdit
      ? config.form.updateSchema || config.form.schema
      : config.form.schema;
    const validate = isEdit ? validateUpdate : validateAdd;

    // 前端预验证
    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setFormLoading(true);
    try {
      let submitForm = { ...form };
      if (config.form.beforeSubmit) {
        submitForm = config.form.beforeSubmit(submitForm, isEdit);
      }

      // 根据 schema 的 properties 过滤掉多余字段（如审计字段）
      const allowedKeys = Object.keys(
        (activeSchema as { properties?: Record<string, unknown> }).properties || {},
      );
      if (allowedKeys.length > 0) {
        const filtered = {} as Partial<TRecord>;
        for (const key of allowedKeys) {
          if (key in (submitForm as Record<string, unknown>)) {
            (filtered as Record<string, unknown>)[key] = (submitForm as Record<string, unknown>)[
              key
            ];
          }
        }
        submitForm = filtered;
      }

      if (editId) {
        const idKey = (config.apiKeyName || 'id') as keyof TRecord;
        if (config.api.update) {
          await config.api.update({
            data: { ...submitForm, [idKey]: editId } as unknown as TRecord,
          });
        }
      } else {
        if (config.api.add) {
          await config.api.add({
            data: submitForm as unknown as Omit<TRecord, 'id'>,
          });
        }
      }

      handleCloseForm();
      if (editId) {
        fetchList(query);
      } else {
        const newQuery = { ...query, page: 1 };
        setQuery(newQuery);
        fetchList(newQuery);
      }
    } catch (err: unknown) {
      handleFormError(err);
    } finally {
      setFormLoading(false);
    }
  };

  // 删除操作处理
  const handleOpenDeleteConfirm = (row: TRecord) => {
    setRowToDelete(row);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setRowToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (rowToDelete && config.api.delete) {
      const idKey = (config.apiKeyName || 'id') as keyof TRecord;
      const recordId = rowToDelete[idKey] as unknown as number;
      try {
        await config.api.delete({ data: { id: recordId } });
        const newQuery = { ...query, page: 1 };
        setQuery(newQuery);
        fetchList(newQuery);
      } catch (err: unknown) {
        console.error('Delete failed:', err);
      } finally {
        handleCloseDeleteConfirm();
      }
    }
  };

  // 提供给行操作的 Helper 上下文
  const helpers: CrudHelpers<TRecord> = {
    openEdit: handleOpenEdit,
    deleteRow: async (row) => handleOpenDeleteConfirm(row),
    refreshTable: () => fetchList(query),
  };

  // 自定义与标准操作按钮合并
  const renderRowActions = (row: TRecord) => {
    const editPerm = config.permissions?.edit || [];
    const deletePerm = config.permissions?.delete || [];

    const builtInActions: React.ReactNode[] = [];

    // 编辑按钮
    if (config.api.update) {
      builtInActions.push(
        <ResponsiveIconButton
          key="edit"
          onClick={() => handleOpenEdit(row)}
          color="primary"
          size="small"
          permissionCodes={editPerm}
        >
          <EditIcon />
        </ResponsiveIconButton>,
      );
    }

    // 删除按钮
    if (config.api.delete) {
      builtInActions.push(
        <ResponsiveIconButton
          key="delete"
          onClick={() => handleOpenDeleteConfirm(row)}
          color="error"
          size="small"
          permissionCodes={deletePerm}
        >
          <DeleteIcon />
        </ResponsiveIconButton>,
      );
    }

    // 处理配置的自定义操作
    const customActionsConfig = config.table.actions ? config.table.actions(t, extraContext) : [];
    const customActions = customActionsConfig
      .filter((act) => !act.visible || act.visible(row))
      .map((act) => (
        <ResponsiveIconButton
          key={act.key}
          onClick={() => act.onClick(row, helpers)}
          color={act.color || 'primary'}
          size="small"
          permissionCodes={act.permissionCodes}
          disabled={typeof act.disabled === 'function' ? act.disabled(row) : act.disabled}
        >
          {typeof act.icon === 'function' ? act.icon(row) : act.icon}
        </ResponsiveIconButton>
      ));

    return (
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
        {customActions}
        {builtInActions}
      </Stack>
    );
  };

  // 表格列扩展：自动拼接操作列
  const columns = (() => {
    const rawColumns = config.table.columns(t, extraContext);
    const hasActions = config.api.update || config.api.delete || config.table.actions;

    if (hasActions) {
      return [
        ...rawColumns,
        {
          title: t('table.actions'),
          align: 'center' as const,
          render: (row: TRecord) => renderRowActions(row),
        },
      ];
    }
    return rawColumns;
  })();

  const cardFields = config.table.cardFields(t, extraContext);

  const filterFields = config.filter.fields(t, extraContext);

  return (
    <PageLayout
      title={t(config.titleKey)}
      actions={
        <Stack direction="row" spacing={1}>
          {customActions}
          {config.api.add && (
            <ResponsiveButton
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAdd}
              permissionCodes={config.permissions?.add || []}
            >
              {t('dialog.add')}
            </ResponsiveButton>
          )}
        </Stack>
      }
    >
      {/* 1. 筛选组件 (Filter) */}
      <Filter
        filterFields={filterFields}
        filters={query.filters}
        keywordInput={keywordInput}
        isSearching={isSearching}
        filterCount={filterCount}
        handleFilterChange={handleFilterChange}
        handleClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters()}
        t={t}
      />

      {/* 2. 表格与卡片列表组件 */}
      <ResponsiveList
        data={list}
        loading={loading}
        page={query.page}
        total={total}
        pageSize={query.pageSize}
        onPageChange={(newPage) => {
          const newQuery = { ...query, page: newPage };
          setQuery(newQuery);
          fetchList(newQuery);
        }}
        onPageSizeChange={(newPageSize) => {
          const newQuery = { ...query, page: 1, pageSize: newPageSize };
          setQuery(newQuery);
          fetchList(newQuery);
        }}
        keyExtractor={(row) => {
          const idKey = (config.apiKeyName || 'id') as keyof TRecord;
          return row[idKey] as unknown as string | number;
        }}
        columns={columns}
        cardFields={cardFields}
        cardActions={(row) => renderRowActions(row)}
      />

      {/* 3. 新增/编辑表单对话框 */}
      <FormDialog
        open={formOpen}
        onClose={handleCloseForm}
        editId={editId}
        form={form}
        setForm={setForm}
        formLoading={formLoading}
        errorContextValue={errorContextValue}
        config={config}
        extraContext={extraContext}
        onSubmit={handleFormSubmit}
        isMobile={isMobile}
        t={t}
      />

      {/* 4. 删除确认对话框 */}
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        onConfirm={handleConfirmDelete}
        t={t}
      />
    </PageLayout>
  );
}
