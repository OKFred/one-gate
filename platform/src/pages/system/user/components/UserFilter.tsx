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
import { FilterList as FilterIcon, ExpandLess, ExpandMore, Search as SearchIcon } from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import type { FilterState } from '../index';

interface UserFilterProps {
  onFilterChange: (filters: FilterState) => void;
  filterCount?: number;
}

export default function UserFilter({ onFilterChange, filterCount = 0 }: UserFilterProps) {
  const [expanded, setExpanded] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    orderBy: 'id',
    descend: true,
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
      }, 500);

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
      descend: true,
    };
    setKeywordInput('');
    setFilters(emptyFilters);
    setIsSearching(false);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = () => {
    return keywordInput || 
           filters.orderBy !== 'id' || 
           !filters.descend;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <FilterIcon color="action" />
          <Typography variant="h6">搜索与筛选</Typography>
          {isSearching && (
            <Chip 
              label="搜索中..." 
              size="small" 
              color="default" 
              variant="outlined"
            />
          )}
          {!isSearching && filterCount > 0 && (
            <Chip 
              label={`${filterCount} 个用户`} 
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
              placeholder="搜索用户名、姓名、邮箱..."
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
                <InputLabel>排序字段</InputLabel>
                <Select
                  value={filters.orderBy}
                  label="排序字段"
                  onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                >
                  <MenuItem value="id">ID</MenuItem>
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
}
