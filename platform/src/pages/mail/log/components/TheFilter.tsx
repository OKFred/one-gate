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
import { useTranslation } from '@/hooks/useTranslation';
import type { FilterState } from './TheTable';
import type { Props } from '../index';

// 暴露给父组件的方法
export interface TheFilterRef {
  /** 更新筛选结果数量 */
  updateCount: (count: number) => void;
}

const TheFilter = memo(
  forwardRef<TheFilterRef, Props>(({ localObj }, ref) => {
    const { tableRef } = localObj;
    const t = useTranslation();
    const [filterCount, setFilterCount] = useState(0);
    const [expanded, setExpanded] = useState(true);
    const [keywordInput, setKeywordInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
      keyword: '',
      orderBy: 'id',
      descend: true,
    });

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        updateCount: (count: number) => {
          setFilterCount(count);
        },
      }),
      [],
    );

    // 防抖执行搜索
    const debouncedSearch = useCallback(() => {
      const newFilters = { ...filters, keyword: keywordInput };
      setFilters(newFilters);
      tableRef.current?.refresh(newFilters);
      setIsSearching(false);
    }, [keywordInput, filters, tableRef]);

    // 关键词输入防抖
    useEffect(() => {
      if (keywordInput !== filters.keyword) {
        setIsSearching(true);
        const timer = setTimeout(() => {
          debouncedSearch();
        }, 500); // 500ms 防抖延迟

        return () => clearTimeout(timer);
      }
    }, [keywordInput, debouncedSearch, filters.keyword]);

    const handleFilterChange = (key: keyof FilterState, value: string | boolean) => {
      if (key === 'keyword') {
        setKeywordInput(value as string);
      } else {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        tableRef.current?.refresh(newFilters);
      }
    };

    const clearFilters = () => {
      const emptyFilters: FilterState = {
        keyword: '',
        orderBy: 'id',
        descend: true,
      };
      setKeywordInput('');
      setFilters(emptyFilters);
      setIsSearching(false);
      tableRef.current?.refresh(emptyFilters);
    };

    const hasActiveFilters = () => {
      return keywordInput || filters.orderBy !== 'id' || !filters.descend;
    };

    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <FilterIcon color="action" />
            <Typography variant="h6">{t('common.filter.title')}</Typography>
            {!isSearching && filterCount > 0 && (
              <Chip
                label={t('common.filter.results').replace('{count}', filterCount.toString())}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {hasActiveFilters() && (
              <Chip
                label={t('common.filter.clearFilters')}
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
                label={t('common.filter.keyword')}
                placeholder={t('common.filter.keywordLabel')}
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
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('common.filter.orderBy')}</InputLabel>
                  <Select
                    value={filters.orderBy}
                    label={t('common.filter.orderBy')}
                    onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                  >
                    <MenuItem value="id">{t('common.columns.id')}</MenuItem>
                    <MenuItem value="mailTo">{t('mail.log.columns.recipient')}</MenuItem>
                    <MenuItem value="mailFrom">{t('mail.log.columns.sender')}</MenuItem>
                    <MenuItem value="createTimeUtc">{t('common.columns.createTime')}</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>{t('common.filter.sortOrder')}</InputLabel>
                  <Select
                    value={filters.descend ? 'desc' : 'asc'}
                    label={t('common.filter.sortOrder')}
                    onChange={(e) => handleFilterChange('descend', e.target.value === 'desc')}
                  >
                    <MenuItem value="asc">{t('common.filter.asc')}</MenuItem>
                    <MenuItem value="desc">{t('common.filter.desc')}</MenuItem>
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

TheFilter.displayName = 'TheFilter';

export default TheFilter;
