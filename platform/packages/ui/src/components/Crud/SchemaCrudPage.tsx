import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Box, Button, Stack } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

import { PageLayout, ResponsiveButton } from '@/components/Responsive/index';
import ResponsiveList from '@/components/Responsive/ResponsiveList';

import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import {
  captureAuthSession,
  isCurrentAuthSession,
  subscribeAuthChanges,
} from '@/utils/auth';
import { subscribeResourceChanges } from '@/utils/delete-undo';

import type { SchemaCrudConfig, CrudHelpers, QueryState } from './types';
import { CrudRowActions } from './components/CrudRowActions';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { Filter } from './components/Filter';
import { FormDialog } from './components/FormDialog';
import { useCrudDelete } from './hooks/useCrudDelete';
import { useCrudSchemas } from './hooks/useCrudSchemas';

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
  editId: number | string | null;
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
  TKey extends string | number = number,
> {
  config: SchemaCrudConfig<TRecord, TFilters, TApiData, TExtra, TAddData, TUpdateData, TKey>;
  extraContext?: TExtra;
  customActions?: React.ReactNode | ((helpers: CrudHelpers<TRecord>) => React.ReactNode);
  contextParams?: Record<string, unknown>;
  renderDialogs?: (helpers: CrudHelpers<TRecord>) => React.ReactNode;
}

export function SchemaCrudPage<
  TRecord,
  TFilters,
  TApiData,
  TExtra = unknown,
  TAddData = Record<string, unknown>,
  TUpdateData = Record<string, unknown>,
  TKey extends string | number = number,
>({
  config,
  extraContext,
  customActions,
  contextParams,
  renderDialogs,
}: SchemaCrudPageProps<TRecord, TFilters, TApiData, TExtra, TAddData, TUpdateData, TKey>) {
  const t = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const { isMobile } = useResponsive();
  const contextParamsKey = contextParams ? JSON.stringify(contextParams) : '';
  const contextParamsRef = useRef(contextParams);
  contextParamsRef.current = contextParams;
  const extraContextRef = useRef(extraContext);
  extraContextRef.current = extraContext;
  const detailRequestVersion = useRef(0);
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

  const stateRef = useRef(state);
  stateRef.current = state;
  const queryRef = useRef(query);
  queryRef.current = query;

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

  const {
    activeDialogSchema,
    usingFallbackSchema,
    schemaLoading,
    handleFormError,
    clearErrors,
    setFieldErrors,
    errorContextValue,
    validateAdd,
    validateUpdate,
    resolvedSchema,
    resolvedUpdateSchema,
  } = useCrudSchemas({
    schema: config.form.schema,
    updateSchema: config.form.updateSchema,
    hasRenderForm: Boolean(config.form.renderForm),
    editId,
  });

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
        const ctxParams = contextParamsRef.current || {};
        let dataPayload = {
          pageNo: currentQuery.page,
          pageSize: currentQuery.pageSize,
          ...ctxParams,
          ...currentQuery.filters,
        } as unknown as TApiData;

        if (cfg.filter.transformRequest) {
          dataPayload = {
            ...ctxParams,
            ...cfg.filter.transformRequest(currentQuery.filters),
          } as TApiData;
          (dataPayload as unknown as { pageNo: number }).pageNo = currentQuery.page;
          (dataPayload as unknown as { pageSize: number }).pageSize = currentQuery.pageSize;
        }

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

  const {
    resetDeleteState,
    handleOpenDeleteConfirm,
    handleCloseDeleteConfirm,
    handleConfirmDelete,
  } = useCrudDelete({
    configRef,
    resourceIdentityRef,
    mountedRef: mounted,
    queryRef,
    updateDeleteUiState: updateState,
    fetchList,
    t,
  });

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
    resetDeleteState();
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
  }, [resourceIdentity, clearErrors, updateState, resetDeleteState]);

  useEffect(() => {
    const cfg = configRef.current;
    const newQuery = {
      page: 1,
      pageSize: query.pageSize,
      filters: cfg.filter.defaultFilters,
    };

    const filterFieldsNow = cfg.filter.fields(tRef.current, extraContextRef.current);
    const kwField = filterFieldsNow.find((f) => f.isKeyword || f.name === 'keyword');
    const kwName = (kwField?.name as string | undefined) || 'keyword';
    const defaultFiltersRec = cfg.filter.defaultFilters as Record<string, unknown>;
    const initialKeyword =
      kwName in defaultFiltersRec && typeof defaultFiltersRec[kwName] === 'string'
        ? (defaultFiltersRec[kwName] as string)
        : '';

    updateState({
      query: newQuery,
      cursorMap: {},
      keywordInput: initialKeyword,
    });

    fetchList(newQuery);
  }, [resourceIdentity, contextParamsKey, query.pageSize, fetchList, updateState]);

  const filterFieldsSnapshot = config.filter.fields(t, extraContext);
  const keywordFieldMeta = filterFieldsSnapshot.find((f) => f.isKeyword || f.name === 'keyword');
  const keywordFieldName = (keywordFieldMeta?.name as string | undefined) || 'keyword';
  const keywordDebounceMs = keywordFieldMeta?.debounceMs ?? 500;

  useEffect(() => {
    const filtersRecord = query.filters as unknown as Record<string, unknown>;
    if (keywordFieldName in filtersRecord) {
      const currentKeyword = (filtersRecord[keywordFieldName] as string) ?? '';
      if (keywordInput !== currentKeyword) {
        updateState({ isSearching: true });
        const timer = setTimeout(() => {
          const newQuery = {
            ...query,
            page: 1,
            filters: { ...query.filters, [keywordFieldName]: keywordInput },
          };
          updateState({ query: newQuery, cursorMap: {} });
          fetchList(newQuery);
        }, keywordDebounceMs);

        return () => clearTimeout(timer);
      }
    }
  }, [keywordInput, keywordFieldName, keywordDebounceMs, query, fetchList, updateState]);

  const handleFilterChange = (
    key: keyof TFilters,
    value: boolean | string | number | undefined,
  ) => {
    if (key === keywordFieldName || key === 'keyword') {
      updateState({ keywordInput: (value as string) ?? '' });
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
      if (key === keywordFieldName || key === 'keyword') return !!keywordInput;
      return currentRecord[key] !== defaultRecord[key];
    });
  };

  const handleOpenAdd = () => {
    detailRequestVersion.current += 1;
    let initialForm = {
      ...configRef.current.form.defaultForm,
      ...(contextParamsRef.current || {}),
    } as Partial<TRecord>;
    if (configRef.current.form.afterOpen) {
      initialForm = configRef.current.form.afterOpen(
        initialForm,
        false,
        undefined,
        extraContextRef.current,
      );
    }
    clearErrors();
    updateState({ editId: null, form: initialForm, formOpen: true, formLoading: false });
  };

  const handleOpenEdit = async (row: TRecord) => {
    const cfg = configRef.current;
    const idKey = (cfg.apiKeyName || 'id') as keyof TRecord;
    const recordId = row[idKey] as unknown as number | string;
    const reqVersion = ++detailRequestVersion.current;
    clearErrors();

    const applyRow = (targetRow: TRecord) => {
      let initialForm = { ...targetRow } as Partial<TRecord>;
      if (cfg.form.afterOpen) {
        initialForm = cfg.form.afterOpen(initialForm, true, targetRow, extraContextRef.current);
      }
      updateState({ editId: recordId, form: initialForm, formOpen: true, formLoading: false });
    };

    if (cfg.api.detail?.loadOnEdit && cfg.api.detail.fn) {
      updateState({ editId: recordId, form: { ...row }, formOpen: true, formLoading: true });
      try {
        const payloadKey = cfg.api.detail.payloadKey || (idKey as string);
        const res = await cfg.api.detail.fn({ data: { [payloadKey]: recordId } });
        if (!mounted.current || reqVersion !== detailRequestVersion.current) return;
        const detailData = res.data?.data;
        const mergedRow = detailData ? ({ ...row, ...detailData } as TRecord) : row;
        applyRow(mergedRow);
      } catch {
        if (!mounted.current || reqVersion !== detailRequestVersion.current) return;
        updateState({ formLoading: false });
      }
      return;
    }

    applyRow(row);
  };

  const handleCloseForm = () => {
    detailRequestVersion.current += 1;
    clearErrors();
    updateState({
      editId: null,
      form: configRef.current.form.defaultForm,
      formOpen: false,
      formLoading: false,
    });
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

    const isEdit = editId !== null && editId !== undefined;
    const activeSchema = isEdit ? resolvedUpdateSchema || resolvedSchema : resolvedSchema;
    const validate = isEdit ? validateUpdate : validateAdd;

    if (!cfg.form.validateAfterTransform) {
      const clientErrors = validate(form);
      if (Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors);
        return;
      }
    }

    updateState({ formLoading: true });
    try {
      let submitForm = { ...form };
      if (cfg.form.beforeSubmit) {
        submitForm = await cfg.form.beforeSubmit(submitForm, isEdit, extraContextRef.current);
      }

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

      const idKey = (cfg.apiKeyName || 'id') as keyof TRecord;
      const finalPayload = isEdit
        ? { ...(contextParamsRef.current || {}), ...submitForm, [idKey]: editId }
        : { ...(contextParamsRef.current || {}), ...submitForm };

      if (cfg.form.validateAfterTransform) {
        const clientErrors = validate(finalPayload);
        if (Object.keys(clientErrors).length > 0) {
          setFieldErrors(clientErrors);
          return;
        }
      }

      if (isEdit) {
        if (cfg.api.update) {
          await cfg.api.update({
            data: finalPayload as never,
          });
        }
      } else {
        if (cfg.api.add) {
          const addRes = await cfg.api.add({
            data: finalPayload as never,
          });
          if (cfg.form.afterAdd && acceptsSubmit()) {
            await cfg.form.afterAdd(addRes, finalPayload as Partial<TRecord>, helpersRef.current);
          }
        }
      }

      if (!acceptsSubmit()) return;
      handleCloseForm();
      const latestQuery = stateRef.current.query;
      if (isEdit) {
        fetchList(latestQuery);
      } else {
        const newQuery = { ...latestQuery, page: 1 };
        updateState({ query: newQuery });
        fetchList(newQuery);
      }
    } catch (err: unknown) {
      if (acceptsSubmit()) handleFormError(err);
    } finally {
      if (acceptsSubmit()) updateState({ formLoading: false });
    }
  };

  const helpers: CrudHelpers<TRecord> = {
    openEdit: handleOpenEdit,
    deleteRow: async (row) => handleOpenDeleteConfirm(row),
    refreshTable: () => fetchList(stateRef.current.query),
  };
  const helpersRef = useRef(helpers);
  helpersRef.current = helpers;

  const renderRowActions = (row: TRecord) => (
    <CrudRowActions
      row={row}
      config={config}
      extraContext={extraContext}
      helpers={helpers}
      onOpenEdit={handleOpenEdit}
      onOpenDeleteConfirm={handleOpenDeleteConfirm}
      t={t}
    />
  );

  const columns = (() => {
    const rawColumns = config.table.columns(t, extraContext, helpers);
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
  const resolvedCustomActions =
    typeof customActions === 'function' ? customActions(helpers) : customActions;

  const toolbarContent =
    resolvedCustomActions || config.api.add ? (
      <Stack direction="row" spacing={1}>
        {resolvedCustomActions}
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
    ) : undefined;

  const bodyContent = (
    <>
      {config.embedded && toolbarContent && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>{toolbarContent}</Box>
      )}
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

      <FormDialog<TRecord, TFilters, TApiData, TExtra, TKey>
        open={sameResource && formOpen}
        onClose={handleCloseForm}
        editId={editId}
        form={form}
        setForm={setForm}
        formLoading={formLoading}
        schemaLoading={schemaLoading}
        usingFallbackSchema={usingFallbackSchema}
        errorContextValue={errorContextValue}
        config={config}
        resolvedSchema={activeDialogSchema}
        extraContext={extraContext}
        onSubmit={handleFormSubmit}
        isMobile={isMobile}
        t={t}
      />

      <DeleteConfirmDialog
        open={sameResource && deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        content={rowToDelete ? config.softDelete?.confirmationContent(rowToDelete, t) : undefined}
      />

      {renderDialogs?.(helpers)}
    </>
  );

  if (config.embedded) {
    return bodyContent;
  }

  return <PageLayout actions={toolbarContent}>{bodyContent}</PageLayout>;
}
