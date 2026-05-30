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
import { useState, useEffect, useImperativeHandle } from 'react';
import type { Props } from '../index';
import { useTranslation } from '@/hooks/useTranslation';
import type { ListMailAccountReq } from '@/api/mail/type';

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListMailAccountReq['orderBy']>;
  descend: boolean;
}

// 暴露给父组件的方法
export interface TheFilterRef {
  /** 更新筛选结果数量 */
  updateCount: (count: number) => void;
}

export default function TheFilter({ localObj, ref }: Props & { ref?: React.Ref<TheFilterRef> }) {
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

  // 关键词输入防抖
  useEffect(() => {
    if (keywordInput !== filters.keyword) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        const newFilters = { ...filters, keyword: keywordInput };
        setFilters(newFilters);
        if (tableRef.current) {
          tableRef.current.refresh(newFilters);
        }
      }, 500); // 500ms 防抖延迟

      return () => clearTimeout(timer);
    }
  }, [keywordInput, filters, tableRef]);

  const handleFilterChange = (key: keyof FilterState, value: string | boolean) => {
    if (key === 'keyword') {
      setKeywordInput(value as string);
    } else {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      if (tableRef.current) {
        tableRef.current.refresh(newFilters);
      }
    }
  };

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      keyword: '',
      orderBy: 'id',
      descend: false,
    };
    setKeywordInput(''); // 清空输入框
    setFilters(emptyFilters);
    if (tableRef.current) {
      tableRef.current.refresh(emptyFilters);
    }
  };

  const hasActiveFilters = () => {
    return !!(keywordInput || filters.orderBy !== 'id' || filters.descend);
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
}
