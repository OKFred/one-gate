import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useEffect,
  memo,
} from 'react';
import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Card,
  CardContent,
  Typography,
  Chip,
  Pagination,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import * as mailAccountAPI from '@/api/mail/account';
import { AccountActionButtons } from './AccountButtons';
import type { ListMailAccount, FilterState } from '../type.d';
import type { Props } from '../type.d';

// 暴露给父组件的方法
export interface AccountTableRef {
  /** 刷新表格数据 */
  refresh: (filters?: FilterState) => void;
  /** 获取当前筛选条件 */
  getFilters: () => FilterState;
  /** 获取当前总数 */
  getTotal: () => number;
}

// 表格内部状态
interface TableState {
  accounts: ListMailAccount[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  filters: FilterState;
}

const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  orderBy: 'id',
  descend: false,
};

const AccountTable = memo(
  forwardRef<AccountTableRef, Props>(({ localObj }, ref) => {
    const { formRef, filterRef } = localObj;
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // 整合所有表格相关状态
    const [state, setState] = useState<TableState>({
      accounts: [],
      loading: false,
      page: 1,
      pageSize: 10,
      total: 0,
      filters: DEFAULT_FILTERS,
    });

    const { accounts, loading, page, pageSize, total, filters } = state;
    const totalPages = Math.ceil(total / pageSize);

    // 获取数据的核心函数
    const fetchAccounts = useCallback(
      async (searchFilters: FilterState, currentPage: number = 1) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData = {
            pageNo: currentPage,
            pageSize: state.pageSize,
            ...(searchFilters.keyword && { keyword: searchFilters.keyword }),
            orderBy: searchFilters.orderBy,
            descend: searchFilters.descend,
          };

          const res = await mailAccountAPI.listFn({ data: requestData });
          const response = res.data;
          const accountsList = response?.data?.list || [];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            accounts: accountsList,
            total: totalCount,
            page: currentPage,
            filters: searchFilters,
            loading: false,
          }));

          // 通知筛选组件更新数量
          filterRef.current?.updateCount(totalCount);
        } catch {
          setState((prev) => ({ ...prev, loading: false }));
        }
      },
      [state.pageSize, filterRef],
    );

    // 删除成功后的回调
    const handleDeleteSuccess = useCallback(() => {
      fetchAccounts(filters, page);
    }, [fetchAccounts, filters, page]);

    // 初始加载
    useEffect(() => {
      fetchAccounts(DEFAULT_FILTERS, 1);
    }, [fetchAccounts]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page; // 如果有新筛选条件，重置到第一页
          fetchAccounts(filtersToUse, pageToUse);
        },
        getFilters: () => filters,
        getTotal: () => total,
      }),
      [fetchAccounts, filters, page, total],
    );

    // 处理分页
    const handlePageChange = (newPage: number) => {
      fetchAccounts(filters, newPage);
    };

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      );
    }

    // 移动端卡片布局
    if (isMobile) {
      return (
        <Box sx={{ mt: 2, mb: 8, position: 'relative' }}>
          {accounts.length > 0 ? (
            <Stack spacing={2}>
              {accounts.map((acc) => (
                <Card key={acc.id} variant="outlined">
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" component="div" gutterBottom>
                          {acc.nickname}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          ID: {acc.id}
                        </Typography>
                      </Box>
                      <AccountActionButtons
                        account={acc}
                        formRef={formRef}
                        onDeleteSuccess={handleDeleteSuccess}
                      />
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        邮箱地址
                      </Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                        {acc.mailAddress}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        SMTP服务器
                      </Typography>
                      <Typography variant="body1">
                        {acc.host}:{acc.port}
                      </Typography>
                    </Box>
                    <Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {acc.sslEnable && <Chip label="SSL" color="success" size="small" />}
                        {acc.starttlsEnable && <Chip label="STARTTLS" color="info" size="small" />}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" color="text.secondary">
                暂无邮件账户
              </Typography>
            </Box>
          )}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => handlePageChange(value)}
                color="primary"
                size="medium"
              />
            </Box>
          )}
        </Box>
      );
    }

    // 桌面端表格布局
    return (
      <TableContainer component={Paper} sx={{ position: 'relative' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>昵称</TableCell>
              <TableCell>邮箱</TableCell>
              <TableCell>主机</TableCell>
              <TableCell>端口</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.length > 0 &&
              accounts.map((acc) => (
                <TableRow key={acc.id} hover>
                  <TableCell>{acc.id}</TableCell>
                  <TableCell>{acc.nickname}</TableCell>
                  <TableCell>{acc.mailAddress}</TableCell>
                  <TableCell>{acc.host}</TableCell>
                  <TableCell>{acc.port}</TableCell>
                  <TableCell align="center">
                    <AccountActionButtons
                      account={acc}
                      formRef={formRef}
                      onDeleteSuccess={handleDeleteSuccess}
                    />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => handlePageChange(value)}
              color="primary"
            />
          </Box>
        )}
      </TableContainer>
    );
  }),
);

AccountTable.displayName = 'AccountTable';

export default AccountTable;
