import { Stack, Box } from '@mui/material';
import { Field } from '@/components/Form';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { RegionRes } from './TheTable';
import type { FilterState } from './TheFilter';
import type { ListRegionReq, ListAllLanguageRes } from '@/api/infra/i18n/type';
import hasValue from '@/utils/hasValue';

export const formConfig: SchemaCrudConfig<
  RegionRes,
  FilterState,
  ListRegionReq,
  { enabledLanguages: ListAllLanguageRes }
>['form'] = {
  schema: 'infra.i18n.regionAddReq',
  defaultForm: {
    labels: {},
    alpha2Code: '',
    alpha3Code: '',
    numeric: 0,
    iso3166Independent: true,
    businessLanguages: null,
    isEnabled: true,
    remark: '',
  },
  afterOpen: (form, isEdit, row, extraContext) => {
    const enabledLanguages = extraContext?.enabledLanguages || [];
    const labels: Record<string, string> = {};
    enabledLanguages.forEach((lang) => {
      if (lang.langCode) {
        labels[lang.langCode] =
          (row?.labels as Record<string, string | undefined>)?.[lang.langCode] || '';
      }
    });
    if (isEdit && row) {
      return {
        ...form,
        labels,
        alpha2Code: row.alpha2Code || '',
        alpha3Code: row.alpha3Code || '',
        numeric: row.numeric || 0,
        iso3166Independent: row.iso3166Independent ?? true,
        businessLanguages: row.businessLanguages || null,
        isEnabled: row.isEnabled ?? true,
        remark: row.remark || '',
      };
    } else {
      return {
        ...form,
        labels,
        alpha2Code: '',
        alpha3Code: '',
        numeric: 0,
        iso3166Independent: true,
        businessLanguages: null,
        isEnabled: true,
        remark: '',
      };
    }
  },
  renderForm: (form, setForm, _errorContextValue, t, extraContext) => {
    const enabledLanguages = extraContext?.enabledLanguages || [];
    const labelsRecord = (form.labels || {}) as Record<string, string>;

    return (
      <Box sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {/* 动态语言字段 */}
          {enabledLanguages.map((lang) => {
            if (!lang.langCode) return null;
            const langCode = lang.langCode;
            return (
              <Field
                key={langCode}
                name={langCode}
                label={lang.nativeName || langCode}
                value={labelsRecord[langCode] || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    labels: { ...labelsRecord, [langCode]: e.target.value },
                  })
                }
                required
                fullWidth
                size="medium"
                placeholder={lang.nativeName || langCode}
                helperText={`(${langCode})`}
              />
            );
          })}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Field
              name="alpha2Code"
              label={t('region.table.alpha2Code')}
              value={form.alpha2Code || ''}
              onChange={(e) => setForm({ ...form, alpha2Code: e.target.value.toUpperCase() })}
              required
              fullWidth
              size="medium"
              placeholder="CN"
            />

            <Field
              name="alpha3Code"
              label={t('region.table.alpha3Code')}
              value={form.alpha3Code || ''}
              onChange={(e) => setForm({ ...form, alpha3Code: e.target.value.toUpperCase() })}
              required
              fullWidth
              size="medium"
              placeholder="CHN"
            />

            <Field
              name="numeric"
              label={t('region.table.numeric')}
              type="number"
              value={form.numeric ?? 0}
              onChange={(e) => setForm({ ...form, numeric: parseInt(e.target.value) || 0 })}
              required
              fullWidth
              size="medium"
              placeholder="156"
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Field
              type="checkbox"
              name="iso3166Independent"
              label={t('region.table.iso3166Independent')}
              value={form.iso3166Independent ?? true}
              onChange={(checked: boolean) => setForm({ ...form, iso3166Independent: checked })}
            />

            <Field
              name="isEnabled"
              label={t('status.enabled')}
              type="switch"
              value={form.isEnabled ?? true}
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
