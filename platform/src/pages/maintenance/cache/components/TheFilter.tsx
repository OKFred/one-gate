import {
  Paper,
  TextField,
  Stack,
  Chip,
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

// 筛选状态类型
export interface FilterState {
  namespace: string;
  keywordPrefix: string;
}

// 暴露给父组件的方法
export interface CacheFilterRef {
  /** 更新筛选结果数量 */
  updateCount: (count: number) => void;
}

const TheFilter = memo(
  forwardRef<CacheFilterRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
    const { tableRef } = localObj;
    const [expanded, setExpanded] = useState(true);
    const [keywordInput, setKeywordInput] = useState(''); // 内部输入状态
    const [isSearching, setIsSearching] = useState(false); // 搜索状态
    const [filterCount, setFilterCount] = useState(0); // 结果数量
    const [filters, setFilters] = useState<FilterState>({
      namespace: '',
      keywordPrefix: '',
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
      const newFilters = { ...filters, keywordPrefix: keywordInput };
      setFilters(newFilters);
      refreshTable(newFilters);
    }, [keywordInput, filters, refreshTable]);

    // 关键词输入防抖
    useEffect(() => {
      if (keywordInput !== filters.keywordPrefix) {
        setIsSearching(true);
        const timer = setTimeout(() => {
          debouncedSearch();
        }, 500); // 500ms 防抖延迟

        return () => clearTimeout(timer);
      }
    }, [keywordInput, debouncedSearch, filters.keywordPrefix]);

    const handleFilterChange = (key: keyof FilterState, value: string) => {
      if (key === 'keywordPrefix') {
        setKeywordInput(value);
      } else {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        refreshTable(newFilters);
      }
    };

    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={expanded ? 2 : 0}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <FilterIcon color="action" />
            <Typography variant="h6">{t('common.filter')}</Typography>
            {filterCount > 0 && (
              <Chip
                label={`${filterCount} ${t('common.results')}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {isSearching && (
              <Chip label={t('common.searching')} size="small" color="default" variant="outlined" />
            )}
          </Stack>
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Stack>

        <Collapse in={expanded}>
          <Stack spacing={2}>
            <TextField
              label={t('cache.filter.namespace')}
              value={filters.namespace}
              onChange={(e) => handleFilterChange('namespace', e.target.value)}
              fullWidth
              size="small"
              placeholder={t('cache.filter.namespacePlaceholder')}
            />

            <TextField
              label={t('cache.filter.keyPrefix')}
              value={keywordInput}
              onChange={(e) => handleFilterChange('keywordPrefix', e.target.value)}
              fullWidth
              size="small"
              placeholder={t('cache.filter.keyPrefixPlaceholder')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </Collapse>
      </Paper>
    );
  }),
);

TheFilter.displayName = 'TheFilter';
export default TheFilter;
