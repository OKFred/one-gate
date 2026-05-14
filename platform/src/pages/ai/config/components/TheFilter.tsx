import { forwardRef, useImperativeHandle, useState, memo } from 'react';
import { Stack, TextField, MenuItem, Button } from '@mui/material';
import { Search as SearchIcon, ClearAll as ClearIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import type { Props } from '../index';

export interface TheFilterRef {
  getFilter: () => any;
}

const TheFilter = memo(
  forwardRef<TheFilterRef, Props>(({ localObj }, ref) => {
    const { tableRef } = localObj;
    const t = useTranslation();
    const [keyword, setKeyword] = useState('');
    const [isEnabled, setIsEnabled] = useState<string>('all');

    useImperativeHandle(ref, () => ({
      getFilter: () => ({
        keyword,
        isEnabled: isEnabled === 'all' ? undefined : isEnabled === 'true',
      }),
    }));

    const handleSearch = () => {
      tableRef.current?.refresh();
    };

    const handleClear = () => {
      setKeyword('');
      setIsEnabled('all');
      setTimeout(() => tableRef.current?.refresh());
    };

    return (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          label={t('filter.keyword')}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <TextField
          select
          size="small"
          label={t('filter.enabledStatus')}
          value={isEnabled}
          onChange={(e) => setIsEnabled(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">{t('filter.all')}</MenuItem>
          <MenuItem value="true">{t('column.yes')}</MenuItem>
          <MenuItem value="false">{t('column.no')}</MenuItem>
        </TextField>
        <Button variant="contained" startIcon={<SearchIcon />} onClick={handleSearch}>
          {t('filter.title')}
        </Button>
        <Button variant="outlined" startIcon={<ClearIcon />} onClick={handleClear}>
          {t('filter.clear')}
        </Button>
      </Stack>
    );
  }),
);

export default TheFilter;
