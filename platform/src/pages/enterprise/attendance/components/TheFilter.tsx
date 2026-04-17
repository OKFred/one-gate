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
  Person,
} from '@mui/icons-material';
import { useState, useEffect, useCallback, memo, forwardRef, useImperativeHandle } from 'react';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';

export interface FilterState {
  keyword: string;
  orderBy: string;
  descend: boolean;
  status?: number;
  employeeId?: number;
  date?: string;
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

    useImperativeHandle(ref, () => ({
      updateCount: (count: number) => {
        setFilterCount(count);
        setIsSearching(false);
      },
    }), []);

    const refreshTable = useCallback((newFilters: FilterState) => {
      tableRef.current?.refresh(newFilters);
    }, [tableRef]);

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

    const handleFilterChange = (key: keyof FilterState, value: any) => {
      if (key === 'keyword') {
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
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <FilterIcon color="action" />
            <Typography variant="h6">{t('filter.title') || '筛选'}</Typography>
            {!isSearching && filterCount > 0 && (
              <Chip
                label={`${filterCount} 条结果`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {hasActiveFilters() && (
              <Chip
                label={t('filter.clear') || '清空筛选'}
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
                label={t('filter.keywordLabel') || '备注关键词'}
                value={keywordInput}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="考勤日期"
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarMonth color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                
                <FormControl size="small" fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={filters.status === undefined ? 'all' : filters.status}
                    label="状态"
                    onChange={(e) => {
                      const val = e.target.value;
                      handleFilterChange('status', val === 'all' ? undefined : Number(val));
                    }}
                  >
                    <MenuItem value="all">全部</MenuItem>
                    <MenuItem value={0}>正常</MenuItem>
                    <MenuItem value={1}>迟到</MenuItem>
                    <MenuItem value={2}>早退</MenuItem>
                    <MenuItem value={3}>旷工</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('filter.orderBy') || '排序字段'}</InputLabel>
                  <Select
                    value={filters.orderBy}
                    label={t('filter.orderBy') || '排序字段'}
                    onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                  >
                    <MenuItem value="id">ID</MenuItem>
                    <MenuItem value="date">日期</MenuItem>
                    <MenuItem value="createTimeUtc">创建时间</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>{t('filter.sortOrder') || '排序方向'}</InputLabel>
                  <Select
                    value={filters.descend ? 'desc' : 'asc'}
                    label={t('filter.sortOrder') || '排序方向'}
                    onChange={(e) => handleFilterChange('descend', e.target.value === 'desc')}
                  >
                    <MenuItem value="asc">升序</MenuItem>
                    <MenuItem value="desc">降序</MenuItem>
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
