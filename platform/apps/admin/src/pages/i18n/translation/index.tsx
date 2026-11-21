import { useState, type Dispatch, type SetStateAction } from 'react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { adminI18nTranslationContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import { Field } from '@/components/Form';
import * as TranslationAPI from '@/api/admin/i18n/translation';
import type { CheckDuplicateTranslationRes, ListTranslationRes } from '@/api/admin/i18n/type';

type TranslationRecord = NonNullable<ListTranslationRes['list']>[number] & Record<string, unknown>;
type DuplicateItem = CheckDuplicateTranslationRes['duplicates'][number];

async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface TranslationValueFieldProps {
  label: string;
  tValue: string;
  recordId?: number;
  disabled: boolean;
  t: (key: string) => string;
  setForm: Dispatch<SetStateAction<Partial<TranslationRecord>>>;
}

function TranslationValueField({
  label,
  tValue,
  recordId,
  disabled,
  t,
  setForm,
}: TranslationValueFieldProps) {
  const [checking, setChecking] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);

  const checkDuplicate = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setDuplicates([]);
      return;
    }
    setChecking(true);
    try {
      const valueHash = await computeSha256(text);
      const res = await TranslationAPI.checkDuplicateFn({
        data: {
          tValue: text,
          valueHash,
          ...(recordId ? { excludeId: recordId } : {}),
        },
        errorPresentation: 'local',
      });
      const payload = res.data?.data;
      setDuplicates(payload?.hasDuplicate ? payload.duplicates : []);
    } catch {
      setDuplicates([]);
    } finally {
      setChecking(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Box onBlurCapture={() => void checkDuplicate(tValue)}>
        <Field
          type="text"
          name="tValue"
          label={label}
          required
          multiline
          rows={4}
          disabled={disabled}
          value={tValue}
          onChange={(e) => {
            const val = e.target.value;
            setForm((prev) => ({ ...prev, tValue: val }));
            if (!val.trim()) setDuplicates([]);
          }}
          fullWidth
        />
      </Box>
      {checking && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
          <CircularProgress size={14} />
          <Typography variant="caption">{t('common.searching')}</Typography>
        </Box>
      )}
      {duplicates.length > 0 && (
        <Alert severity="warning">
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
            {t('translation.dialog.duplicateWarning').replace('{count}', String(duplicates.length))}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {duplicates.map((dup) => (
              <li key={dup.id}>
                <Typography variant="caption">
                  [{dup.application}/{dup.business}/{dup.langCode}] {dup.tKey}
                </Typography>
              </li>
            ))}
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
            {t('translation.dialog.duplicateSuggestion')}
          </Typography>
        </Alert>
      )}
    </Stack>
  );
}

export default function TranslationManagement() {
  const extensions: CrudExtensions<TranslationRecord> = {
    beforeSubmitAsync: async (form) => {
      const tValue = typeof form.tValue === 'string' ? form.tValue : '';
      const valueHash = await computeSha256(tValue);
      return {
        ...form,
        valueHash,
      };
    },
    customFormFields: {
      tValue: (ctx) => (
        <TranslationValueField
          label={ctx.t('translation.table.tValue')}
          tValue={typeof ctx.form.tValue === 'string' ? ctx.form.tValue : ''}
          recordId={ctx.isEdit && typeof ctx.form.id === 'number' ? ctx.form.id : undefined}
          disabled={ctx.disabled}
          t={ctx.t}
          setForm={ctx.setForm}
        />
      ),
    },
  };

  return <ContractCrudPage contract={adminI18nTranslationContract} extensions={extensions} />;
}
