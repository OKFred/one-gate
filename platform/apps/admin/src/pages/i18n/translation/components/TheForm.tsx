import { useState, useCallback } from 'react';
import {
  Stack,
  Box,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
} from '@mui/material';
import { WarningAmber as WarningIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { Field } from '@/components/Form';
import type { CheckDuplicateTranslationRes } from '@/api/admin/i18n/type';
import * as TranslationAPI from '@/api/admin/i18n/translation';
import hasValue from '@/utils/hasValue';

interface FormState {
  id?: number;
  application: string;
  business: string;
  langCode: string;
  tKey: string;
  tValue: string;
  valueHash: string;
  isEnabled: boolean;
  remark: string | null;
}

export default function TranslationFormFields({
  form,
  setForm,
  t,
}: {
  form: Partial<FormState>;
  setForm: (form: Partial<FormState>) => void;
  t: (key: string) => string;
}) {
  const [duplicateInfo, setDuplicateInfo] = useState<CheckDuplicateTranslationRes | null>(null);
  const [checking, setChecking] = useState(false);

  // SHA-256 计算
  const calculateSHA256 = useCallback(async (text: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }, []);

  // 检查重复项
  const checkDuplicate = useCallback(
    async (tValue: string) => {
      if (!tValue.trim()) {
        setDuplicateInfo(null);
        return;
      }
      setChecking(true);
      try {
        const hash = await calculateSHA256(tValue);
        // 静默缓存到 form 状态中
        setForm({ ...form, tValue, valueHash: hash });

        const res = await TranslationAPI.checkDuplicateFn({
          data: {
            tValue,
            valueHash: hash,
            excludeId: form.id,
          },
        });
        setDuplicateInfo(res.data?.data || null);
      } catch (error) {
        console.error('检查重复失败:', error);
      } finally {
        setChecking(false);
      }
    },
    [calculateSHA256, form, setForm],
  );

  return (
    <Box sx={{ pt: 2 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Field
            name="application"
            label={t('translation.table.application')}
            value={form.application || ''}
            onChange={(e) => setForm({ ...form, application: e.target.value })}
            required
            fullWidth
            size="medium"
          />
          <Field
            name="business"
            label={t('translation.table.business')}
            value={form.business || ''}
            onChange={(e) => setForm({ ...form, business: e.target.value })}
            required
            fullWidth
            size="medium"
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Field
            name="langCode"
            label={t('translation.table.langCode')}
            value={form.langCode || ''}
            onChange={(e) => setForm({ ...form, langCode: e.target.value })}
            required
            fullWidth
            size="medium"
          />
        </Stack>

        <Field
          name="tKey"
          label={t('translation.table.tKey')}
          value={form.tKey || ''}
          onChange={(e) => setForm({ ...form, tKey: e.target.value })}
          required
          fullWidth
          size="medium"
        />

        <Box sx={{ position: 'relative' }}>
          <Field
            name="tValue"
            label={t('translation.table.tValue')}
            value={form.tValue || ''}
            onChange={(e) => setForm({ ...form, tValue: e.target.value })}
            onBlur={() => checkDuplicate(form.tValue || '')}
            required
            fullWidth
            multiline
            rows={4}
            size="medium"
          />
          {checking && (
            <CircularProgress
              size={20}
              sx={{
                position: 'absolute',
                right: 12,
                top: 20,
              }}
            />
          )}
        </Box>

        {duplicateInfo && duplicateInfo.hasDuplicate && (
          <Alert severity="warning" icon={<WarningIcon />}>
            <Box sx={{ mb: 1 }}>
              <strong>
                {t('translation.dialog.duplicateWarning').replace(
                  '{count}',
                  String(duplicateInfo.duplicates.length),
                )}
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
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Chip label={dup.application} size="small" variant="outlined" />
                        <Chip label={dup.business} size="small" variant="outlined" />
                        <Chip label={dup.langCode} size="small" variant="outlined" />
                        <span style={{ fontWeight: 500 }}>{dup.tKey}</span>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              {t('translation.dialog.duplicateSuggestion')}
            </Box>
          </Alert>
        )}

        <Field
          name="isEnabled"
          label={t('status.enabled')}
          type="switch"
          value={form.isEnabled ?? true}
          onChange={(checked: boolean) => setForm({ ...form, isEnabled: checked })}
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
          size="medium"
          placeholder={t('form.pleaseEnter')}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          helperText={`${(form.remark || '').length}/500`}
        />
      </Stack>
    </Box>
  );
}
