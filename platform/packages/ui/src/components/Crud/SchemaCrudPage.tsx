import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Stack } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

import { PageLayout } from '@/components/Responsive/index';
import ResponsiveList from '@/components/Responsive/ResponsiveList';
import { ResponsiveButton, ResponsiveIconButton } from '@/components/Responsive/index';

import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import { useFormError } from '@/hooks/useFormError';
import { useValidator } from '@/utils/validator';
import { useSchema } from '@/hooks/useSchema';

import type { SchemaCrudConfig, CrudHelpers, QueryState } from './types';
import { Filter } from './components/Filter';
import { FormDialog } from './components/FormDialog';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

export interface CrudState<TRecord, TFilters> {
  list: TRecord[];
  loading: boolean;
  total: number;
  query: QueryState<TFilters>;
  cursorMap: Record<number, string | undefined>;
  hasMore: boolean;
  keywordInput: string;
  isSearching: boolean;
  filterCount: number;
  formOpen: boolean;
  editId: number | null;
  form: Partial<TRecord>;
  formLoading: boolean;
  deleteConfirmOpen: boolean;
  rowToDelete: TRecord | null;
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

  // 1. 使用 useState 管理组件所有状态
  const [state, setState] = useState<CrudState<TRecord, TFilters>>({
    list: [],
    loading: false,
    total: 0,
    query: {
      page: 1,
      pageSize: 10,
      filters: config.filter.defaultFilters,
    },
    cursorMap: {},
    hasMore: false,
    keywordInput: '',
    isSearching: false,
    filterCount: 0,
    formOpen: false,
    editId: null,
    form: config.form.defaultForm,
    formLoading: false,
    deleteConfirmOpen: false,
    rowToDelete: null,
  });

  const {
    list,
    loading,
    total,
    query,
    keywordInput,
    isSearching,
    filterCount,
    formOpen,
    editId,
    form,
    formLoading,
    deleteConfirmOpen,
    rowToDelete,
  } = state;

  // 保持一个最新的 stateRef 供异步 API 请求时读取最新状态（如最新的 cursorMap）
  const stateRef = useRef(state);
  stateRef.current = state;

  const updateState = useCallback(
    (
      updates:
        | Partial<CrudState<TRecord, TFilters>>
        | ((prev: CrudState<TRecord, TFilters>) => Partial<CrudState<TRecord, TFilters>>),
    ) => {
      setState((prev) => {
        const next = typeof updates === 'function' ? updates(prev) : updates;
        return { ...prev, ...next };
      });
    },
    [],
  );

  // 5. 动态 Schema 解析：支持 string（按名称动态获取）和 object（直接使用）两种模式
  const isStringSchema = typeof config.form.schema === 'string';
  const dynamicSchema = useSchema(
    isStringSchema
      ? {
          schema: config.form.schema as string,
          updateSchema:
            typeof config.form.updateSchema === 'string'
              ? (config.form.updateSchema as string)
              : undefined,
        }
      : { schema: '' }, // 不启用动态获取
  );

  const resolvedSchema = useMemo(() => {
    if (isStringSchema) return dynamicSchema.schema;
    return config.form.schema as Record<string, unknown>;
  }, [isStringSchema, dynamicSchema.schema, config.form.schema]);

  const resolvedUpdateSchema = useMemo(() => {
    if (typeof config.form.updateSchema === 'string') return dynamicSchema.updateSchema;
    return config.form.updateSchema as Record<string, unknown> | undefined;
  }, [config.form.updateSchema, dynamicSchema.updateSchema]);

  // AJV 表单验证与校验错误处理 Hook
  const { fieldErrors, handleFormError, clearErrors, setFieldErrors, clearFieldError, rootSchema } =
    useFormError(resolvedSchema ?? undefined);
  const { validate: validateAdd } = useValidator(resolvedSchema);
  const { validate: validateUpdate } = useValidator(resolvedUpdateSchema || resolvedSchema);

  const errorContextValue = { fieldErrors, clearFieldError, rootSchema };

  // 获取/刷新表格数据
  const fetchList = useCallback(
    async (currentQuery: QueryState<TFilters>) => {
      updateState({ loading: true });
      try {
        let dataPayload = {
          pageNo: currentQuery.page,
          pageSize: currentQuery.pageSize,
          ...currentQuery.filters,
        } as unknown as TApiData;

        if (configRef.current.filter.transformRequest) {
          dataPayload = configRef.current.filter.transformRequest(currentQuery.filters);
          // 确保包含分页字段
          (dataPayload as unknown as { pageNo: number }).pageNo = currentQuery.page;
          (dataPayload as unknown as { pageSize: number }).pageSize = currentQuery.pageSize;
        }

        // 游标分页：注入 cursor
        if (configRef.current.cursorPagination) {
          (dataPayload as unknown as { cursor?: string }).cursor =
            stateRef.current.cursorMap[currentQuery.page];
        }

        const res = await configRef.current.api.list({ data: dataPayload });
        const responseData = res.data?.data;
        const dataList = responseData?.list || [];

        if (configRef.current.cursorPagination) {
          const hasMore = responseData?.hasMore ?? false;
          updateState((prev) => {
            const virtualTotal = hasMore
              ? currentQuery.page * currentQuery.pageSize + 1
              : (currentQuery.page - 1) * currentQuery.pageSize + dataList.length;
            return {
              list: dataList,
              total: virtualTotal,
              filterCount: dataList.length,
              query: { ...prev.query, page: currentQuery.page },
              hasMore,
              cursorMap: { ...prev.cursorMap, [currentQuery.page + 1]: responseData?.cursor },
              loading: false,
              isSearching: false,
            };
          });
        } else {
          const totalCount = responseData?.total || 0;
          updateState((prev) => ({
            list: dataList,
            total: totalCount,
            filterCount: totalCount,
            query: { ...prev.query, page: currentQuery.page },
            loading: false,
            isSearching: false,
          }));
        }
      } catch {
        updateState({
          list: [],
          total: 0,
          filterCount: 0,
          loading: false,
          isSearching: false,
        });
      }
    },
    [updateState],
  );

  // 初始加载及分页大小变化监听
  useEffect(() => {
    const cfg = configRef.current;
    const newQuery = {
      page: 1,
      pageSize: query.pageSize,
      filters: cfg.filter.defaultFilters,
    };

    // 检查关键字字段，如果有则初始化 keywordInput
    let initialKeyword = '';
    if ('keyword' in (cfg.filter.defaultFilters as Record<string, unknown>)) {
      initialKeyword = (cfg.filter.defaultFilters as unknown as { keyword: string }).keyword || '';
    }

    updateState({
      query: newQuery,
      cursorMap: {},
      keywordInput: initialKeyword,
    });

    fetchList(newQuery);
  }, [query.pageSize, fetchList, updateState]);

  // 关键字搜索防抖
  useEffect(() => {
    const filtersRecord = query.filters as unknown as Record<string, unknown>;
    if ('keyword' in filtersRecord) {
      const currentKeyword = filtersRecord.keyword as string;
      if (keywordInput !== currentKeyword) {
        updateState({ isSearching: true });
        const timer = setTimeout(() => {
          const newQuery = {
            ...query,
            page: 1,
            filters: { ...query.filters, keyword: keywordInput },
          };
          updateState({ query: newQuery, cursorMap: {} });
          fetchList(newQuery);
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [keywordInput, query, fetchList, updateState]);

  // 筛选事件处理
  const handleFilterChange = (
    key: keyof TFilters,
    value: boolean | string | number | undefined,
  ) => {
    if (key === 'keyword') {
      updateState({ keywordInput: value as string });
    } else {
      const newQuery = {
        ...query,
        page: 1,
        filters: {
          ...query.filters,
          [key]: value,
        },
      };
      updateState({ query: newQuery, cursorMap: {} });
      fetchList(newQuery);
    }
  };

  const handleClearFilters = () => {
    const newQuery = {
      page: 1,
      pageSize: query.pageSize,
      filters: configRef.current.filter.defaultFilters,
    };
    updateState({ query: newQuery, cursorMap: {}, keywordInput: '' });
    fetchList(newQuery);
  };

  const hasActiveFilters = () => {
    const defaultRecord = configRef.current.filter.defaultFilters as Record<string, unknown>;
    const currentRecord = query.filters as Record<string, unknown>;
    return Object.keys(currentRecord).some((key) => {
      if (key === 'keyword') return !!keywordInput;
      return currentRecord[key] !== defaultRecord[key];
    });
  };

  // 表单操作处理
  const handleOpenAdd = () => {
    let initialForm = { ...configRef.current.form.defaultForm };
    if (configRef.current.form.afterOpen) {
      initialForm = configRef.current.form.afterOpen(initialForm, false);
    }
    clearErrors();
    updateState({ editId: null, form: initialForm, formOpen: true });
  };

  const handleOpenEdit = (row: TRecord) => {
    const idKey = (configRef.current.apiKeyName || 'id') as keyof TRecord;
    const recordId = row[idKey] as unknown as number;
    let initialForm = { ...row } as Partial<TRecord>;
    if (configRef.current.form.afterOpen) {
      initialForm = configRef.current.form.afterOpen(initialForm, true, row);
    }
    clearErrors();
    updateState({ editId: recordId, form: initialForm, formOpen: true });
  };

  const handleCloseForm = () => {
    clearErrors();
    updateState({ editId: null, form: configRef.current.form.defaultForm, formOpen: false });
  };

  const setForm = (newForm: React.SetStateAction<Partial<TRecord>>) => {
    updateState((prev) => {
      const nextForm = typeof newForm === 'function' ? newForm(prev.form) : newForm;
      return { form: nextForm };
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isEdit = !!editId;
    // 根据操作类型选择对应的 schema 和验证器
    const activeSchema = isEdit ? resolvedUpdateSchema || resolvedSchema : resolvedSchema;
    const validate = isEdit ? validateUpdate : validateAdd;

    // 前端预验证
    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length > 0) {
      console.warn('Form validation failed:', clientErrors);
      setFieldErrors(clientErrors);
      return;
    }

    updateState({ formLoading: true });
    try {
      let submitForm = { ...form };
      if (configRef.current.form.beforeSubmit) {
        submitForm = configRef.current.form.beforeSubmit(submitForm, isEdit);
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
        const idKey = (configRef.current.apiKeyName || 'id') as keyof TRecord;
        if (configRef.current.api.update) {
          await configRef.current.api.update({
            data: { ...submitForm, [idKey]: editId } as unknown as TRecord,
          });
        }
      } else {
        if (configRef.current.api.add) {
          await configRef.current.api.add({
            data: submitForm as unknown as Omit<TRecord, 'id'>,
          });
        }
      }

      handleCloseForm();
      if (editId) {
        fetchList(query);
      } else {
        const newQuery = { ...query, page: 1 };
        updateState({ query: newQuery });
        fetchList(newQuery);
      }
    } catch (err: unknown) {
      handleFormError(err);
    } finally {
      updateState({ formLoading: false });
    }
  };

  // 删除操作处理
  const handleOpenDeleteConfirm = (row: TRecord) => {
    updateState({ rowToDelete: row, deleteConfirmOpen: true });
  };

  const handleCloseDeleteConfirm = () => {
    updateState({ rowToDelete: null, deleteConfirmOpen: false });
  };

  const handleConfirmDelete = async () => {
    if (rowToDelete && configRef.current.api.delete) {
      const idKey = (configRef.current.apiKeyName || 'id') as keyof TRecord;
      const recordId = rowToDelete[idKey] as unknown as number;
      try {
        await configRef.current.api.delete({ data: { id: recordId } });
        const newQuery = { ...query, page: 1 };
        updateState({ query: newQuery });
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
          updateState({ query: newQuery });
          fetchList(newQuery);
        }}
        onPageSizeChange={(newPageSize) => {
          const newQuery = { ...query, page: 1, pageSize: newPageSize };
          updateState({ query: newQuery });
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
        resolvedSchema={resolvedSchema}
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
