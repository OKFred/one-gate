import { useCallback, useRef, type MutableRefObject } from 'react';
import { classifyApiFailure } from '@/api/config';
import { showSnackbar } from '@/components/Notification';
import {
  captureAuthSession,
  isCurrentAuthSession,
  type AuthSessionSnapshot,
} from '@/utils/auth';
import { captureUndoRequestTime, publishResourceChange, showDeleteUndo } from '@/utils/delete-undo';
import type { QueryState, SchemaCrudConfig } from '../types';

interface DeletionSelection<
  TRecord,
  TFilters,
  TApiData,
  TExtra,
  TAddData,
  TUpdateData,
  TKey extends string | number,
> {
  identity: string;
  row: TRecord;
  id: TKey;
  session: AuthSessionSnapshot;
  softDelete: SchemaCrudConfig<
    TRecord,
    TFilters,
    TApiData,
    TExtra,
    TAddData,
    TUpdateData,
    TKey
  >['softDelete'];
  delete: SchemaCrudConfig<
    TRecord,
    TFilters,
    TApiData,
    TExtra,
    TAddData,
    TUpdateData,
    TKey
  >['api']['delete'];
}

interface UseCrudDeleteParams<
  TRecord,
  TFilters,
  TApiData,
  TExtra,
  TAddData,
  TUpdateData,
  TKey extends string | number,
> {
  configRef: MutableRefObject<
    SchemaCrudConfig<TRecord, TFilters, TApiData, TExtra, TAddData, TUpdateData, TKey>
  >;
  resourceIdentityRef: MutableRefObject<string>;
  mountedRef: MutableRefObject<boolean>;
  queryRef: MutableRefObject<QueryState<TFilters>>;
  updateDeleteUiState: (updates: {
    deleteConfirmOpen?: boolean;
    rowToDelete?: TRecord | null;
    deleteLoading?: boolean;
    query?: QueryState<TFilters>;
  }) => void;
  fetchList: (currentQuery: QueryState<TFilters>, silent?: boolean) => Promise<boolean>;
  t: (key: string) => string;
}

/** 管理行删除确认状态、乐观并发锁与软删除 15 秒撤销提示流。 */
export function useCrudDelete<
  TRecord,
  TFilters,
  TApiData,
  TExtra = unknown,
  TAddData = Record<string, unknown>,
  TUpdateData = Record<string, unknown>,
  TKey extends string | number = number,
>({
  configRef,
  resourceIdentityRef,
  mountedRef,
  queryRef,
  updateDeleteUiState,
  fetchList,
  t,
}: UseCrudDeleteParams<TRecord, TFilters, TApiData, TExtra, TAddData, TUpdateData, TKey>) {
  const mutationInFlight = useRef<symbol | null>(null);
  const deletionSelection = useRef<DeletionSelection<
    TRecord,
    TFilters,
    TApiData,
    TExtra,
    TAddData,
    TUpdateData,
    TKey
  > | null>(null);

  const resetDeleteState = useCallback(() => {
    mutationInFlight.current = null;
    deletionSelection.current = null;
  }, []);

  const handleOpenDeleteConfirm = (row: TRecord) => {
    const cfg = configRef.current;
    const idKey = (cfg.apiKeyName || 'id') as keyof TRecord;
    deletionSelection.current = {
      identity: resourceIdentityRef.current,
      row,
      id: row[idKey] as unknown as TKey,
      session: captureAuthSession(),
      softDelete: cfg.softDelete,
      delete: cfg.api.delete,
    };
    updateDeleteUiState({ rowToDelete: row, deleteConfirmOpen: true });
  };

  const handleCloseDeleteConfirm = () => {
    if (mutationInFlight.current) return;
    deletionSelection.current = null;
    updateDeleteUiState({ rowToDelete: null, deleteConfirmOpen: false });
  };

  const handleConfirmDelete = async () => {
    if (mutationInFlight.current) return;
    const selection = deletionSelection.current;
    if (
      !selection ||
      selection.identity !== resourceIdentityRef.current ||
      !isCurrentAuthSession(selection.session)
    ) {
      return;
    }

    if (!selection.delete && !selection.softDelete) return;

    const operation = Symbol('crud-delete');
    mutationInFlight.current = operation;
    updateDeleteUiState({ deleteLoading: true });
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
        if (result.ok || result.failure.kind === 'unknown') {
          void publishResourceChange(softDelete.resourceType, 'page');
        }
        return;
      }

      await selection.delete?.({ data: { id: recordId } });
      if (!isCurrentAuthSession(session)) return;
      showSnackbar({ message: t('common.deleteSuccess'), type: 'success' });
      if (selection.identity === resourceIdentityRef.current) {
        const newQuery = { ...queryRef.current, page: 1 };
        updateDeleteUiState({ query: newQuery });
        await fetchList(newQuery);
      }
    } catch {
      // 全局 HTTP 拦截器已统一展示失败原因。
    } finally {
      const ownsOperation = mutationInFlight.current === operation;
      if (ownsOperation) mutationInFlight.current = null;
      if (
        ownsOperation &&
        mountedRef.current &&
        selection.identity === resourceIdentityRef.current &&
        isCurrentAuthSession(session)
      ) {
        deletionSelection.current = null;
        updateDeleteUiState({ deleteLoading: false, rowToDelete: null, deleteConfirmOpen: false });
      }
    }
  };

  return {
    resetDeleteState,
    handleOpenDeleteConfirm,
    handleCloseDeleteConfirm,
    handleConfirmDelete,
  };
}
