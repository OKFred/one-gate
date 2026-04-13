import { forwardRef, useImperativeHandle, useState, memo, useEffect } from 'react';
import { Box, TextField, MenuItem, Typography, Chip } from '@mui/material';
import { ResponsiveButton, ResponsiveButtonGroup } from '@/components/Responsive/ResponsiveButton';
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
    const [keywordInput, setKeywordInput] = useState('');
    const [state, setState] = useState<FilterState>({
      keyword: '',
      orderBy: 'id',
      descend: true,
    });

    useImperativeHandle(ref, () => ({
      updateCount: (val: number) => setCount(val),
      reset: () => {
        const resetState: FilterState = { keyword: '', orderBy: 'id', descend: true };
        setKeywordInput('');
        setState(resetState);
      },
    }));

    // Handle keyword debounce
    useEffect(() => {
      const timer = setTimeout(() => {
        if (keywordInput !== state.keyword) {
          setState((prev) => {
            const updated = { ...prev, keyword: keywordInput };
            tableRef.current?.refresh(updated);
            return updated;
          });
        }
      }, 500);
      return () => clearTimeout(timer);
    }, [keywordInput, state.keyword, tableRef]);

    const handleClear = () => {
      const resetState: FilterState = { keyword: '', orderBy: 'id', descend: true };
      setKeywordInput('');
      setState(resetState);
      tableRef.current?.refresh(resetState);
    };

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
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            sx={{ width: { xs: '100%', sm: 240 } }}
          />
          <TextField
            select
            size="small"
            label={t('filter.enabledStatus')}
            value={state.isEnabled ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? undefined : e.target.value === 'true';
              setState((prev) => {
                const newState = { ...prev, isEnabled: val };
                tableRef.current?.refresh(newState);
                return newState;
              });
            }}
            sx={{ width: { xs: '100%', sm: 160 } }}
          >
            <MenuItem value="">{t('filter.all')}</MenuItem>
            <MenuItem value="true">{t('status.enabled')}</MenuItem>
            <MenuItem value="false">{t('status.disabled')}</MenuItem>
          </TextField>

          <ResponsiveButtonGroup
            direction="row"
            sx={{ ml: { sm: 'auto' }, width: { xs: '100%', sm: 'auto' } }}
          >
            <ResponsiveButton variant="outlined" onClick={handleClear} mobileFullWidth>
              {t('filter.clear')}
            </ResponsiveButton>
          </ResponsiveButtonGroup>
        </Box>
      </Box>
    );
  }),
);

export default TheFilter;
