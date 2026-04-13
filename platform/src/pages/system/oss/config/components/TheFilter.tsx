import { forwardRef, useImperativeHandle, useState, memo } from 'react';
import { Box, TextField, MenuItem, Button, Badge } from '@mui/material';
import { useTranslation } from '@/hooks/useTranslation';
import type { Props } from '../index';

export interface FilterState {
  keyword: string;
  isEnabled?: boolean;
  orderBy: 'id' | 'name';
  descend: boolean;
}

export interface TheFilterRef {
  updateCount: (count: number) => void;
  reset: () => void;
}

const TheFilter = memo(
  forwardRef<TheFilterRef, Props>(({ localObj }, ref) => {
    const { tableRef } = localObj;
    const t = useTranslation();
    const [count, setCount] = useState(0);
    const [state, setState] = useState<FilterState>({
      keyword: '',
      orderBy: 'id',
      descend: true,
    });

    useImperativeHandle(ref, () => ({
      updateCount: (val: number) => setCount(val),
      reset: () => {
        const resetState: FilterState = { keyword: '', orderBy: 'id', descend: true };
        setState(resetState);
        tableRef.current?.refresh(resetState);
      },
    }));

    const handleSearch = () => {
      tableRef.current?.refresh(state);
    };

    const handleClear = () => {
      const resetState: FilterState = { keyword: '', orderBy: 'id', descend: true };
      setState(resetState);
      tableRef.current?.refresh(resetState);
    };

    return (
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          label={t('filter.keywordLabel')}
          value={state.keyword}
          onChange={(e) => setState({ ...state, keyword: e.target.value })}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ width: 200 }}
        />
        <TextField
          select
          size="small"
          label={t('filter.enabledStatus')}
          value={state.isEnabled ?? ''}
          onChange={(e) =>
            setState({
              ...state,
              isEnabled: e.target.value === '' ? undefined : e.target.value === 'true',
            })
          }
          sx={{ width: 120 }}
        >
          <MenuItem value="">{t('filter.all')}</MenuItem>
          <MenuItem value="true">{t('status.enabled')}</MenuItem>
          <MenuItem value="false">{t('status.disabled')}</MenuItem>
        </TextField>
        <Badge badgeContent={count} color="primary" sx={{ ml: 'auto' }}>
          <Button variant="contained" onClick={handleSearch}>
            {t('table.refresh')}
          </Button>
        </Badge>
        <Button variant="outlined" onClick={handleClear}>
          {t('filter.clear')}
        </Button>
      </Box>
    );
  }),
);

export default TheFilter;
