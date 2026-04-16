import { forwardRef, useImperativeHandle, useState, memo, useEffect } from 'react';
import { Box, TextField, Typography, Chip } from '@mui/material';
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
    const [prefixInput, setPrefixInput] = useState('');
    const [state, setState] = useState<FilterState>({
      prefix: '',
    });

    useImperativeHandle(ref, () => ({
      updateCount: (val: number) => setCount(val),
      reset: () => {
        const resetState: FilterState = { prefix: '' };
        setPrefixInput('');
        setState(resetState);
        tableRef.current?.refresh(resetState);
      },
    }));

    // Handle prefix debounce
    useEffect(() => {
      const timer = setTimeout(() => {
        if (prefixInput !== state.prefix) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          setState((_prev) => {
            const updated = { prefix: prefixInput };
            tableRef.current?.refresh(updated);
            return updated;
          });
        }
      }, 500);
      return () => clearTimeout(timer);
    }, [prefixInput, state.prefix, tableRef]);

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
            {t('filter.title')}
          </Typography>
          {count > 0 && (
            <Chip
              label={t('filter.results').replace('{count}', count.toString())}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.75rem' }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            label={t('filter.keywordLabel')}
            value={prefixInput}
            onChange={(e) => setPrefixInput(e.target.value)}
            sx={{ width: { xs: '100%', sm: 300 } }}
          />
        </Box>
      </Box>
    );
  }),
);

export default TheFilter;
