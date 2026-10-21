import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

import { PageLayout } from '@/components/Responsive/index';
import ResponsiveList from '@/components/Responsive/ResponsiveList';
import { ResponsiveButton, ResponsiveIconButton } from '@/components/Responsive/index';

import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import { useFormError } from '@/hooks/useFormError';
import { useValidator } from '@/utils/validator';
import { useSchema } from '@/hooks/useSchema';
import { showSnackbar } from '@/components/Notification';
import { classifyApiFailure } from '@/api/config';
import {
  captureAuthSession,
  isCurrentAuthSession,
  subscribeAuthChanges,
  type AuthSessionSnapshot,
} from '@/utils/auth';
import {
  captureUndoRequestTime,
  publishResourceChange,
  showDeleteUndo,
  subscribeResourceChanges,
} from '@/utils/delete-undo';

import type { SchemaCrudConfig, CrudHelpers, QueryState } from './types';
import { Filter } from './components/Filter';
import { FormDialog } from './components/FormDialog';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';

const CUSTOM_FORM_FALLBACK_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: true,
} as const;

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
  deleteLoading: boolean;
  listFailed: boolean;
  quietListFailure: boolean;
  resourceIdentity: string;
}

interface SchemaCrudPageProps<
  TRecord,
  TFilters,
  TApiData,
  TExtra = unknown,
  TAddData = Record<string, unknown>,
  TUpdateData = Record<string, unknown>,
> {
  config: SchemaCrudConfig<TRecord, TFilters, TApiData, TExtra, TAddData, TUpdateData>;
  extraContext?: TExtra;
  customActions?: React.ReactNode;
}

export function SchemaCrudPage<
  TRecord,
  TFilters,
  TApiData,
  TExtra = unknown,
  TAddData = Record<string, unknown>,
  TUpdateData = Record<string, unknown>,
>({
  config,
  extraContext,
  customActions,
}: SchemaCrudPageProps<TRecord, TFilters, TApiData, TExtra, TAddData, TUpdateData>) {
  const t = useTranslation();
  const { isMobile } = useResponsive();
  const resourceIdentity = config.softDelete
    ? `soft:${config.softDelete.resourceType}`
    : `crud:${config.resourceKey ?? 'default'}`;
  const resourceIdentityRef = useRef(resourceIdentity);
  const resourceGenerationRef = useRef(0);
  if (resourceIdentityRef.current !== resourceIdentity) resourceGenerationRef.current += 1;
  resourceIdentityRef.current = resourceIdentity;

  // 使用 ref 持有 config，避免 config 对象引用变化触发 useEffect 重复执行
  const configRef = useRef(config);
  configRef.current = config;
  const mounted = useRef(false);
  const requestVersion = useRef(0);
  const mutationInFlight = useRef<symbol | null>(null);
  const deletionSelection = useRef<{
    identity: string;
    row: TRecord;
    id: number;
    session: AuthSessionSnapshot;
    softDelete: typeof config.softDelete;
    delete: typeof config.api.delete;
  } | null>(null);

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
    deleteLoading: false,
    listFailed: false,
    quietListFailure: false,
    resourceIdentity,
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
    deleteLoading,
    listFailed,
    quietListFailure,
  } = state;
  const sameResource = state.resourceIdentity === resourceIdentity;

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
    if (isStringSchema) {
      if (dynamicSchema.schema) return dynamicSchema.schema;
      if (!dynamicSchema.loading && config.form.renderForm) return CUSTOM_FORM_FALLBACK_SCHEMA;
      return null;
    }
    return config.form.schema as Record<string, unknown>;
  }, [isStringSchema, dynamicSchema.schema, dynamicSchema.loading, config.form]);

  const resolvedUpdateSchema = useMemo(() => {
    if (typeof config.form.updateSchema === 'string') {
      if (dynamicSchema.updateSchema) return dynamicSchema.updateSchema;
      if (!dynamicSchema.loading && config.form.renderForm) return CUSTOM_FORM_FALLBACK_SCHEMA;
      return undefined;
    }
    return config.form.updateSchema as Record<string, unknown> | undefined;
  }, [config.form, dynamicSchema.loading, dynamicSchema.updateSchema]);

  const addUsesFallbackSchema = isStringSchema && !dynamicSchema.loading && !dynamicSchema.schema;
  const updateUsesFallbackSchema =
    typeof config.form.updateSchema === 'string' &&
    !dynamicSchema.loading &&
    !dynamicSchema.updateSchema;
  const usingFallbackSchema =
    !!config.form.renderForm &&
    (editId
      ? config.form.updateSchema
        ? updateUsesFallbackSchema
        : addUsesFallbackSchema
      : addUsesFallbackSchema);
  const activeDialogSchema = editId ? resolvedUpdateSchema || resolvedSchema : resolvedSchema;

  // AJV 表单验证与校验错误处理 Hook
  const { fieldErrors, handleFormError, clearErrors, setFieldErrors, clearFieldError, rootSchema } =
    useFormError(activeDialogSchema ?? undefined);
  const { validate: validateAdd } = useValidator(resolvedSchema);
  const { validate: validateUpdate } = useValidator(resolvedUpdateSchema || resolvedSchema);

  const errorContextValue = { fieldErrors, clearFieldError, rootSchema };

  useEffect(() => {
    mounted.current = true;
    const viewSession = captureAuthSession();
    const unsubscribe = subscribeAuthChanges(() => {
      if (isCurrentAuthSession(viewSession)) return;
      requestVersion.current += 1;
      updateState({
        list: [],
        total: 0,
        loading: false,
        rowToDelete: null,
        deleteConfirmOpen: false,
      });
    });
    return () => {
      mounted.current = false;
      requestVersion.current += 1;
      unsubscribe();
    };
  }, [updateState]);

  // 获取/刷新表格数据
  const fetchList = useCallback(
    async (
      currentQuery: QueryState<TFilters>,
      silent = false,
      presentation: 'local' | 'page' = 'page',
    ): Promise<boolean> => {
      if (!mounted.current) return true;
      const version = ++requestVersion.current;
      const session = captureAuthSession();
      const identity = resourceIdentityRef.current;
      const cfg = configRef.current;
      const acceptsResult = () =>
        mounted.current &&
        version === requestVersion.current &&
        identity === resourceIdentityRef.current &&
        isCurrentAuthSession(session);
      if (!silent) updateState({ loading: true });
      try {
        let dataPayload = {
          pageNo: currentQuery.page,
          pageSize: currentQuery.pageSize,
          ...currentQuery.filters,
        } as unknown as TApiData;

        if (cfg.filter.transformRequest) {
          dataPayload = cfg.filter.transformRequest(currentQuery.filters);
          // 确保包含分页字段
          (dataPayload as unknown as { pageNo: number }).pageNo = currentQuery.page;
          (dataPayload as unknown as { pageSize: number }).pageSize = currentQuery.pageSize;
        }

        // 游标分页：注入 cursor
        if (cfg.cursorPagination) {
          (dataPayload as unknown as { cursor?: string }).cursor =
            stateRef.current.cursorMap[currentQuery.page];
        }

        const res = await cfg.api.list({
          data: dataPayload,
          ...(cfg.softDelete ? { errorPresentation: 'local' as const } : {}),
        });
        if (!acceptsResult()) return true;
        const responseData = res.data?.data;
        if (cfg.softDelete && (res.data?.ok !== true || !Array.isArray(responseData?.list)))
          throw new Error('The list response could not be confirmed');
        const dataList = responseData?.list || [];

        if (cfg.cursorPagination) {
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
              listFailed: false,
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
            listFailed: false,
          }));
        }
        return true;
      } catch {
        if (!acceptsResult()) return true;
        if (!silent || cfg.softDelete) {
          updateState({
            list: [],
            total: 0,
            filterCount: 0,
            loading: false,
            isSearching: false,
            listFailed: !!cfg.softDelete,
            quietListFailure: presentation === 'local',
          });
        } else {
          updateState({ loading: false, isSearching: false });
        }
        return false;
      }
    },
    [updateState],
  );

  useEffect(() => {
    const resourceType = config.softDelete?.resourceType;
    if (!resourceType) return;
    return subscribeResourceChanges(resourceType, (presentation) =>
      fetchList(stateRef.current.query, false, presentation),
    );
  }, [config.softDelete?.resourceType, fetchList]);

  // 页面可见时静默刷新，始终读取最新分页与筛选，不触发表格 loading 闪烁。
  useEffect(() => {
    const intervalMs = configRef.current.refreshIntervalMs;
    if (!intervalMs) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchList(stateRef.current.query, true);
      }
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [fetchList]);

  useEffect(() => {
    requestVersion.current += 1;
    mutationInFlight.current = null;
    deletionSelection.current = null;
    clearErrors();
    updateState({
      resourceIdentity,
      list: [],
      total: 0,
      listFailed: false,
      deleteConfirmOpen: false,
      rowToDelete: null,
      deleteLoading: false,
      formOpen: false,
      formLoading: false,
      editId: null,
      form: configRef.current.form.defaultForm,
    });
  }, [resourceIdentity, clearErrors, updateState]);

  // 初始加载、资源切换及分页大小变化监听
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
  }, [resourceIdentity, query.pageSize, fetchList, updateState]);

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
    if (!sameResource) return;
    const cfg = configRef.current;
    const identity = resourceIdentityRef.current;
    const generation = resourceGenerationRef.current;
    const session = captureAuthSession();
    const acceptsSubmit = () =>
      mounted.current &&
      identity === resourceIdentityRef.current &&
      generation === resourceGenerationRef.current &&
      isCurrentAuthSession(session);

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
      if (cfg.form.beforeSubmit) {
        submitForm = cfg.form.beforeSubmit(submitForm, isEdit);
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
        const idKey = (cfg.apiKeyName || 'id') as keyof TRecord;
        if (cfg.api.update) {
          await cfg.api.update({
            data: { ...submitForm, [idKey]: editId } as never,
          });
        }
      } else {
        if (cfg.api.add) {
          await cfg.api.add({
            data: submitForm as never,
          });
        }
      }

      if (!acceptsSubmit()) return;
      handleCloseForm();
      if (editId) {
        fetchList(query);
      } else {
        const newQuery = { ...query, page: 1 };
        updateState({ query: newQuery });
        fetchList(newQuery);
      }
    } catch (err: unknown) {
      if (acceptsSubmit()) handleFormError(err);
    } finally {
      if (acceptsSubmit()) updateState({ formLoading: false });
    }
  };

  // 删除操作处理
  const handleOpenDeleteConfirm = (row: TRecord) => {
    const cfg = configRef.current;
    const idKey = (cfg.apiKeyName || 'id') as keyof TRecord;
    deletionSelection.current = {
      identity: resourceIdentityRef.current,
      row,
      id: row[idKey] as unknown as number,
      session: captureAuthSession(),
      softDelete: cfg.softDelete,
      delete: cfg.api.delete,
    };
    updateState({ rowToDelete: row, deleteConfirmOpen: true });
  };

  const handleCloseDeleteConfirm = () => {
    if (mutationInFlight.current) return;
    deletionSelection.current = null;
    updateState({ rowToDelete: null, deleteConfirmOpen: false });
  };

  const handleConfirmDelete = async () => {
    if (mutationInFlight.current) return;
    const selection = deletionSelection.current;
    if (
      !selection ||
      selection.identity !== resourceIdentityRef.current ||
      !isCurrentAuthSession(selection.session)
    )
      return;
    if (selection.delete || selection.softDelete) {
      const operation = Symbol('crud-delete');
      mutationInFlight.current = operation;
      updateState({ deleteLoading: true });
      const recordId = selection.id;
      const session = selection.session;
      try {
        const softDelete = selection.softDelete;
        if (softDelete) {
          const requestStartedAt = captureUndoRequestTime();
          const result = await softDelete
            .delete({
              data: {
                id: recordId,
                expectedUpdateTimeUtc: softDelete.expectedUpdateTimeUtc(selection.row),
              },
              errorPresentation: 'local',
            })
            .then(
              (response) =>
                response.data?.ok === false
                  ? {
                      ok: false as const,
                      failure: classifyApiFailure({ status: 200, ...response }),
                    }
                  : { ok: true as const, response },
              (error: unknown) => ({ ok: false as const, failure: classifyApiFailure(error) }),
            );
          if (!isCurrentAuthSession(session)) return;
          if (!result.ok && result.failure.kind === 'session') return;
          const verifyCurrent = softDelete.verifyCurrent;
          showDeleteUndo({
            receipt:
              result.ok && result.response.data?.ok === true ? result.response.data.data : null,
            resourceType: softDelete.resourceType,
            id: recordId,
            name: softDelete.displayName(selection.row, t),
            session,
            requestStartedAt,
            canOpenRecycleBin: softDelete.canOpenRecycleBin,
            verifyCurrent: verifyCurrent
              ? () =>
                  isCurrentAuthSession(session)
                    ? verifyCurrent(selection.row)
                    : Promise.resolve(null)
              : undefined,
            deletionFailure: result.ok ? undefined : result.failure,
            retryableErrorCodes: softDelete.retryableErrorCodes,
            stateChangedErrorCodes: softDelete.stateChangedErrorCodes,
          });
          if (result.ok || result.failure.kind === 'unknown')
            void publishResourceChange(softDelete.resourceType, 'page');
          return;
        }
        await selection.delete?.({ data: { id: recordId } });
        if (!isCurrentAuthSession(session)) return;
        showSnackbar({ message: t('common.deleteSuccess'), type: 'success' });
        if (selection.identity === resourceIdentityRef.current) {
          const newQuery = { ...stateRef.current.query, page: 1 };
          updateState({ query: newQuery });
          await fetchList(newQuery);
        }
      } catch {
        // 全局 HTTP 拦截器已统一展示失败原因。
      } finally {
        const ownsOperation = mutationInFlight.current === operation;
        if (ownsOperation) mutationInFlight.current = null;
        if (
          ownsOperation &&
          mounted.current &&
          selection.identity === resourceIdentityRef.current &&
          isCurrentAuthSession(session)
        ) {
          deletionSelection.current = null;
          updateState({ deleteLoading: false, rowToDelete: null, deleteConfirmOpen: false });
        }
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
          aria-label={t('common.edit')}
        >
          <EditIcon />
        </ResponsiveIconButton>,
      );
    }

    // 删除按钮
    if (config.api.delete || config.softDelete) {
      builtInActions.push(
        <ResponsiveIconButton
          key="delete"
          onClick={() => handleOpenDeleteConfirm(row)}
          color="error"
          size="small"
          permissionCodes={deletePerm}
          aria-label={t('common.delete')}
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
    const hasActions =
      config.api.update || config.api.delete || config.softDelete || config.table.actions;

    if (hasActions) {
      return [
        ...rawColumns,
        {
          title: t('table.actions'),
          align: 'center' as const,
          fixed: 'right' as const,
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
      {listFailed ? (
        quietListFailure ? (
          <Button onClick={() => void fetchList(stateRef.current.query)}>
            {t('deleteUndo.reloadList')}
          </Button>
        ) : (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" onClick={() => void fetchList(stateRef.current.query)}>
                {t('common.refresh')}
              </Button>
            }
          >
            {t('deleteUndo.listFailed')}
          </Alert>
        )
      ) : (
        <ResponsiveList
          data={sameResource ? list : []}
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
      )}

      {/* 3. 新增/编辑表单对话框 */}
      <FormDialog<TRecord, TFilters, TApiData, TExtra>
        open={sameResource && formOpen}
        onClose={handleCloseForm}
        editId={editId}
        form={form}
        setForm={setForm}
        formLoading={formLoading}
        schemaLoading={isStringSchema && dynamicSchema.loading}
        usingFallbackSchema={usingFallbackSchema}
        errorContextValue={errorContextValue}
        config={config}
        resolvedSchema={activeDialogSchema}
        extraContext={extraContext}
        onSubmit={handleFormSubmit}
        isMobile={isMobile}
        t={t}
      />

      {/* 4. 删除确认对话框 */}
      <DeleteConfirmDialog
        open={sameResource && deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        content={rowToDelete ? config.softDelete?.confirmationContent(rowToDelete, t) : undefined}
      />
    </PageLayout>
  );
}
