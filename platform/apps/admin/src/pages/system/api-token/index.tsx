import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';
import { SchemaCrudPage } from '@/components/Crud';
import { defaultFilters, filterConfig, type FilterState } from './components/TheFilter';
import { tableConfig, type ApiTokenRes } from './components/TheTable';
import { formConfig } from './components/TheForm';
import * as ApiTokenAPI from '@/api/admin/system/api-token';
import * as PermissionAPI from '@/api/admin/system/permission';
import type { SchemaCrudConfig } from '@/components/Crud';
import { useTranslation } from '@/hooks/useTranslation';
import { showSnackbar } from '@/components/Notification';

export interface ApiTokenExtraContext {
  allPermissions: { code: string; name: string }[];
}

export default function ApiTokenManagement() {
  const t = useTranslation();

  const [allPermissions, setAllPermissions] = useState<{ code: string; name: string }[]>([]);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);

  useEffect(() => {
    PermissionAPI.listAllFn({ data: {} })
      .then((res) => {
        const list = res.data.data || [];
        setAllPermissions(list.map((p: any) => ({ code: p.code, name: p.name || '' })));
      })
      .catch(() => {});
  }, []);

  const extraContext = useMemo<ApiTokenExtraContext>(() => ({ allPermissions }), [allPermissions]);

  const handleCopyToken = useCallback(() => {
    if (!rawToken) return;
    navigator.clipboard
      .writeText(rawToken)
      .then(() => {
        showSnackbar({ message: t('apiToken.copied'), type: 'success' });
      })
      .catch(() => {});
  }, [rawToken, t]);

  const handleTokenDialogClose = useCallback(() => {
    setTokenDialogOpen(false);
    setRawToken(null);
  }, []);

  const config: SchemaCrudConfig<
    ApiTokenRes,
    FilterState,
    Parameters<typeof ApiTokenAPI.listFn>[0]['data'],
    ApiTokenExtraContext,
    Parameters<typeof ApiTokenAPI.addFn>[0]['data'],
    Parameters<typeof ApiTokenAPI.updateFn>[0]['data']
  > = {
    apiKeyName: 'id',
    permissions: {},
    api: {
      list: ApiTokenAPI.listFn,
      add: async (args: any) => {
        const res: any = await ApiTokenAPI.addFn(args);
        const token = res.data?.rawToken;
        if (token) {
          setRawToken(token);
          setTokenDialogOpen(true);
        }
        return res;
      },
      update: ApiTokenAPI.updateFn,
      delete: ApiTokenAPI.deleteFn,
    },
    filter: {
      defaultFilters,
      fields: filterConfig.fields,
      transformRequest: (filters) =>
        ({
          keyword: filters.keyword || undefined,
        }) as Parameters<typeof ApiTokenAPI.listFn>[0]['data'],
    },
    table: {
      columns: tableConfig.columns,
      cardFields: tableConfig.cardFields,
    },
    form: formConfig,
  };

  return (
    <>
      <SchemaCrudPage config={config} extraContext={extraContext} />

      {/* 令牌值一次性展示弹窗 */}
      <Dialog open={tokenDialogOpen} onClose={handleTokenDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t('apiToken.tokenCreated')}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('apiToken.tokenOnceWarning')}
          </Alert>
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            }}
          >
            <Typography sx={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
              {rawToken}
            </Typography>
            <IconButton size="small" onClick={handleCopyToken} color="primary">
              <CopyIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTokenDialogClose} variant="contained">
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
