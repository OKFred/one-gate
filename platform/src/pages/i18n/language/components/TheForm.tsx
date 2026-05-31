import { Stack, Box } from '@mui/material';
import { Field } from '@/components/Form';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { LanguageRes } from './TheTable';
import type { FilterState } from './TheFilter';
import type { ListLanguageReq } from '@/api/i18n/type';
import languageSchema from '@/assets/schemas/i18n.languageAddReq.json';
import hasValue from '@/utils/hasValue';

export const formConfig: SchemaCrudConfig<LanguageRes, FilterState, ListLanguageReq>['form'] = {
  schema: languageSchema,
  defaultForm: {
    langCode: '',
    nativeName: '',
    isEnabled: true,
    sortOrder: 1,
    remark: null,
  },
  afterOpen: (form, isEdit, row) => {
    if (isEdit && row) {
      return {
        ...form,
        langCode: row.langCode || '',
        nativeName: row.nativeName || '',
        isEnabled: row.isEnabled ?? true,
        sortOrder: row.sortOrder ?? 1,
        remark: row.remark || null,
      };
    }
    return {
      ...form,
      langCode: '',
      nativeName: '',
      isEnabled: true,
      sortOrder: 1,
      remark: null,
    };
  },
  renderForm: (form, setForm, _errorContextValue, t) => {
    return (
      <Box sx={{ pt: 2 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Field
              name="langCode"
              label={t('language.table.langCode')}
              value={form.langCode || ''}
              onChange={(e) => setForm({ ...form, langCode: e.target.value })}
              required
              fullWidth
              size="medium"
              placeholder="zh-CN"
            />
            <Field
              name="nativeName"
              label={t('language.table.nativeName')}
              value={form.nativeName || ''}
              onChange={(e) => setForm({ ...form, nativeName: e.target.value })}
              required
              fullWidth
              size="medium"
              placeholder="简体中文"
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Field
              name="sortOrder"
              label={t('menu.table.sort')}
              type="number"
              value={form.sortOrder ?? 1}
              onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 1 })}
              required
              fullWidth
              size="medium"
              placeholder="1"
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Stack>

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
  },
};
