import { type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from '@/hooks/useTranslation';
import type { PageData, TenantRow } from './sharedHooks';

export function QueryStatus({
  loading,
  failed,
  refresh,
}: {
  loading: boolean;
  failed: boolean;
  refresh: () => Promise<unknown>;
}) {
  const t = useTranslation();
  if (loading)
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress aria-label={t('common.loading')} size={28} />
      </Box>
    );
  if (failed)
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={() => void refresh()}>
            {t('common.refresh')}
          </Button>
        }
      >
        {t('assetManagement.loadFailed')}
      </Alert>
    );
  return null;
}

export function DataTable<T extends { id: number }>({
  rows,
  columns,
  actions,
  page,
  onPage,
  label,
}: {
  rows: T[];
  columns: { key: string; label: string; render: (row: T) => ReactNode }[];
  actions?: (row: T) => ReactNode;
  page?: PageData<T> | null;
  onPage?: (page: number) => void;
  label: string;
}) {
  const t = useTranslation();
  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small" aria-label={label}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.key}>{column.label}</TableCell>
              ))}
              {actions && <TableCell>{t('table.actions')}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((column) => (
                  <TableCell key={column.key}>{column.render(row)}</TableCell>
                ))}
                {actions && (
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      {actions(row)}
                    </Stack>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    {t('column.noData')}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {page && onPage && (
        <TablePagination
          component="div"
          count={page.total}
          rowsPerPage={page.pageSize}
          page={Math.max(0, page.currentPage - 1)}
          onPageChange={(_, next) => onPage(next + 1)}
          rowsPerPageOptions={[]}
        />
      )}
    </Paper>
  );
}

export function TenantChooser({
  tenants,
  value,
  onChange,
}: {
  tenants: TenantRow[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  const t = useTranslation();
  return (
    <TextField
      select
      label={t('assetManagement.enterprise')}
      value={value ?? ''}
      onChange={(event) => onChange(Number(event.target.value))}
      sx={{ minWidth: 260 }}
    >
      {tenants.map((tenant) => (
        <MenuItem key={tenant.id} value={tenant.id}>
          {tenant.name} · {tenant.key}
          {tenant.frozen ? ` (${t('tenantManagement.frozen')})` : ''}
        </MenuItem>
      ))}
    </TextField>
  );
}
