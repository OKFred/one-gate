import { forwardRef, useImperativeHandle, useState, memo } from 'react';
import { Box, TextField, Button, Badge } from '@mui/material';
import { useTranslation } from '@/hooks/useTranslation';
import type { Props } from '../index';

export interface FilterState {
  prefix: string;
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
      prefix: '',
    });

    useImperativeHandle(ref, () => ({
      updateCount: (val: number) => setCount(val),
      reset: () => {
        const resetState: FilterState = { prefix: '' };
        setState(resetState);
        tableRef.current?.refresh(resetState);
      },
    }));

    const handleSearch = () => {
      tableRef.current?.refresh(state);
    };

    return (
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          label={t('filter.keywordLabel')}
          value={state.prefix}
          onChange={(e) => setState({ ...state, prefix: e.target.value })}
          onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Path prefix..."
          sx={{ width: 250 }}
        />
        <Badge badgeContent={count} color="primary" sx={{ ml: 'auto' }}>
          <Button variant="contained" onClick={handleSearch}>
            {t('table.refresh')}
          </Button>
        </Badge>
      </Box>
    );
  }),
);

export default TheFilter;
