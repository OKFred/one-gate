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
import type { FilterState } from './TheTable';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface TheFilterRef {
  /** 更新筛选结果数量 */
  updateCount: (count: number) => void;
}

const TheFilter = memo(
  forwardRef<TheFilterRef, Props>(({ localObj }, ref) => {
    const { tableRef } = localObj;
    const t = useTranslation();
    const [expanded, setExpanded] = useState(true);
    const [keywordInput, setKeywordInput] = useState(''); // 内部输入状态
    const [isSearching, setIsSearching] = useState(false); // 搜索状态
    const [filterCount, setFilterCount] = useState(0); // 结果数量
    const [filters, setFilters] = useState<FilterState>({
      keyword: '',
      orderBy: 'id',
      descend: false,
      isEnabled: undefined,
    });

    // 暴露给父组件的方法
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

    // 调用表格刷新
    const refreshTable = useCallback(
      (newFilters: FilterState) => {
        if (tableRef.current) {
          tableRef.current.refresh(newFilters);
        }
      },
      [tableRef],
    );

    // 防抖执行搜索
    const debouncedSearch = useCallback(() => {
      const newFilters = { ...filters, keyword: keywordInput };
      setFilters(newFilters);
      refreshTable(newFilters);
    }, [keywordInput, filters, refreshTable]);

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

    const handleFilterChange = (key: keyof FilterState, value: string | boolean | undefined) => {
      if (key === 'keyword') {
        setKeywordInput(value as string);
      } else {
        const newFilters = {
          ...filters,
          [key]: typeof value === 'boolean' ? value : value || undefined,
        };
        setFilters(newFilters);
        refreshTable(newFilters);
      }
    };

    const clearFilters = () => {
      const emptyFilters: FilterState = {
        keyword: '',
        orderBy: 'id',
        descend: false,
        isEnabled: undefined,
      };
      setKeywordInput(''); // 清空输入框
      setFilters(emptyFilters);
      refreshTable(emptyFilters);
    };

    const hasActiveFilters = () => {
      return (
        keywordInput ||
        filters.orderBy !== 'id' ||
        filters.descend ||
        filters.isEnabled !== undefined
      );
    };

    return (
      <Paper sx={{ p: 2, mb: 2, position: 'relative' }}>
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
                label={t('common.filter.clear')}
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
                label={t('common.filter.keywordLabel')}
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
                  <InputLabel>{t('i18n.language.columns.isEnabled')}</InputLabel>
                  <Select
                    value={
                      filters.isEnabled === undefined
                        ? 'all'
                        : filters.isEnabled
                          ? 'enabled'
                          : 'disabled'
                    }
                    label={t('i18n.language.columns.isEnabled')}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleFilterChange(
                        'isEnabled',
                        value === 'all' ? undefined : value === 'enabled',
                      );
                    }}
                  >
                    <MenuItem value="all">{t('common.filter.all')}</MenuItem>
                    <MenuItem value="enabled">{t('common.status.enabled')}</MenuItem>
                    <MenuItem value="disabled">{t('common.status.disabled')}</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('common.filter.orderBy')}</InputLabel>
                  <Select
                    value={filters.orderBy}
                    label={t('common.filter.orderBy')}
                    onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                  >
                    <MenuItem value="id">{t('common.columns.id')}</MenuItem>
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

export default TheFilter;
