import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  memo,
  useCallback,
  useEffect,
} from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Paper,
  IconButton,
  Collapse,
  Chip,
  Typography,
  InputAdornment,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  FilterList as FilterIcon,
  ExpandLess,
  ExpandMore,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import type { Props } from '../index';

// 筛选状态类型
export interface FilterState {
  orderBy: 'id' | 'createTimeUtc' | 'roleId' | 'permissionId';
  descend: boolean;
  keyword: string;
  roleId: number | null;
  permissionId: number | null;
  isEnabled?: boolean;
}

// 暴露给父组件的方法
export interface TheFilterRef {
  /** 获取当前筛选条件 */
  getFilter: () => FilterState;
  /** 重置筛选条件 */
  reset: () => void;
  /** 更新筛选结果数量 */
  updateCount: (count: number) => void;
}

const TheFilter = memo(
  forwardRef<TheFilterRef, Props>(function TheFilter({ localObj }, ref) {
    const t = useTranslation();
    const { allRoles, allPermissions, tableRef, query } = localObj;

    const [expanded, setExpanded] = useState(true);
    const [keywordInput, setKeywordInput] = useState(''); // 内部输入状态
    const [isSearching, setIsSearching] = useState(false); // 搜索状态
    const [filterCount, setFilterCount] = useState(0); // 结果数量
    const [filters, setFilters] = useState<FilterState>({
      orderBy: 'id',
      descend: false,
      keyword: '',
      roleId: query.roleId || null,
      permissionId: null,
      isEnabled: undefined,
    });

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        getFilter: () => filters,
        reset: () => {
          const emptyFilters: FilterState = {
            keyword: '',
            roleId: null,
            permissionId: null,
            orderBy: 'id',
            descend: false,
            isEnabled: undefined,
          };
          setKeywordInput('');
          setFilters(emptyFilters);
        },
        updateCount: (count: number) => {
          setFilterCount(count);
          setIsSearching(false);
        },
      }),
      [filters],
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
    }, [keywordInput, filters]);

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

    // 当筛选条件改变时，刷新表格
    useEffect(() => {
      refreshTable(filters);
    }, [filters, refreshTable]);

    const handleRoleChange = (event: SelectChangeEvent<number | ''>) => {
      const value = event.target.value === '' ? null : Number(event.target.value);
      setFilters((prev) => ({ ...prev, roleId: value }));
    };

    const handlePermissionChange = (event: SelectChangeEvent<number | ''>) => {
      const value = event.target.value === '' ? null : Number(event.target.value);
      setFilters((prev) => ({ ...prev, permissionId: value }));
    };

    const handleKeywordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setKeywordInput(event.target.value);
    };

    const handleClearKeyword = () => {
      setKeywordInput('');
    };

    const clearFilters = () => {
      const emptyFilters: FilterState = {
        keyword: '',
        orderBy: 'id',
        descend: false,
        isEnabled: undefined,
        roleId: null,
        permissionId: null,
      };
      setKeywordInput(''); // 清空输入框
      setFilters(emptyFilters);
      refreshTable(emptyFilters);
    };

    const hasActiveFilters = () => {
      return keywordInput || filters.roleId || filters.permissionId;
    };

    return (
      <Paper sx={{ p: 2, mb: 2, position: 'relative' }}>
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
                label={t('rolePermission.keyword')}
                placeholder={t('rolePermission.keywordPlaceholder')}
                value={keywordInput}
                onChange={handleKeywordChange}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: keywordInput && (
                    <IconButton size="small" onClick={handleClearKeyword}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ),
                }}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('rolePermission.filterByRole')}</InputLabel>
                  <Select
                    value={filters.roleId || ''}
                    label={t('rolePermission.filterByRole')}
                    onChange={handleRoleChange}
                  >
                    <MenuItem value="">
                      <em>{t('filter.all')}</em>
                    </MenuItem>
                    {allRoles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>{t('rolePermission.filterByPermission')}</InputLabel>
                  <Select
                    value={filters.permissionId || ''}
                    label={t('rolePermission.filterByPermission')}
                    onChange={handlePermissionChange}
                  >
                    <MenuItem value="">
                      <em>{t('filter.all')}</em>
                    </MenuItem>
                    {allPermissions.map((permission) => (
                      <MenuItem key={permission.id} value={permission.id}>
                        {permission.name} ({permission.code})
                      </MenuItem>
                    ))}
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
