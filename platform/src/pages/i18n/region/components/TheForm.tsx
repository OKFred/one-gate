import React, { useState, forwardRef, useImperativeHandle, memo } from 'react';
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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import * as RegionAPI from '@/api/i18n/region';
import type { AddRegionReq } from '@/api/i18n/type';
import type { Props } from '../index';
import type { TableState } from './TheTable';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import hasValue from '@/utils/hasValue';

// 暴露给父组件的方法
export interface TheFormRef {
  /** 打开新增表单 */
  openAdd: () => void;
  /** 打开编辑表单 */
  openEdit: (row: TableState['list'][0]) => void;
  /** 关闭表单 */
  close: () => void;
}

const DEFAULT_FORM: Omit<AddRegionReq, 'labels'> & { labels: Record<string, string> } = {
  labels: {},
  alpha2Code: '',
  alpha3Code: '',
  numeric: 0,
  iso3166Independent: true,
  languages: null,
  isEnabled: true,
  remark: '',
};

const TheForm = memo(
  forwardRef<TheFormRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
    const { tableRef, enabledLanguages } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();

    // 内部状态管理
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<
      Omit<AddRegionReq, 'labels'> & { labels: Record<string, string> }
    >(DEFAULT_FORM);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        openAdd: () => {
          setEditId(null);
          // 初始化labels，为每个启用的语言创建空字符串
          const initialLabels: Record<string, string> = {};
          enabledLanguages.forEach((lang) => {
            if (lang.langCode) {
              initialLabels[lang.langCode] = '';
            }
          });
          setForm({ ...DEFAULT_FORM, labels: initialLabels });
          setOpen(true);
        },
        openEdit: (row: TableState['list'][0]) => {
          setEditId(row.id!);
          // 确保labels包含所有启用的语言
          const labels: Record<string, string> = {};
          enabledLanguages.forEach((lang) => {
            if (lang.langCode) {
              labels[lang.langCode] =
                (row.labels as Record<string, string | undefined>)?.[lang.langCode] || '';
            }
          });
          setForm({
            labels,
            alpha2Code: row.alpha2Code || '',
            alpha3Code: row.alpha3Code || '',
            numeric: row.numeric || 0,
            iso3166Independent: row.iso3166Independent ?? true,
            languages: row.languages,
            isEnabled: row.isEnabled,
            remark: row.remark || '',
          });
          setOpen(true);
        },
        close: () => {
          handleCancel();
        },
      }),
      [enabledLanguages],
    );

    const handleCancel = () => {
      setEditId(null);
      setOpen(false);
      setForm(DEFAULT_FORM);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (editId) {
        await RegionAPI.updateFn({ data: { id: editId, ...form } });
      } else {
        await RegionAPI.addFn({ data: form });
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
              {/* 动态语言字段 */}
              {enabledLanguages.map((lang) => {
                if (!lang.langCode) return null;
                const langCode = lang.langCode;
                return (
                  <TextField
                    key={langCode}
                    label={lang.nativeName || langCode}
                    value={form.labels[langCode] || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        labels: { ...form.labels, [langCode]: e.target.value },
                      })
                    }
                    required
                    fullWidth
                    size={isMobile ? 'medium' : 'medium'}
                    placeholder={lang.nativeName || langCode}
                    helperText={`(${langCode})`}
                  />
                );
              })}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('i18n.region.form.alpha2Code')}
                  value={form.alpha2Code}
                  onChange={(e) => setForm({ ...form, alpha2Code: e.target.value.toUpperCase() })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  placeholder="CN"
                  inputProps={{ maxLength: 2, pattern: '[A-Z]{2}' }}
                />

                <TextField
                  label={t('i18n.region.form.alpha3Code')}
                  value={form.alpha3Code}
                  onChange={(e) => setForm({ ...form, alpha3Code: e.target.value.toUpperCase() })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  placeholder="CHN"
                  inputProps={{ maxLength: 3, pattern: '[A-Z]{3}' }}
                />

                <TextField
                  label={t('i18n.region.form.numeric')}
                  type="number"
                  value={form.numeric}
                  onChange={(e) => setForm({ ...form, numeric: parseInt(e.target.value) || 0 })}
                  required
                  fullWidth
                  size={isMobile ? 'medium' : 'medium'}
                  placeholder="156"
                  inputProps={{ min: 0 }}
                />
              </Stack>

              <Stack direction="row" spacing={2} alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.iso3166Independent}
                      onChange={(e) => setForm({ ...form, iso3166Independent: e.target.checked })}
                    />
                  }
                  label={t('i18n.region.form.iso3166Independent')}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.isEnabled}
                      onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                    />
                  }
                  label={t('switch.enabled')}
                />
              </Stack>
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
                inputProps={{ maxLength: 500 }}
                helperText={`${(form.remark || '').length}/500`}
              />
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
            {editId ? t('common.actions.save') : t('common.actions.add')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

export default TheForm;
