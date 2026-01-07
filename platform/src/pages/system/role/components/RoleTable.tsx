import { forwardRef, useImperativeHandle, useState, useCallback, useEffect, memo } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Fab,
  Tooltip,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import * as roleAPI from '@/api/system/role';
import type { ListRole, FilterState } from '../type.d';
import type { Props } from '../type.d';
import { useResponsive } from '@/hooks/useResponsive';
import dayjs from 'dayjs';

// 暴露给父组件的方法
export interface RoleTableRef {
  /** 刷新表格数据 */
  refresh: (filters?: FilterState) => void;
  /** 获取当前筛选条件 */
  getFilters: () => FilterState;
  /** 获取当前总数 */
  getTotal: () => number;
}

// 表格内部状态
interface TableState {
  roles: ListRole[];
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

const RoleTable = memo(
  forwardRef<RoleTableRef, Props>(({ localObj }, ref) => {
    const { formRef, filterRef } = localObj;
    const { isMobile } = useResponsive();

    // 整合所有表格相关状态
    const [state, setState] = useState<TableState>({
      roles: [],
      loading: false,
      page: 1,
      pageSize: 10,
      total: 0,
      filters: DEFAULT_FILTERS,
    });

    const { roles, loading, page, pageSize, total, filters } = state;
    const totalPages = Math.ceil(total / pageSize);

    // 删除确认对话框状态
    const [deleteDialog, setDeleteDialog] = useState<{
      open: boolean;
      id: number | null;
      name: string;
    }>({ open: false, id: null, name: '' });

    // 获取数据的核心函数
    const fetchRoles = useCallback(
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

          const res = await roleAPI.listFn({ data: requestData });
          const response = res.data;
          const rolesList = response?.data?.list || [];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            roles: rolesList,
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

    // 初始加载
    useEffect(() => {
      fetchRoles(DEFAULT_FILTERS, 1);
    }, [fetchRoles]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page; // 如果有新筛选条件，重置到第一页
          fetchRoles(filtersToUse, pageToUse);
        },
        getFilters: () => filters,
        getTotal: () => total,
      }),
      [fetchRoles, filters, page, total],
    );

    // 处理新增
    const handleAdd = () => {
      formRef.current?.openAdd();
    };

    // 处理编辑
    const handleEdit = (role: ListRole) => {
      formRef.current?.openEdit(role);
    };

    // 打开删除确认对话框
    const openDeleteDialog = (id: number, name: string) => {
      setDeleteDialog({ open: true, id, name });
    };

    // 关闭删除确认对话框
    const closeDeleteDialog = () => {
      setDeleteDialog({ open: false, id: null, name: '' });
    };

    // 确认删除
    const handleConfirmDelete = async () => {
      if (deleteDialog.id) {
        await roleAPI.deleteFn({ data: { id: deleteDialog.id } });
        fetchRoles(filters, page);
      }
      closeDeleteDialog();
    };

    // 处理分页
    const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
      fetchRoles(filters, newPage);
    };

    // 格式化时间
    const formatTime = (timestamp?: number | null) => {
      if (!timestamp) return '-';
      return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
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
          {roles.length > 0 ? (
            <Stack spacing={2}>
              {roles.map((role) => (
                <Card key={role.id} variant="outlined">
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="h6" component="div">
                          {role.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ID: {role.id}
                        </Typography>
                      </Box>
                      <Chip
                        label={role.isEnabled ? '已启用' : '已禁用'}
                        color={role.isEnabled ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>

                    {role.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {role.description}
                      </Typography>
                    )}

                    <Typography variant="caption" color="text.secondary" display="block">
                      创建时间: {formatTime(role.createTimeUtc)}
                    </Typography>

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <IconButton size="small" color="primary" onClick={() => handleEdit(role)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => openDeleteDialog(role.id!, role.name || '')}
                        disabled={role.id === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">暂无数据</Typography>
            </Paper>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="medium"
              />
            </Box>
          )}

          {/* 新增按钮 */}
          <Fab
            color="primary"
            aria-label="add"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={handleAdd}
          >
            <AddIcon />
          </Fab>

          {/* 删除确认对话框 */}
          <Dialog open={deleteDialog.open} onClose={closeDeleteDialog}>
            <DialogTitle>确认删除</DialogTitle>
            <DialogContent>
              <DialogContentText>
                确定要删除角色 "{deleteDialog.name}" 吗？此操作无法撤销。
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeDeleteDialog}>取消</Button>
              <Button onClick={handleConfirmDelete} color="error" autoFocus>
                删除
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      );
    }

    // 桌面端表格布局
    return (
      <Box>
        {/* 操作栏 */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
            新增角色
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>角色名称</TableCell>
                <TableCell>描述</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell>更新时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.length > 0 ? (
                roles.map((role) => (
                  <TableRow key={role.id} hover>
                    <TableCell>{role.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {role.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {role.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={role.isEnabled ? '已启用' : '已禁用'}
                        color={role.isEnabled ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatTime(role.createTimeUtc)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatTime(role.updateTimeUtc)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="编辑">
                        <IconButton size="small" color="primary" onClick={() => handleEdit(role)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openDeleteDialog(role.id!, role.name || '')}
                          disabled={role.id === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无数据</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 分页 */}
        {totalPages > 1 && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialog.open} onClose={closeDeleteDialog}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <DialogContentText>
              确定要删除角色 "{deleteDialog.name}" 吗？此操作无法撤销。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog}>取消</Button>
            <Button onClick={handleConfirmDelete} color="error" autoFocus>
              删除
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }),
);

RoleTable.displayName = 'RoleTable';

export default RoleTable;
