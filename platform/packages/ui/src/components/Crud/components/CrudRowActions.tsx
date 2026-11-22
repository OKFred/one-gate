import React from 'react';
import { Stack } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { ResponsiveIconButton } from '@/components/Responsive/index';
import type { CrudHelpers, SchemaCrudConfig } from '../types';

interface CrudRowActionsProps<
  TRecord,
  TFilters,
  TApiData,
  TExtra,
  TAddData,
  TUpdateData,
  TKey extends string | number,
> {
  row: TRecord;
  config: SchemaCrudConfig<TRecord, TFilters, TApiData, TExtra, TAddData, TUpdateData, TKey>;
  extraContext?: TExtra;
  helpers: CrudHelpers<TRecord>;
  onOpenEdit: (row: TRecord) => void;
  onOpenDeleteConfirm: (row: TRecord) => void;
  t: (key: string) => string;
}

export function CrudRowActions<
  TRecord,
  TFilters,
  TApiData,
  TExtra = unknown,
  TAddData = Record<string, unknown>,
  TUpdateData = Record<string, unknown>,
  TKey extends string | number = number,
>({
  row,
  config,
  extraContext,
  helpers,
  onOpenEdit,
  onOpenDeleteConfirm,
  t,
}: CrudRowActionsProps<TRecord, TFilters, TApiData, TExtra, TAddData, TUpdateData, TKey>) {
  const editPerm = config.permissions?.edit || [];
  const deletePerm = config.permissions?.delete || [];

  const builtInActions: React.ReactNode[] = [];

  if (config.api.update) {
    builtInActions.push(
      <ResponsiveIconButton
        key="edit"
        onClick={() => onOpenEdit(row)}
        color="primary"
        size="small"
        permissionCodes={editPerm}
        aria-label={t('common.edit')}
      >
        <EditIcon />
      </ResponsiveIconButton>,
    );
  }

  if (config.api.delete || config.softDelete) {
    builtInActions.push(
      <ResponsiveIconButton
        key="delete"
        onClick={() => onOpenDeleteConfirm(row)}
        color="error"
        size="small"
        permissionCodes={deletePerm}
        aria-label={t('common.delete')}
      >
        <DeleteIcon />
      </ResponsiveIconButton>,
    );
  }

  const customActionsConfig = config.table.actions
    ? config.table.actions(t, extraContext, helpers)
    : [];
  const customActions = customActionsConfig
    .filter((act) => !act.visible || act.visible(row))
    .map((act) => (
      <ResponsiveIconButton
        key={act.key}
        onClick={() => act.onClick(row, helpers)}
        color={act.color || 'primary'}
        size="small"
        permissionCodes={act.permissionCodes}
        aria-label={act.label}
        title={act.label}
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
}
