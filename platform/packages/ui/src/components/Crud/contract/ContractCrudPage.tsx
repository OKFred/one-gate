import { useMemo, useRef, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { resolveResourceMeta } from '@hodor/contracts';
import {
  compileFrontendValidationSchema,
  projectCardFields,
  projectFilterConfig,
  projectFormConfig,
  projectTableColumns,
} from '@hodor/contracts/frontend';
import type {
  CrudActionSpec,
  CrudResourceContract,
  ValueTransformType,
} from '@hodor/contracts/types';
import { postCrudEndpoint } from '@/api/crud';
import { showConfirm, showSnackbar } from '@/components/Notification';
import { usePermission } from '@/hooks/usePermission';
import { useTranslation } from '@/hooks/useTranslation';
import { SchemaCrudPage } from '../SchemaCrudPage';
import type { CrudHelpers, FilterFieldConfig, RowAction, SchemaCrudConfig } from '../types';
import { buildContractCardFields, buildContractTableColumns } from './cellRenderers';
import { ContractDetailDialog } from './ContractDetailDialog';
import { ContractFormRenderer } from './ContractFormRenderer';
import { renderContractIcon } from './iconRegistry';
import type { CrudExtensions } from './types';
import { encodeBase64Utf8, evaluateCondition, getValueByPath, resolvePayloadMap } from './utils';

export interface ContractCrudPageProps<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
> {
  contract: CrudResourceContract;
  extensions?: CrudExtensions<TRecord>;
  contextParams?: Record<string, unknown>;
  embedded?: boolean;
}

function applySingleTransform(val: unknown, transform: ValueTransformType): unknown {
  switch (transform) {
    case 'trim':
      return typeof val === 'string' ? val.trim() : val;
    case 'uppercase':
      return typeof val === 'string' ? val.toUpperCase() : val;
    case 'emptyToNull':
      return typeof val === 'string' && val.trim() === '' ? null : val;
    case 'emptyToUndefined':
      return typeof val === 'string' && val.trim() === '' ? undefined : val;
    case 'base64':
      return typeof val === 'string' && val.length > 0 ? encodeBase64Utf8(val) : val;
    case 'number':
      if (val === '' || val === null || val === undefined) return undefined;
      return Number(val);
    case 'jsonStringArray':
    case 'epochMs':
    default:
      return val;
  }
}

export function ContractCrudPage<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
>({ contract, extensions, contextParams, embedded }: ContractCrudPageProps<TRecord>) {
  const t = useTranslation();
  const permissionState = usePermission();
  const permissionRef = useRef(permissionState);
  permissionRef.current = permissionState;

  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null);

  const meta = useMemo(() => resolveResourceMeta(contract), [contract]);
  const projectedColumns = useMemo(() => projectTableColumns(contract), [contract]);
  const projectedCards = useMemo(() => projectCardFields(contract), [contract]);
  const projectedFilter = useMemo(() => projectFilterConfig(contract), [contract]);
  const projectedForm = useMemo(() => projectFormConfig(contract), [contract]);

  const addSchema = useMemo(() => compileFrontendValidationSchema(contract, 'add'), [contract]);
  const updateSchema = useMemo(
    () => compileFrontendValidationSchema(contract, 'update'),
    [contract],
  );

  const idKey = meta.apiKeyName;
  const fixedParams = contract.api?.fixedParams;

  const listFn =
    extensions?.listAdapter ??
    (async (args: { data: Record<string, unknown>; errorPresentation?: 'global' | 'local' }) => {
      return await postCrudEndpoint<{
        list?: TRecord[];
        total?: number;
        hasMore?: boolean;
        cursor?: string;
      }>(meta.endpoints.list, {
        data: { ...(fixedParams ?? {}), ...args.data },
        errorPresentation: args.errorPresentation,
      });
    });

  const addFn =
    !contract.readonly && meta.operations.add && meta.endpoints.add
      ? (extensions?.mutationAdapter?.add ??
        ((args: { data: Record<string, unknown> }) =>
          postCrudEndpoint(meta.endpoints.add!, {
            data: args.data,
          })))
      : undefined;

  const updateFn =
    !contract.readonly && meta.operations.update && meta.endpoints.update
      ? (extensions?.mutationAdapter?.update ??
        ((args: { data: Record<string, unknown> }) =>
          postCrudEndpoint(meta.endpoints.update!, {
            data: args.data,
          })))
      : undefined;

  const deleteFn =
    !contract.readonly && meta.operations.delete && meta.endpoints.delete
      ? (extensions?.mutationAdapter?.delete ??
        ((args: { data: { id: number | string } }) => {
          const payload = idKey === 'id' ? { id: args.data.id } : { [idKey]: args.data.id };
          return postCrudEndpoint(meta.endpoints.delete!, { data: payload });
        }))
      : undefined;

  const detailConfig =
    meta.endpoints.detail && contract.api?.loadDetailOnEdit
      ? {
          loadOnEdit: true,
          payloadKey: idKey,
          fn: (args: { data: Record<string, unknown>; errorPresentation?: 'global' | 'local' }) =>
            postCrudEndpoint<Partial<TRecord>>(meta.endpoints.detail!, {
              data: args.data,
              errorPresentation: args.errorPresentation,
            }),
        }
      : undefined;

  const softDeleteConfig: SchemaCrudConfig<
    TRecord,
    Record<string, unknown>,
    Record<string, unknown>,
    unknown,
    Record<string, unknown>,
    Record<string, unknown>,
    number | string
  >['softDelete'] =
    !contract.readonly && contract.softDelete
      ? (() => {
          const sd = contract.softDelete;
          const deletePath =
            sd.deletePath ?? meta.endpoints.deleteWithUndo ?? `${meta.basePath}/deleteWithUndo`;
          const getPath = sd.getPath ?? meta.endpoints.get ?? `${meta.basePath}/get`;
          const expectedTimeField = sd.expectedUpdateTimeField ?? 'updateTimeUtc';
          const recyclePerms = sd.recycleBinPermissions ?? [];
          const verifyReadPerms = sd.verifyReadPermissions ?? meta.permissions.read;

          return {
            resourceType: sd.resourceType,
            displayName: (row) => String(getValueByPath(row, sd.displayNameField) ?? ''),
            expectedUpdateTimeUtc: (row) =>
              (getValueByPath(row, expectedTimeField) as number | null | undefined) ?? null,
            confirmationContent: (_row, translate) => translate(sd.confirmMessageKey),
            delete: ({ data, errorPresentation }) =>
              postCrudEndpoint(deletePath, {
                data: data as unknown as Record<string, unknown>,
                errorPresentation,
              }),
            canOpenRecycleBin: () =>
              recyclePerms.length === 0 ||
              permissionRef.current.hasAllPermissions([...recyclePerms]),
            verifyCurrent: getPath
              ? async (row) => {
                  if (
                    verifyReadPerms.length > 0 &&
                    !permissionRef.current.hasAllPermissions([...verifyReadPerms])
                  ) {
                    return null;
                  }
                  try {
                    const idVal = row[idKey as keyof TRecord];
                    const res = await postCrudEndpoint<Record<string, unknown>>(getPath, {
                      data: { [idKey]: idVal },
                      errorPresentation: 'local',
                    });
                    return res.data?.ok === true && res.data.data?.[idKey] === idVal ? true : null;
                  } catch {
                    return null;
                  }
                }
              : undefined,
            retryableErrorCodes: sd.retryableErrorCodes,
            stateChangedErrorCodes: sd.stateChangedErrorCodes,
          };
        })()
      : undefined;

  const handleApiAction = async (
    act: CrudActionSpec,
    row: TRecord,
    helpers: CrudHelpers<TRecord>,
  ) => {
    if (!act.url) return;
    if (act.confirmMessageKey) {
      const confirmed = await showConfirm({
        message: t(act.confirmMessageKey),
        type: 'warning',
      });
      if (!confirmed) return;
    }

    const rowKey = `${act.key}:${String(row[idKey as keyof TRecord])}`;
    setActionLoadingKey(rowKey);
    try {
      const payload = resolvePayloadMap(act.payloadMap, row);
      const res = await postCrudEndpoint<unknown>(act.url, { data: payload });
      const passed =
        act.successCheck === 'truthyData' ? Boolean(res.data?.data) : res.data?.ok !== false;

      if (passed) {
        if (act.successMessageKey) {
          showSnackbar({ message: t(act.successMessageKey), type: 'success' });
        }
        if (act.refreshAfter) {
          helpers.refreshTable();
        }
      } else if (act.errorMessageKey) {
        showSnackbar({ message: t(act.errorMessageKey), type: 'error' });
      }
    } catch {
      // 全局 HTTP 拦截器统一展示错误
    } finally {
      setActionLoadingKey(null);
    }
  };

  const buildRowActions = (
    translate: (key: string) => string,
    _extra?: unknown,
    helpers?: CrudHelpers<TRecord>,
  ): RowAction<TRecord>[] => {
    const builtIn: RowAction<TRecord>[] = (contract.actions ?? []).map((act) => ({
      key: act.key,
      label: act.labelKey ? translate(act.labelKey) : undefined,
      color: act.color ?? 'primary',
      permissionCodes: act.permissionCodes ? [...act.permissionCodes] : undefined,
      visible: act.visibleWhen ? (row) => evaluateCondition(act.visibleWhen, row, true) : undefined,
      disabled: (row) => {
        const loading = actionLoadingKey === `${act.key}:${String(row[idKey as keyof TRecord])}`;
        if (loading) return true;
        return act.disabledWhen ? evaluateCondition(act.disabledWhen, row, true) : false;
      },
      icon: (row) => {
        const loading = actionLoadingKey === `${act.key}:${String(row[idKey as keyof TRecord])}`;
        return loading ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          renderContractIcon(act.icon)
        );
      },
      onClick: async (row, rowHelpers) => {
        if (act.type === 'detail') {
          setDetailRow(row);
        } else {
          await handleApiAction(act, row, rowHelpers);
        }
      },
    }));

    const extra = extensions?.rowActions ? extensions.rowActions(translate, helpers) : [];
    return [...builtIn, ...extra];
  };

  const hasAnyRowActions =
    (contract.actions && contract.actions.length > 0) || Boolean(extensions?.rowActions);

  const config: SchemaCrudConfig<
    TRecord,
    Record<string, unknown>,
    Record<string, unknown>,
    unknown,
    Record<string, unknown>,
    Record<string, unknown>,
    number | string
  > = {
    embedded: embedded ?? contract.embedded,
    refreshIntervalMs: contract.refreshIntervalMs,
    cursorPagination: contract.pagination?.mode === 'cursor',
    resourceKey: meta.resourceKey,
    apiKeyName: idKey as keyof TRecord,
    softDelete: softDeleteConfig,
    permissions: {
      add: [...meta.permissions.add],
      edit: [...meta.permissions.edit],
      delete: [...meta.permissions.delete],
    },
    api: {
      list: listFn,
      ...(detailConfig ? { detail: detailConfig } : {}),
      ...(addFn ? { add: addFn } : {}),
      ...(updateFn ? { update: updateFn } : {}),
      ...(deleteFn ? { delete: deleteFn } : {}),
    },
    filter: {
      defaultFilters: projectedFilter.defaultFilters,
      fields: (translate) =>
        projectedFilter.fields.map((f): FilterFieldConfig<Record<string, unknown>> => ({
          name: f.name,
          type: f.type,
          label: f.labelKey ? translate(f.labelKey) : f.name,
          placeholder: f.placeholderKey ? translate(f.placeholderKey) : undefined,
          isKeyword: f.isKeyword,
          debounceMs: f.isKeyword ? projectedFilter.keywordDebounceMs : undefined,
          searchIcon: f.isKeyword ? projectedFilter.keywordSearchIcon : undefined,
          options: f.options
            ? [
                ...(f.includeAllOption
                  ? [{ label: translate('filter.all'), value: undefined }]
                  : []),
                ...f.options.map((opt) => ({
                  label: opt.labelKey ? translate(opt.labelKey) : (opt.label ?? String(opt.value)),
                  value: opt.value === null ? undefined : opt.value,
                })),
              ]
            : undefined,
        })),
      transformRequest: (filters) => {
        const transformed: Record<string, unknown> = { ...(fixedParams ?? {}) };
        for (const [key, rawVal] of Object.entries(filters)) {
          const spec = projectedFilter.fields.find((f) => f.name === key);
          if (!spec?.transform) {
            transformed[key] = rawVal === '' ? undefined : rawVal;
            continue;
          }
          if (spec.transform === 'trim') {
            const s = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
            transformed[key] = s === '' ? undefined : s;
          } else if (spec.transform === 'emptyToUndefined') {
            transformed[key] = rawVal === '' ? undefined : rawVal;
          } else if (spec.transform === 'number') {
            const str = String(rawVal ?? '').trim();
            transformed[key] = str && Number.isFinite(Number(str)) ? Number(str) : undefined;
          } else if (spec.transform === 'boolean') {
            transformed[key] = rawVal === undefined ? undefined : Boolean(rawVal);
          }
        }
        return transformed;
      },
    },
    table: {
      columns: (translate, _extra, helpers) =>
        buildContractTableColumns(projectedColumns, translate, extensions, helpers),
      cardFields: (translate) => buildContractCardFields(projectedCards, translate, extensions),
      ...(hasAnyRowActions ? { actions: buildRowActions } : {}),
    },
    form: {
      schema: addSchema,
      updateSchema,
      defaultForm: projectedForm.defaultForm as Partial<TRecord>,
      validateAfterTransform: true,
      afterOpen: (form, isEdit, row) => {
        let next = { ...form } as Record<string, unknown>;
        for (const f of projectedForm.fields) {
          if (!isEdit && f.ui.jsonStringArrayOptions?.defaultOnAdd) {
            const current = next[f.name];
            if (!current || current === '') {
              next[f.name] = JSON.stringify(f.ui.jsonStringArrayOptions.defaultOnAdd);
            }
          }
        }
        if (extensions?.afterOpen) {
          next = extensions.afterOpen(next as Partial<TRecord>, isEdit, row) as Record<
            string,
            unknown
          >;
        }
        return next as Partial<TRecord>;
      },
      beforeSubmit: async (form, isEdit) => {
        let next = { ...form } as Record<string, unknown>;
        for (const f of projectedForm.fields) {
          const transforms = f.ui.valueTransform
            ? Array.isArray(f.ui.valueTransform)
              ? f.ui.valueTransform
              : [f.ui.valueTransform]
            : [];
          for (const tr of transforms) {
            next[f.name] = applySingleTransform(next[f.name], tr);
          }
          if (f.ui.jsonStringArrayOptions?.nullUnless) {
            if (!evaluateCondition(f.ui.jsonStringArrayOptions.nullUnless, next, isEdit)) {
              next[f.name] = null;
            }
          }
        }
        if (extensions?.beforeSubmitAsync) {
          next = (await extensions.beforeSubmitAsync(next as Partial<TRecord>, isEdit)) as Record<
            string,
            unknown
          >;
        }
        return next as Partial<TRecord>;
      },
      afterAdd: extensions?.afterAdd,
      renderForm: (form, setForm, isMobile, translate, _extraContext, isEdit) => (
        <ContractFormRenderer
          contract={contract}
          fields={projectedForm.fields}
          form={form}
          setForm={setForm}
          isEdit={Boolean(isEdit)}
          isMobile={isMobile}
          disabled={false}
          t={translate}
          extensions={extensions}
        />
      ),
    },
  };

  return (
    <>
      <SchemaCrudPage
        config={config}
        contextParams={contextParams}
        renderDialogs={extensions?.dialogs}
        customActions={
          extensions?.toolbarActions
            ? (helpers) =>
                typeof extensions.toolbarActions === 'function'
                  ? extensions.toolbarActions(helpers, t)
                  : extensions.toolbarActions
            : undefined
        }
      />

      {contract.detailDialog && (
        <ContractDetailDialog
          open={detailRow !== null}
          onClose={() => setDetailRow(null)}
          spec={contract.detailDialog}
          row={detailRow}
        />
      )}
    </>
  );
}
