import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  TextField,
  Chip,
  Box,
  Typography,
  IconButton,
  Collapse,
  InputAdornment,
} from '@mui/material';
import { FilterList as FilterIcon, ExpandLess, ExpandMore, Search as SearchIcon } from '@mui/icons-material';

interface UserFilterProps {
  onSearch: (keyword: string) => void;
  userCount: number;
}

export default function UserFilter({ onSearch, userCount }: UserFilterProps) {
  const [expanded, setExpanded] = useState(true);
  const [keywordInput, setKeywordInput] = useState(''); // 内部输入状态
  const [isSearching, setIsSearching] = useState(false); // 搜索状态
  const [currentKeyword, setCurrentKeyword] = useState(''); // 当前生效的搜索关键词

  // 防抖执行搜索
  const debouncedSearch = useCallback(() => {
    setCurrentKeyword(keywordInput);
    onSearch(keywordInput);
    setIsSearching(false);
  }, [keywordInput, onSearch]);

  // 关键词输入防抖
  useEffect(() => {
    if (keywordInput !== currentKeyword) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        debouncedSearch();
      }, 500); // 500ms 防抖延迟

      return () => clearTimeout(timer);
    }
  }, [keywordInput, debouncedSearch, currentKeyword]);

  const clearFilters = () => {
    setKeywordInput(''); // 清空输入框
    setCurrentKeyword('');
    setIsSearching(false); // 重置搜索状态
    onSearch('');
  };

  const hasActiveFilters = () => {
    return keywordInput || currentKeyword;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <FilterIcon color="action" />
          <Typography variant="h6">用户筛选</Typography>
          {isSearching && (
            <Chip 
              label="搜索中..." 
              size="small" 
              color="default" 
              variant="outlined"
            />
          )}
          {!isSearching && userCount > 0 && (
            <Chip 
              label={`${userCount} 个用户`} 
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
          <TextField
            label="搜索用户"
            placeholder="搜索用户名、姓名、邮箱..."
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
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
        </Box>
      </Collapse>
    </Paper>
  );
}
