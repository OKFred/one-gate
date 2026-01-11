import {
  Paper,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
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
  useRef,
} from 'react';
import type { Props } from '../index';

// 筛选状态类型
export interface FilterState {
  keyword: string;
  isEnabled?: boolean;
}

// 暴露给父组件的方法
export interface TheFilterRef {
  /** 获取当前筛选状态 */
  getFilters: () => FilterState;
}

const TheFilter = memo(
  forwardRef<TheFilterRef, Props>(({ localObj }, ref) => {
    const { treeRef } = localObj;
    const [expanded, setExpanded] = useState(true);
    const [keywordInput, setKeywordInput] = useState('');
    const [isEnabledFilter, setIsEnabledFilter] = useState<string>('all');
    const [filters, setFilters] = useState<FilterState>({
      keyword: '',
      isEnabled: undefined,
    });
    const isInitialMount = useRef(true);
    const prevKeyword = useRef(keywordInput);
    const prevEnabled = useRef(isEnabledFilter);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        getFilters: () => filters,
      }),
      [filters],
    );

    // 调用树形图刷新
    const refreshTree = useCallback(
      (newFilters: FilterState) => {
        if (treeRef.current) {
          treeRef.current.refresh(newFilters);
        }
      },
      [treeRef],
    );

    // 统一处理筛选逻辑
    useEffect(() => {
      // 跳过初始挂载
      if (isInitialMount.current) {
        isInitialMount.current = false;
        prevKeyword.current = keywordInput;
        prevEnabled.current = isEnabledFilter;
        return;
      }

      const keywordChanged = prevKeyword.current !== keywordInput;
      const enabledChanged = prevEnabled.current !== isEnabledFilter;

      // 更新 ref
      prevKeyword.current = keywordInput;
      prevEnabled.current = isEnabledFilter;

      const newFilters: FilterState = {
        keyword: keywordInput,
        isEnabled: isEnabledFilter === 'all' ? undefined : isEnabledFilter === 'enabled',
      };
      setFilters(newFilters);

      // 启用状态变化：立即执行
      if (enabledChanged) {
        refreshTree(newFilters);
        return;
      }

      // 关键词变化：防抖处理
      if (keywordChanged) {
        const timer = setTimeout(() => {
          refreshTree(newFilters);
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [keywordInput, isEnabledFilter, refreshTree]);

    // 处理启用状态变化
    const handleEnabledChange = (value: string) => {
      setIsEnabledFilter(value);
    };

    return (
      <Paper
        sx={{
          p: 2,
          mb: 2,
          bgcolor: 'background.paper',
          transition: 'all 0.3s ease',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon fontSize="small" />
            <span>筛选条件</span>
          </Box>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        <Collapse in={expanded} timeout="auto">
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="关键词"
              placeholder="输入菜单名称或路径"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" fullWidth>
              <InputLabel>启用状态</InputLabel>
              <Select
                value={isEnabledFilter}
                label="启用状态"
                onChange={(e) => handleEnabledChange(e.target.value)}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="enabled">启用</MenuItem>
                <MenuItem value="disabled">禁用</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Collapse>
      </Paper>
    );
  }),
);

export default TheFilter;
