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
import type { Props } from '../index';
import type { ListLoginAuditReq } from '@/api/maintenance/type';

// 筛选状态类型
export interface FilterState {
  userId?: number;
  orderBy: NonNullable<ListLoginAuditReq['orderBy']>;
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
    const [filterCount, setFilterCount] = useState(0);
    const [expanded, setExpanded] = useState(true);
    const [userIdInput, setUserIdInput] = useState<string>('');
    const [isSearching, setIsSearching] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
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

    // 执行搜索
    const executeSearch = useCallback(() => {
      const userId = userIdInput ? parseInt(userIdInput, 10) : undefined;
      const newFilters = { ...filters, userId };
      setFilters(newFilters);
      tableRef.current?.refresh(newFilters);
      setIsSearching(false);
    }, [userIdInput, filters, tableRef]);

    // 用户ID输入防抖
    useEffect(() => {
      const userId = userIdInput ? parseInt(userIdInput, 10) : undefined;
      if (userId !== filters.userId) {
        setIsSearching(true);
        const timer = setTimeout(() => {
          executeSearch();
        }, 500);

        return () => clearTimeout(timer);
      }
    }, [userIdInput, executeSearch, filters.userId]);

    const handleFilterChange = (key: keyof FilterState, value: string | boolean) => {
      if (key === 'userId') {
        setUserIdInput(value as string);
      } else {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        tableRef.current?.refresh(newFilters);
      }
    };

    const clearFilters = () => {
      const emptyFilters: FilterState = {
        orderBy: 'id',
        descend: true,
      };
      setUserIdInput('');
      setFilters(emptyFilters);
      setIsSearching(false);
      tableRef.current?.refresh(emptyFilters);
    };

    const hasActiveFilters = () => {
      return userIdInput || filters.orderBy !== 'id' || !filters.descend;
    };

    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
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
          <Box display="flex" alignItems="center" gap={1}>
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
                label={t('maintenance.auditLogin.column.userId')}
                type="number"
                value={userIdInput}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
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
                  <InputLabel>{t('filter.orderBy')}</InputLabel>
                  <Select
                    value={filters.orderBy}
                    label={t('filter.orderBy')}
                    onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                  >
                    <MenuItem value="id">{t('columns.id')}</MenuItem>
                    <MenuItem value="userId">{t('maintenance.auditLogin.column.userId')}</MenuItem>
                    <MenuItem value="loginTimeUtc">
                      {t('maintenance.auditLogin.column.loginTime')}
                    </MenuItem>
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

TheFilter.displayName = 'TheFilter';

export default TheFilter;
