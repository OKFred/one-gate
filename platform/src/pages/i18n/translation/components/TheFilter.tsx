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
import type { ListTranslationReq } from '@/api/i18n/type';
import { useTranslation } from '@/hooks/useTranslation';

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListTranslationReq['orderBy']>;
  descend: boolean;
  application?: string;
  business?: string;
  langCode?: string;
  isEnabled?: boolean;
}

// 暴露给父组件的方法
export interface TheFilterRef {
  /** 更新筛选结果数量 */
  updateCount: (count: number) => void;
}

const TheFilter = memo(
  forwardRef<TheFilterRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
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
      return (
        keywordInput ||
        filters.orderBy !== 'id' ||
        filters.descend ||
        filters.application ||
        filters.business ||
        filters.langCode ||
        filters.isEnabled !== undefined
      );
    };

    return (
      <Paper sx={{ p: 2, mb: 2, position: 'relative' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <FilterIcon color="action" />
            <Typography variant="h6">{t('i18n.translation.filter.title')}</Typography>
            {isSearching && (
              <Chip
                label={t('i18n.translation.filter.searching')}
                size="small"
                color="default"
                variant="outlined"
              />
            )}
            {!isSearching && filterCount > 0 && (
              <Chip
                label={`${filterCount} ${t('i18n.translation.filter.resultsSuffix')}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {hasActiveFilters() && (
              <Chip
                label={t('i18n.translation.filter.clear')}
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
                label={t('i18n.translation.filter.keywordLabel')}
                placeholder={t('i18n.translation.filter.keywordPlaceholder')}
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
                  label={t('i18n.translation.form.application')}
                  placeholder={t('i18n.translation.form.application.placeholder')}
                  value={filters.application || ''}
                  onChange={(e) => handleFilterChange('application', e.target.value)}
                  size="small"
                  fullWidth
                />

                <TextField
                  label={t('i18n.translation.form.business')}
                  placeholder={t('i18n.translation.form.business.placeholder')}
                  value={filters.business || ''}
                  onChange={(e) => handleFilterChange('business', e.target.value)}
                  size="small"
                  fullWidth
                />

                <TextField
                  label={t('i18n.translation.form.langCode')}
                  placeholder={t('i18n.translation.form.langCode.placeholder')}
                  value={filters.langCode || ''}
                  onChange={(e) => handleFilterChange('langCode', e.target.value)}
                  size="small"
                  fullWidth
                />

                <FormControl size="small" fullWidth>
                  <InputLabel>{t('i18n.translation.filter.enabledLabel')}</InputLabel>
                  <Select
                    value={
                      filters.isEnabled === undefined
                        ? 'all'
                        : filters.isEnabled
                          ? 'enabled'
                          : 'disabled'
                    }
                    label={t('i18n.translation.filter.enabledLabel')}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleFilterChange(
                        'isEnabled',
                        value === 'all' ? undefined : value === 'enabled',
                      );
                    }}
                  >
                    <MenuItem value="all">{t('i18n.translation.switch.all')}</MenuItem>
                    <MenuItem value="enabled">{t('i18n.translation.switch.enabled')}</MenuItem>
                    <MenuItem value="disabled">{t('i18n.translation.switch.disabled')}</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('i18n.translation.filter.sortField')}</InputLabel>
                  <Select
                    value={filters.orderBy}
                    label={t('i18n.translation.filter.sortField')}
                    onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                  >
                    <MenuItem value="id">ID</MenuItem>
                    <MenuItem value="application">
                      {t('i18n.translation.form.application')}
                    </MenuItem>
                    <MenuItem value="business">{t('i18n.translation.form.business')}</MenuItem>
                    <MenuItem value="langCode">{t('i18n.translation.form.langCode')}</MenuItem>
                    <MenuItem value="tKey">{t('i18n.translation.form.tKey')}</MenuItem>
                    <MenuItem value="createTimeUtc">
                      {t('i18n.translation.columns.createTime')}
                    </MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>{t('i18n.translation.filter.sortOrder')}</InputLabel>
                  <Select
                    value={filters.descend ? 'desc' : 'asc'}
                    label={t('i18n.translation.filter.sortOrder')}
                    onChange={(e) => handleFilterChange('descend', e.target.value === 'desc')}
                  >
                    <MenuItem value="asc">{t('i18n.translation.filter.sort.asc')}</MenuItem>
                    <MenuItem value="desc">{t('i18n.translation.filter.sort.desc')}</MenuItem>
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
