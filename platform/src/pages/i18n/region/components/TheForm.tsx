import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  memo,
  useCallback,
  useMemo,
} from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Box,
  useTheme,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import * as RegionAPI from '@/api/i18n/region';
import type { AddRegionReq } from '@/api/i18n/type';
import type { Props } from '../index';
import type { TableState } from './TheTable';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import hasValue from '@/utils/hasValue';
import { useFormError } from '@/hooks/useFormError';
import { SchemaForm, Field } from '@/components/Form';
import { useValidator } from '@/utils/validator';
import regionSchema from '@/assets/schemas/i18n.regionAddReq.json';

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
  businessLanguages: null,
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
    const [loading, setLoading] = useState(false);
    const {
      fieldErrors,
      handleFormError,
      clearErrors,
      clearFieldError,
      setFieldErrors,
      rootSchema,
    } = useFormError(regionSchema);
    const { validate } = useValidator(regionSchema);

    // 记忆化 Context Value，确保与 SchemaForm 共享同一引用
    const errorContextValue = useMemo(
      () => ({ fieldErrors, clearFieldError, rootSchema }),
      [fieldErrors, clearFieldError, rootSchema],
    );

    const handleCancel = useCallback(() => {
      setEditId(null);
      setOpen(false);
      setForm(DEFAULT_FORM);
      clearErrors();
    }, [clearErrors]);

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
            businessLanguages: row.businessLanguages,
            isEnabled: row.isEnabled,
            remark: row.remark || '',
          });
          setOpen(true);
        },
        close: () => {
          handleCancel();
        },
      }),
      [enabledLanguages, handleCancel],
    );

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      // 前端预校验
      const clientErrors = validate(form);
      if (Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors);
        return;
      }

      setLoading(true);

      try {
        if (editId) {
          await RegionAPI.updateFn({ data: { id: editId, ...form } });
        } else {
          await RegionAPI.addFn({ data: form });
        }
        handleCancel();
        // 刷新表格数据
        tableRef.current?.refresh();
      } catch (error: unknown) {
        handleFormError(error);
      } finally {
        setLoading(false);
      }
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
            {editId ? t('dialog.edit') : t('dialog.add')}
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
          <SchemaForm schema={regionSchema} contextValue={errorContextValue}>
            <Box sx={{ pt: 2 }}>
              <Stack spacing={isMobile ? 2 : 3}>
                {/* 动态语言字段 */}
                {enabledLanguages.map((lang) => {
                  if (!lang.langCode) return null;
                  const langCode = lang.langCode;
                  return (
                    <Field
                      key={langCode}
                      name={langCode}
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
                  <Field
                    name="alpha2Code"
                    label={t('region.table.alpha2Code')}
                    value={form.alpha2Code}
                    onChange={(e) => setForm({ ...form, alpha2Code: e.target.value.toUpperCase() })}
                    required
                    fullWidth
                    size={isMobile ? 'medium' : 'medium'}
                    placeholder="CN"
                  />

                  <Field
                    name="alpha3Code"
                    label={t('region.table.alpha3Code')}
                    value={form.alpha3Code}
                    onChange={(e) => setForm({ ...form, alpha3Code: e.target.value.toUpperCase() })}
                    required
                    fullWidth
                    size={isMobile ? 'medium' : 'medium'}
                    placeholder="CHN"
                  />

                  <Field
                    name="numeric"
                    label={t('region.table.numeric')}
                    type="number"
                    value={form.numeric}
                    onChange={(e) => setForm({ ...form, numeric: parseInt(e.target.value) || 0 })}
                    required
                    fullWidth
                    size={isMobile ? 'medium' : 'medium'}
                    placeholder="156"
                    slotProps={{ htmlInput: { min: 0 } }}
                  />
                </Stack>

                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Field
                    type="checkbox"
                    name="iso3166Independent"
                    label={t('region.table.iso3166Independent')}
                    value={form.iso3166Independent}
                    onChange={(checked: boolean) =>
                      setForm({ ...form, iso3166Independent: checked })
                    }
                  />

                  <Field
                    name="isEnabled"
                    label={t('status.enabled')}
                    type="switch"
                    value={form.isEnabled}
                    onChange={(checked: boolean) => setForm({ ...form, isEnabled: checked })}
                  />
                </Stack>

                <Field
                  type="autocomplete"
                  name="businessLanguages"
                  label={t('region.table.businessLanguages')}
                  multiple
                  options={enabledLanguages.map((lang) => lang.langCode || '')}
                  value={form.businessLanguages || []}
                  onChange={(newValue: unknown) => {
                    const val = newValue as string[];
                    setForm({
                      ...form,
                      businessLanguages: val.length > 0 ? val : null,
                    });
                  }}
                  getOptionLabel={(option: unknown) => {
                    const opt = option as string;
                    const lang = enabledLanguages.find((l) => l.langCode === opt);
                    return lang ? `${lang.nativeName || opt} (${opt})` : opt;
                  }}
                  placeholder={t('form.select')}
                />
                <Field
                  name="remark"
                  label={t('column.remark')}
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
                  slotProps={{ htmlInput: { maxLength: 500 } }}
                  helperText={`${(form.remark || '').length}/500`}
                />
              </Stack>
            </Box>
          </SchemaForm>
        </DialogContent>

        <DialogActions
          sx={{
            px: isMobile ? 2 : 3,
            py: isMobile ? 2 : 2,
            flexDirection: isMobile ? 'column-reverse' : 'row',
            gap: isMobile ? 1 : 0,
          }}
        >
          <Button
            onClick={handleCancel}
            variant="outlined"
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
            disabled={loading}
          >
            {t('dialog.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
            disabled={loading}
          >
            {t('dialog.save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

export default TheForm;
