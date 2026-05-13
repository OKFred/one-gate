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
import type { ListPermissionReq } from '@/api/system/type';
import { useTranslation } from '@/hooks/useTranslation';

// 筛选状态类型
export interface FilterState {
  keyword: string;
  category?: 'action';
  isEnabled: boolean | undefined;
  orderBy: NonNullable<ListPermissionReq['orderBy']>;
  descend: boolean;
}

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
      category: undefined,
      isEnabled: undefined,
      orderBy: 'id',
      descend: false,
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
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        refreshTable(newFilters);
      }
    };

    const clearFilters = () => {
      const emptyFilters: FilterState = {
        keyword: '',
        category: undefined,
        isEnabled: undefined,
        orderBy: 'id',
        descend: false,
      };
      setKeywordInput('');
      setFilters(emptyFilters);
      setIsSearching(false);
      refreshTable(emptyFilters);
    };

    const hasActiveFilters = () => {
      return (
        keywordInput ||
        filters.category ||
        filters.isEnabled !== undefined ||
        filters.orderBy !== 'id' ||
        !filters.descend
      );
    };

    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon color="action" />
            <Typography variant="h6">{t('filter.title')}</Typography>
            {!isSearching && filterCount > 0 && (
              <Chip
                label={t('filter.results').replace('{count}', String(filterCount))}
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

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('permission.category')}</InputLabel>
                  <Select
                    value={filters.category ?? ''}
                    label={t('permission.category')}
                    onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                  >
                    <MenuItem value="">
                      <em>{t('filter.all')}</em>
                    </MenuItem>
                    <MenuItem value="action">{t('permission.category.action')}</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>{t('columns.status')}</InputLabel>
                  <Select
                    value={
                      filters.isEnabled === undefined
                        ? ''
                        : filters.isEnabled
                          ? 'enabled'
                          : 'disabled'
                    }
                    label={t('columns.status')}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleFilterChange(
                        'isEnabled',
                        String(value) === '' ? undefined : value === 'enabled',
                      );
                    }}
                  >
                    <MenuItem value="">
                      <em>{t('filter.all')}</em>
                    </MenuItem>
                    <MenuItem value="enabled">{t('status.enabled')}</MenuItem>
                    <MenuItem value="disabled">{t('status.disabled')}</MenuItem>
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
