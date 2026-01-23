import React, { useState, forwardRef, useImperativeHandle, memo, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Box,
  useTheme,
  IconButton,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import * as TranslationAPI from '@/api/i18n/translation';
import type { AddTranslationReq, CheckDuplicateTranslationRes } from '@/api/i18n/type';
import type { Props } from '../index';
import type { TableState } from './TheTable';
import { useResponsive } from '@/hooks/useResponsive';
import hasValue from '@/utils/hasValue';
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface TheFormRef {
  /** 打开新增表单 */
  openAdd: () => void;
  /** 打开编辑表单 */
  openEdit: (row: TableState['list'][0]) => void;
  /** 关闭表单 */
  close: () => void;
}

const DEFAULT_FORM: AddTranslationReq = {
  application: '',
  business: '',
  langCode: '',
  tKey: '',
  tValue: '',
  valueHash: '',
  remark: null,
  isEnabled: true,
};

const TheForm = memo(
  forwardRef<TheFormRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
    const { tableRef } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<AddTranslationReq>(DEFAULT_FORM);
    const [duplicateInfo, setDuplicateInfo] = useState<CheckDuplicateTranslationRes | null>(null);
    const [checking, setChecking] = useState(false);

    // SHA256 哈希计算
    const calculateSHA256 = useCallback(async (text: string): Promise<string> => {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }, []);

    // 检查重复的核心函数
    const checkDuplicate = useCallback(
      async (tValue: string) => {
        if (!tValue.trim()) {
          setDuplicateInfo(null);
          return;
        }

        setChecking(true);
        try {
          const hash = await calculateSHA256(tValue);
          const res = await TranslationAPI.checkDuplicateFn({
            data: {
              tValue,
              valueHash: hash,
              excludeId: editId,
            },
          });
          setDuplicateInfo(res.data?.data);
        } catch (error) {
          console.error('检查重复失败:', error);
        } finally {
          setChecking(false);
        }
      },
      [calculateSHA256, editId],
    );

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        openAdd: () => {
          setEditId(null);
          setForm(DEFAULT_FORM);
          setDuplicateInfo(null);
          setOpen(true);
        },
        openEdit: (row: TableState['list'][0]) => {
          setEditId(row.id!);
          setForm({
            application: row.application || '',
            business: row.business || '',
            langCode: row.langCode || '',
            tKey: row.tKey || '',
            tValue: row.tValue || '',
            valueHash: row.valueHash || '',
            isEnabled: row.isEnabled,
            remark: row.remark || null,
          });
          setDuplicateInfo(null);
          setOpen(true);
        },
        close: () => {
          handleCancel();
        },
      }),
      [],
    );

    const handleCancel = () => {
      setEditId(null);
      setOpen(false);
      setForm(DEFAULT_FORM);
      setDuplicateInfo(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      // 前端计算 hash，后端会再次验证
      const hash = await calculateSHA256(form.tValue);
      const formData = { ...form, valueHash: hash };

      if (editId) {
        await TranslationAPI.updateFn({ data: { id: editId, ...formData } });
      } else {
        await TranslationAPI.addFn({ data: formData });
      }
      handleCancel();
      // 刷新表格数据
      tableRef.current?.refresh();
    };

    return (
      <Dialog
        open={open}
        onClose={handleCancel}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            margin: isMobile ? 0 : theme.spacing(4),
            maxHeight: isMobile ? '100vh' : 'calc(100vh - 64px)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: isMobile ? 1 : 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {editId ? t('common.actions.update') : t('common.actions.add')}
          </Box>
          {isMobile && (
            <IconButton edge="end" color="inherit" onClick={handleCancel} aria-label="close">
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent
          sx={{
            pb: isMobile ? 1 : 2,
            px: isMobile ? 2 : 3,
          }}
        >
          <form onSubmit={handleSubmit}>
            <Stack spacing={isMobile ? 2 : 3} sx={{ mt: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('i18n.translation.form.application')}
                  value={form.application}
                  onChange={(e) => setForm({ ...form, application: e.target.value })}
                  required
                  fullWidth
                  autoComplete="on"
                  size={isMobile ? 'medium' : 'medium'}
                  placeholder={t('i18n.translation.form.application')}
                />

                <TextField
                  label={t('i18n.translation.form.business')}
                  value={form.business}
                  onChange={(e) => setForm({ ...form, business: e.target.value })}
                  required
                  fullWidth
                  autoComplete="on"
                  size={isMobile ? 'medium' : 'medium'}
                  placeholder={t('i18n.translation.form.business')}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('i18n.translation.form.langCode')}
                  value={form.langCode}
                  onChange={(e) => setForm({ ...form, langCode: e.target.value })}
                  required
                  fullWidth
                  autoComplete="on"
                  size={isMobile ? 'medium' : 'medium'}
                  placeholder={t('i18n.translation.form.langCode')}
                />
              </Stack>

              <TextField
                label={t('i18n.translation.form.tKey')}
                value={form.tKey}
                onChange={(e) => setForm({ ...form, tKey: e.target.value })}
                required
                fullWidth
                size={isMobile ? 'medium' : 'medium'}
                placeholder={t('i18n.translation.form.tKey')}
              />

              <Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
                  <TextField
                    label={t('i18n.translation.form.tValue')}
                    value={form.tValue}
                    onChange={(e) => setForm({ ...form, tValue: e.target.value })}
                    onBlur={() => checkDuplicate(form.tValue)}
                    required
                    fullWidth
                    multiline
                    rows={4}
                    size={isMobile ? 'medium' : 'medium'}
                    placeholder={t('i18n.translation.form.tValue')}
                    sx={{ flex: 1 }}
                  />
                  {checking && (
                    <Box sx={{ display: 'flex', alignItems: 'center', pt: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  )}
                </Stack>

                {/* 重复提示 */}
                {duplicateInfo && duplicateInfo.hasDuplicate && (
                  <Alert severity="warning" sx={{ mt: 2 }} icon={<WarningIcon />}>
                    <Box sx={{ mb: 1 }}>
                      <strong>
                        {t('i18n.translation.duplicate.foundPrefix')}{' '}
                        {duplicateInfo.duplicates.length}{' '}
                        {t('i18n.translation.duplicate.foundSuffix')}
                      </strong>
                    </Box>
                    <List dense sx={{ bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1, mb: 1 }}>
                      {duplicateInfo.duplicates.map((dup) => (
                        <ListItem key={dup.id} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box
                                sx={{
                                  display: 'flex',
                                  gap: 1,
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                }}
                              >
                                <Chip label={dup.application} size="small" variant="outlined" />
                                <Chip label={dup.business} size="small" variant="outlined" />
                                <Chip label={dup.langCode} size="small" variant="outlined" />
                                <span style={{ fontWeight: 500 }}>{dup.tKey}</span>
                              </Box>
                            }
                            sx={{ py: 0.5 }}
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                      {t('i18n.translation.duplicate.suggestion')}
                    </Box>
                  </Alert>
                )}
              </Box>

              <TextField
                label={t('common.form.remark')}
                value={form.remark || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    remark: hasValue(e.target.value) ? e.target.value : null,
                  })
                }
                fullWidth
                multiline
                rows={2}
                size={isMobile ? 'medium' : 'medium'}
                placeholder={t('form.pleaseEnter')}
              />

              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2">{t('common.filter.enabledStatus')}</Typography>
                <Box
                  component="label"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.isEnabled}
                    onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                    style={{ width: 20, height: 20, cursor: 'pointer' }}
                  />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    {form.isEnabled
                      ? t('i18n.translation.switch.enabled')
                      : t('i18n.translation.switch.disabled')}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </form>
        </DialogContent>

        <DialogActions
          sx={{
            px: isMobile ? 2 : 3,
            py: isMobile ? 2 : 1.5,
          }}
        >
          <Button onClick={handleCancel} color="inherit">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editId
              ? t('common.actions.save')
              : t('common.actions.add')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

export default TheForm;
