import React, { useState, forwardRef, useImperativeHandle, memo } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  useTheme,
  IconButton,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import * as CacheAPI from '@/api/maintenance/cache';
import type { PutCacheReq, GetCacheRes } from '@/api/maintenance/type';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface CacheFormRef {
  /** 打开表单（添加或查看/编辑） */
  onOpen: (namespace: string, key?: string) => void;
}

interface FormState {
  namespace: string;
  key: string;
  value: string;
  expirationTtl: number | null;
}

const DEFAULT_FORM: FormState = {
  namespace: '',
  key: '',
  value: '',
  expirationTtl: null,
};

const TheForm = memo(
  forwardRef<CacheFormRef, Props>(function TheForm({ localObj }, ref) {
    const t = useTranslation();
    const { tableRef } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [loading, setLoading] = useState(false);
    const [loadingValue, setLoadingValue] = useState(false);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        onOpen: async (namespace: string, key?: string) => {
          setForm((prev) => ({ ...prev, namespace, key: key || '' }));
          setIsEditMode(!!key);

          if (key) {
            // 编辑模式：加载现有值
            setLoadingValue(true);
            setOpen(true);
            try {
              const res = await CacheAPI.getFn({ data: { namespace, key, type: 'text' } });
              const data = res.data.data as GetCacheRes;
              setForm((prev) => ({
                ...prev,
                value: typeof data.value === 'string' ? data.value : JSON.stringify(data.value),
              }));
            } catch (error) {
              console.warn(error);
              setForm((prev) => ({ ...prev, value: '' }));
            } finally {
              setLoadingValue(false);
            }
          } else {
            // 添加模式
            setForm((prev) => ({ ...prev, value: '', expirationTtl: null }));
            setOpen(true);
          }
        },
      }),
      [],
    );

    const handleCancel = () => {
      setOpen(false);
      setForm(DEFAULT_FORM);
      setIsEditMode(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        const requestData: PutCacheReq = {
          namespace: form.namespace,
          key: form.key,
          value: form.value,
          ...(form.expirationTtl && { expirationTtl: form.expirationTtl }),
        };

        await CacheAPI.putFn({ data: requestData });
        handleCancel();
        // 刷新表格数据
        tableRef.current?.refresh();
      } catch (error) {
        console.warn(error);
      } finally {
        setLoading(false);
      }
    };

    const handleChange = (field: keyof FormState, value: string | number | null) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
      <Dialog
        open={open}
        onClose={handleCancel}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          }}
        >
          <Typography component="span">
            {isEditMode ? t('cache.form.editTitle') : t('cache.form.addTitle')}
          </Typography>
          <IconButton onClick={handleCancel} sx={{ color: 'inherit' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Stack spacing={3}>
              <TextField
                label={t('cache.form.namespace')}
                value={form.namespace}
                disabled={isEditMode}
                onChange={(e) => handleChange('namespace', e.target.value)}
                fullWidth
                required
              />

              <TextField
                label={t('cache.form.key')}
                value={form.key}
                onChange={(e) => handleChange('key', e.target.value)}
                disabled={isEditMode}
                fullWidth
                required
                placeholder={t('cache.form.keyPlaceholder')}
              />

              <TextField
                label={t('cache.form.value')}
                value={form.value}
                onChange={(e) => handleChange('value', e.target.value)}
                fullWidth
                required
                multiline
                rows={6}
                placeholder={t('cache.form.valuePlaceholder')}
                disabled={loadingValue}
                helperText={loadingValue ? t('common.loading') : t('cache.form.valueHelp')}
              />

              <TextField
                label={t('cache.form.ttl')}
                value={form.expirationTtl ?? ''}
                onChange={(e) =>
                  handleChange('expirationTtl', e.target.value ? Number(e.target.value) : null)
                }
                fullWidth
                type="number"
                placeholder={t('cache.form.ttlPlaceholder')}
                helperText={t('cache.form.ttlHelp')}
              />
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={handleCancel} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={loading || loadingValue}>
              {loading ? t('common.submitting') : t('common.submit')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    );
  }),
);

TheForm.displayName = 'TheForm';
export default TheForm;
