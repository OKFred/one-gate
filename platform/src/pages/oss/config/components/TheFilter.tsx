import {
  Paper,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  IconButton,
  Collapse,
  InputAdornment,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  ExpandLess,
  ExpandMore,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useState, useEffect, useCallback, memo, forwardRef, useImperativeHandle } from 'react';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';

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
    const [expanded, setExpanded] = useState(true);
    const [keywordInput, setKeywordInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [filterCount, setFilterCount] = useState(0);
    const [filters, setFilters] = useState<FilterState>({
      keyword: '',
      orderBy: 'id',
      descend: true,
    });

    const refreshTable = useCallback(
      (newFilters: FilterState) => {
        if (tableRef.current) {
          tableRef.current.refresh(newFilters);
        }
      },
      [tableRef],
    );

    const clearFilters = useCallback(() => {
      const emptyFilters: FilterState = {
        keyword: '',
        orderBy: 'id',
        descend: true,
      };
      setKeywordInput('');
      setFilters(emptyFilters);
      refreshTable(emptyFilters);
    }, [refreshTable]);

    useImperativeHandle(
      ref,
      () => ({
        updateCount: (count: number) => {
          setFilterCount(count);
          setIsSearching(false);
        },
        reset: () => {
          clearFilters();
        },
      }),
      [clearFilters],
    );

    const debouncedSearch = useCallback(() => {
      const newFilters = { ...filters, keyword: keywordInput };
      setFilters(newFilters);
      refreshTable(newFilters);
    }, [keywordInput, filters, refreshTable]);

    useEffect(() => {
      if (keywordInput !== filters.keyword) {
        setIsSearching(true);
        const timer = setTimeout(() => {
          debouncedSearch();
        }, 500);

        return () => clearTimeout(timer);
      }
    }, [keywordInput, debouncedSearch, filters.keyword]);

    const handleFilterChange = (key: keyof FilterState, value: unknown) => {
      if (key === 'keyword') {
        setKeywordInput(value as string);
      } else {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        refreshTable(newFilters);
      }
    };

    const hasActiveFilters = () => {
      return (
        keywordInput ||
        filters.isEnabled !== undefined ||
        filters.orderBy !== 'id' ||
        !filters.descend
      );
    };

    return (
      <Paper sx={{ p: 2, mb: 2, position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon color="action" />
            <Typography variant="h6">{t('filter.title')}</Typography>
            {!isSearching && filterCount > 0 && (
              <Chip
                label={t('filter.results').replace('{count}', filterCount.toString())}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {hasActiveFilters() && (
              <Chip
                label={t('filter.clear')}
                size="small"
                variant="outlined"
                onClick={clearFilters}
                onDelete={clearFilters}
              />
            )}
            <IconButton onClick={() => setExpanded(!expanded)} size="small">
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('filter.keywordLabel')}
                  placeholder={t('filter.keywordLabel')}
                  value={keywordInput}
                  onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  size="small"
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('filter.enabledStatus')}</InputLabel>
                  <Select
                    value={filters.isEnabled === undefined ? '' : String(filters.isEnabled)}
                    label={t('filter.enabledStatus')}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : e.target.value === 'true';
                      handleFilterChange('isEnabled', val);
                    }}
                  >
                    <MenuItem value="">{t('filter.all')}</MenuItem>
                    <MenuItem value="true">{t('status.enabled')}</MenuItem>
                    <MenuItem value="false">{t('status.disabled')}</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('filter.orderBy')}</InputLabel>
                  <Select
                    value={filters.orderBy}
                    label={t('filter.orderBy')}
                    onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                  >
                    <MenuItem value="id">{t('columns.id')}</MenuItem>
                    <MenuItem value="name">{t('oss.config.name')}</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>{t('filter.sortOrder')}</InputLabel>
                  <Select
                    value={filters.descend ? 'desc' : 'asc'}
                    label={t('filter.sortOrder')}
                    onChange={(e) => handleFilterChange('descend', e.target.value === 'desc')}
                  >
                    <MenuItem value="asc">{t('filter.asc')}</MenuItem>
                    <MenuItem value="desc">{t('filter.desc')}</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
          </Box>
        </Collapse>
      </Paper>
    );
  }),
);

export default TheFilter;
