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
import {
  useState,
  useEffect,
  useCallback,
  memo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { FilterState } from '../type';
import type { Props } from '../type';

// 暴露给父组件的方法
export interface LanguageFilterRef {
  /** 更新筛选结果数量 */
  updateCount: (count: number) => void;
}

const LanguageFilter = memo(
  forwardRef<LanguageFilterRef, Props>(({ localObj }, ref) => {
    const { tableRef } = localObj;
    const [expanded, setExpanded] = useState(true);
    const [keywordInput, setKeywordInput] = useState(''); // 内部输入状态
    const [isSearching, setIsSearching] = useState(false); // 搜索状态
    const [filterCount, setFilterCount] = useState(0); // 结果数量
    const [filters, setFilters] = useState<FilterState>({
      keyword: '',
      orderBy: 'id',
      descend: false,
      application: undefined,
      business: undefined,
      langCode: undefined,
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
          [key]: typeof value === 'boolean' ? value : (value || undefined) 
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
        application: undefined,
        business: undefined,
        langCode: undefined,
        isEnabled: undefined,
      };
      setKeywordInput(''); // 清空输入框
      setFilters(emptyFilters);
      refreshTable(emptyFilters);
    };

    const hasActiveFilters = () => {
      return keywordInput || filters.orderBy !== 'id' || filters.descend || filters.application || filters.business || filters.langCode || filters.isEnabled !== undefined;
    };

    return (
      <Paper sx={{ p: 2, mb: 2, position: 'relative' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <FilterIcon color="action" />
            <Typography variant="h6">搜索与筛选</Typography>
            {isSearching && (
              <Chip label="搜索中..." size="small" color="default" variant="outlined" />
            )}
            {!isSearching && filterCount > 0 && (
              <Chip
                label={`${filterCount} 个结果`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {hasActiveFilters() && (
              <Chip
                label="清除筛选"
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
                label="关键字搜索"
                placeholder="搜索翻译键、翻译值、描述..."
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
                  label="应用"
                  placeholder="如：frontend, backend, common"
                  value={filters.application || ''}
                  onChange={(e) => handleFilterChange('application', e.target.value)}
                  size="small"
                  fullWidth
                />

                <TextField
                  label="业务"
                  placeholder="如：email, order"
                  value={filters.business || ''}
                  onChange={(e) => handleFilterChange('business', e.target.value)}
                  size="small"
                  fullWidth
                />

                <TextField
                  label="语言代码"
                  placeholder="如：en, zh-CN"
                  value={filters.langCode || ''}
                  onChange={(e) => handleFilterChange('langCode', e.target.value)}
                  size="small"
                  fullWidth
                />

                <FormControl size="small" fullWidth>
                  <InputLabel>启用状态</InputLabel>
                  <Select
                    value={filters.isEnabled === undefined ? 'all' : filters.isEnabled ? 'enabled' : 'disabled'}
                    label="启用状态"
                    onChange={(e) => {
                      const value = e.target.value;
                      handleFilterChange('isEnabled', value === 'all' ? undefined : value === 'enabled');
                    }}
                  >
                    <MenuItem value="all">全部</MenuItem>
                    <MenuItem value="enabled">已启用</MenuItem>
                    <MenuItem value="disabled">已禁用</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>排序字段</InputLabel>
                  <Select
                    value={filters.orderBy}
                    label="排序字段"
                    onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                  >
                    <MenuItem value="id">ID</MenuItem>
                    <MenuItem value="application">应用</MenuItem>
                    <MenuItem value="business">业务</MenuItem>
                    <MenuItem value="langCode">语言代码</MenuItem>
                    <MenuItem value="tKey">翻译键</MenuItem>
                    <MenuItem value="createTimeUtc">创建时间</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>排序方式</InputLabel>
                  <Select
                    value={filters.descend ? 'desc' : 'asc'}
                    label="排序方式"
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

LanguageFilter.displayName = 'LanguageFilter';

export default LanguageFilter;
