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
import { useState, useEffect, useCallback } from 'react';
import type { FilterState } from '../type';
import { useTranslation } from '@/hooks/useTranslation';

interface TemplateFilterProps {
  onFilterChange: (filters: FilterState) => void;
  filterCount?: number;
}

export default function TemplateFilter({ onFilterChange, filterCount = 0 }: TemplateFilterProps) {
  const t = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [keywordInput, setKeywordInput] = useState(''); // 内部输入状态
  const [isSearching, setIsSearching] = useState(false); // 搜索状态
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    orderBy: 'id',
    descend: false,
  });

  // 防抖执行搜索
  const debouncedSearch = useCallback(() => {
    const newFilters = { ...filters, keyword: keywordInput };
    setFilters(newFilters);
    onFilterChange(newFilters);
    setIsSearching(false);
  }, [keywordInput, filters, onFilterChange]);

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
      onFilterChange(newFilters);
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
    setIsSearching(false); // 重置搜索状态
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = () => {
    return keywordInput || filters.orderBy !== 'id' || filters.descend;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <FilterIcon color="action" />
          <Typography variant="h6">{t('mail.template.filter.title')}</Typography>
          {isSearching && (
            <Chip label={t('mail.template.filter.searching')} size="small" color="default" variant="outlined" />
          )}
          {!isSearching && filterCount > 0 && (
            <Chip label={`${filterCount} ${t('mail.template.filter.resultsSuffix')}`} size="small" color="primary" variant="outlined" />
          )}
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
            {hasActiveFilters() && (
              <Chip
                label={t('mail.template.filter.clear')}
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
              label={t('mail.template.filter.keywordLabel')}
              placeholder={t('mail.template.filter.keywordPlaceholder')}
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
                <InputLabel>{t('mail.template.filter.sortField')}</InputLabel>
                <Select
                  value={filters.orderBy}
                  label={t('mail.template.filter.sortField')}
                  onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                >
                  <MenuItem value="id">ID</MenuItem>
                  <MenuItem value="langCode">{t('mail.template.filter.field.langCode')}</MenuItem>
                  <MenuItem value="creatorName">{t('mail.template.filter.field.creator')}</MenuItem>
                  <MenuItem value="category">{t('mail.template.filter.field.category')}</MenuItem>
                  <MenuItem value="createTimeUtc">{t('mail.template.filter.field.createTime')}</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>{t('mail.template.filter.sortOrder')}</InputLabel>
                <Select
                  value={filters.descend ? 'desc' : 'asc'}
                  label={t('mail.template.filter.sortOrder')}
                  onChange={(e) => handleFilterChange('descend', e.target.value === 'desc')}
                >
                  <MenuItem value="asc">{t('mail.template.filter.sort.asc')}</MenuItem>
                  <MenuItem value="desc">{t('mail.template.filter.sort.desc')}</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}
