import { Chip, Box } from '@mui/material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { ListRegionReq, ListRegionRes, ListAllLanguageRes } from '@/api/i18n/type';

export type RegionRes = NonNullable<ListRegionRes['list']>[0];
import type { FilterState } from './TheFilter';

export const tableConfig: SchemaCrudConfig<
  RegionRes,
  FilterState,
  ListRegionReq,
  { enabledLanguages: ListAllLanguageRes }
>['table'] = {
  columns: (t, extraContext) => {
    const enabledLanguages = extraContext?.enabledLanguages || [];
    return [
      { title: t('columns.id'), render: (row) => row.id },
      ...enabledLanguages
        .filter((lang) => lang.langCode)
        .map((lang) => ({
          title: lang.nativeName || lang.langCode || '',
          render: (row: RegionRes) =>
            (row.labels as Record<string, string | undefined>)?.[lang.langCode!] || '-',
        })),
      {
        title: t('region.table.alpha2Code'),
        render: (row) => (
          <Chip label={row.alpha2Code} size="small" color="primary" variant="outlined" />
        ),
      },
      {
        title: t('region.table.alpha3Code'),
        render: (row) => (
          <Chip label={row.alpha3Code} size="small" color="secondary" variant="outlined" />
        ),
      },
      { title: t('region.table.numeric'), render: (row) => row.numeric },
      {
        title: t('region.table.iso3166Independent'),
        render: (row) => (
          <Chip
            label={row.iso3166Independent ? t('column.yes') : t('column.no')}
            size="small"
            color={row.iso3166Independent ? 'success' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        title: t('region.table.businessLanguages'),
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {row.businessLanguages && row.businessLanguages.length > 0 ? (
              row.businessLanguages.map((langCode: string) => {
                const lang = enabledLanguages.find((l) => l.langCode === langCode);
                return (
                  <Chip
                    key={langCode}
                    label={lang?.nativeName || langCode}
                    size="small"
                    variant="outlined"
                  />
                );
              })
            ) : (
              <span style={{ color: '#999' }}>-</span>
            )}
          </Box>
        ),
      },
      {
        title: t('filter.enabledStatus'),
        render: (row) => (
          <Chip
            label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
            size="small"
            color={row.isEnabled ? 'success' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        title: t('columns.createTime'),
        render: (row) => dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss'),
      },
    ];
  },

  cardFields: (t, extraContext) => {
    const enabledLanguages = extraContext?.enabledLanguages || [];
    return [
      {
        type: 'title',
        render: (row) => {
          const firstLang = enabledLanguages[0];
          if (firstLang?.langCode) {
            return (
              (row.labels as Record<string, string | undefined>)?.[firstLang.langCode] ||
              row.alpha2Code
            );
          }
          return row.alpha2Code;
        },
      },
      { type: 'subtitle', label: t('columns.id'), render: (row) => row.id },
      ...enabledLanguages
        .filter((lang) => lang.langCode)
        .map((lang) => ({
          type: 'content' as const,
          label: lang.nativeName || lang.langCode || '',
          render: (row: RegionRes) =>
            (row.labels as Record<string, string | undefined>)?.[lang.langCode!] || '-',
        })),
      {
        type: 'tags',
        render: (row) => (
          <>
            <Chip label={row.alpha2Code} size="small" color="primary" variant="outlined" />
            <Chip label={row.alpha3Code} size="small" color="secondary" variant="outlined" />
            <Chip label={`#${row.numeric}`} size="small" variant="outlined" />
            <Chip
              label={row.iso3166Independent ? t('column.yes') : t('column.no')}
              size="small"
              color={row.iso3166Independent ? 'success' : 'default'}
              variant="outlined"
            />
            {row.businessLanguages && row.businessLanguages.length > 0 && (
              <>
                {row.businessLanguages.map((langCode: string) => {
                  const lang = enabledLanguages.find((l) => l.langCode === langCode);
                  return (
                    <Chip
                      key={langCode}
                      label={lang?.nativeName || langCode}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  );
                })}
              </>
            )}
            <Chip
              label={row.isEnabled ? t('status.enabled') : t('status.disabled')}
              size="small"
              color={row.isEnabled ? 'success' : 'default'}
              variant="outlined"
            />
          </>
        ),
      },
    ];
  },
};
