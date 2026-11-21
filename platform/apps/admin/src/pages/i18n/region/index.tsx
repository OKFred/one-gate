import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Box, Chip, Stack } from '@mui/material';
import { adminI18nRegionContract } from '@hodor/contracts/resources';
import { ContractCrudPage, type CrudExtensions } from '@/components/Crud/contract';
import { Field } from '@/components/Form';
import { useFormErrorContext } from '@/hooks/useFormError';
import * as LanguageAPI from '@/api/admin/i18n/language';
import type { ListAllLanguageRes, ListRegionRes } from '@/api/admin/i18n/type';
import type { TableColumn } from '@/components/Responsive/ResponsiveList';

type LanguageOption = NonNullable<ListAllLanguageRes>[number];
type RegionRecord = NonNullable<ListRegionRes['list']>[number] & Record<string, unknown>;

interface RegionLabelsFieldProps {
  languages: LanguageOption[];
  labels: Record<string, string>;
  disabled: boolean;
  setForm: Dispatch<SetStateAction<Partial<RegionRecord>>>;
}

function RegionLabelsField({ languages, labels, disabled, setForm }: RegionLabelsFieldProps) {
  const errorContext = useFormErrorContext();

  return (
    <Stack spacing={2}>
      {languages.map((lang) => {
        const code = lang.langCode;
        if (!code) return null;
        return (
          <Field
            key={code}
            type="text"
            name={`labels.${code}`}
            label={lang.nativeName || code}
            required
            disabled={disabled}
            value={labels[code] ?? ''}
            onChange={(e) => {
              errorContext?.clearFieldError('labels');
              errorContext?.clearFieldError(`labels.${code}`);
              const nextVal = e.target.value;
              setForm((prev) => ({
                ...prev,
                labels: {
                  ...((prev.labels ?? {}) as Record<string, string>),
                  [code]: nextVal,
                },
              }));
            }}
            fullWidth
          />
        );
      })}
    </Stack>
  );
}

export default function RegionManagement() {
  const [enabledLanguages, setEnabledLanguages] = useState<LanguageOption[]>([]);

  useEffect(() => {
    let active = true;
    LanguageAPI.listAllFn({ data: { isEnabled: true } })
      .then((res) => {
        if (!active) return;
        setEnabledLanguages(res.data?.data ?? []);
      })
      .catch(() => {
        // 全局拦截器处理错误
      });
    return () => {
      active = false;
    };
  }, []);

  const extensions: CrudExtensions<RegionRecord> = {
    transformColumns: (columns) => {
      const langCols: TableColumn<RegionRecord>[] = enabledLanguages
        .filter((lang): lang is LanguageOption & { langCode: string } => Boolean(lang.langCode))
        .map((lang) => ({
          title: lang.nativeName || lang.langCode,
          render: (row) => {
            const map = (row.labels ?? {}) as Record<string, string | undefined>;
            return map[lang.langCode] || '-';
          },
        }));
      return [...columns.slice(0, 1), ...langCols, ...columns.slice(1)];
    },
    customCells: {
      businessLanguages: (row) => {
        const list = row.businessLanguages;
        if (!Array.isArray(list) || list.length === 0) return '-';
        return (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {list.map((code) => {
              const lang = enabledLanguages.find((l) => l.langCode === code);
              return (
                <Chip key={code} label={lang?.nativeName || code} size="small" variant="outlined" />
              );
            })}
          </Box>
        );
      },
    },
    afterOpen: (form, _isEdit, row) => {
      const existingLabels = (row?.labels ?? form.labels ?? {}) as Record<string, string>;
      const initialized: Record<string, string> = { ...existingLabels };
      for (const lang of enabledLanguages) {
        if (lang.langCode && !(lang.langCode in initialized)) {
          initialized[lang.langCode] = '';
        }
      }
      return {
        ...form,
        labels: initialized,
      };
    },
    customFormFields: {
      labels: (ctx) => (
        <RegionLabelsField
          languages={enabledLanguages}
          labels={(ctx.form.labels ?? {}) as Record<string, string>}
          disabled={ctx.disabled}
          setForm={ctx.setForm}
        />
      ),
      businessLanguages: (ctx) => {
        const langCodes = enabledLanguages
          .map((l) => l.langCode)
          .filter((code): code is string => Boolean(code));
        const currentVal = Array.isArray(ctx.form.businessLanguages)
          ? ctx.form.businessLanguages
          : [];
        return (
          <Field
            type="autocomplete"
            multiple
            name="businessLanguages"
            label={ctx.t('region.table.businessLanguages')}
            options={langCodes}
            disabled={ctx.disabled}
            getOptionLabel={(option) => {
              const code = String(option);
              const matched = enabledLanguages.find((l) => l.langCode === code);
              return matched?.nativeName ? `${matched.nativeName} (${code})` : code;
            }}
            value={currentVal}
            onChange={(nextVal: unknown) => {
              const arr = Array.isArray(nextVal) ? nextVal.map(String) : [];
              ctx.setForm((prev) => ({
                ...prev,
                businessLanguages: arr.length > 0 ? arr : null,
              }));
            }}
          />
        );
      },
    },
  };

  return <ContractCrudPage contract={adminI18nRegionContract} extensions={extensions} />;
}
