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
  CalendarMonth,
} from '@mui/icons-material';
import { useState, useEffect, useCallback, memo, forwardRef, useImperativeHandle } from 'react';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';
import type { ListAttendanceReq } from '@/api/enterprise/type';

export interface FilterState extends Omit<ListAttendanceReq, 'pageNo' | 'pageSize'> {
  keyword: string;
  orderBy: NonNullable<ListAttendanceReq['orderBy']>;
  descend: boolean;
}

export interface TheFilterRef {
  updateCount: (count: number) => void;
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
      status: undefined,
      employeeId: undefined,
      date: '',
    });

    useImperativeHandle(
      ref,
      () => ({
        updateCount: (count: number) => {
          setFilterCount(count);
          setIsSearching(false);
        },
      }),
      [],
    );

    const refreshTable = useCallback(
      (newFilters: FilterState) => {
        tableRef.current?.refresh(newFilters);
      },
      [tableRef],
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

    const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      if (key === 'keyword' && typeof value === 'string') {
        setKeywordInput(value);
      } else {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        refreshTable(newFilters);
      }
    };

    const clearFilters = () => {
      const emptyFilters: FilterState = {
        keyword: '',
        orderBy: 'id',
        descend: true,
        status: undefined,
        employeeId: undefined,
        date: '',
      };
      setKeywordInput('');
      setFilters(emptyFilters);
      refreshTable(emptyFilters);
    };

    const hasActiveFilters = () => {
      return (
        keywordInput ||
        filters.orderBy !== 'id' ||
        !filters.descend ||
        filters.status !== undefined ||
        filters.employeeId !== undefined ||
        filters.date !== ''
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
              <TextField
                label={t('filter.keywordLabel')}
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

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('enterprise.attendance.date')}
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  size="small"
                  fullWidth
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarMonth color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <FormControl size="small" fullWidth>
                  <InputLabel>{t('enterprise.attendance.status')}</InputLabel>
                  <Select
                    value={filters.status === undefined ? 'all' : filters.status}
                    label={t('enterprise.attendance.status')}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleFilterChange(
                        'status',
                        val === 'all' ? undefined : (Number(val) as 0 | 1 | 2 | 3),
                      );
                    }}
                  >
                    <MenuItem value="all">{t('filter.all')}</MenuItem>
                    <MenuItem value={0}>{t('enterprise.attendance.status.normal')}</MenuItem>
                    <MenuItem value={1}>{t('enterprise.attendance.status.late')}</MenuItem>
                    <MenuItem value={2}>{t('enterprise.attendance.status.earlyLeave')}</MenuItem>
                    <MenuItem value={3}>{t('enterprise.attendance.status.absent')}</MenuItem>
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
                    <MenuItem value="date">{t('enterprise.attendance.date')}</MenuItem>
                    <MenuItem value="createTimeUtc">{t('columns.createTime')}</MenuItem>
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
