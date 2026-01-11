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
import * as LanguageAPI from '@/api/i18n/language';
import type { ListLanguageReq, ListLanguageRes } from '@/api/i18n/type';
import type { Props } from '../index';
import type { FilterState } from './TheFilter';
import { useResponsive } from '@/hooks/useResponsive';
import dayjs from 'dayjs';

// 暴露给父组件的方法
export interface TheTableRef {
  /** 刷新表格数据 */
  refresh: (filters?: FilterState) => void;
  /** 获取当前筛选条件 */
  getFilters: () => FilterState;
  /** 获取当前总数 */
  getTotal: () => number;
}

// 表格内部状态
export interface TableState {
  list: NonNullable<ListLanguageRes['list']>;
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
  application: undefined,
  business: undefined,
  langCode: undefined,
  isEnabled: undefined,
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { formRef, filterRef } = localObj;
    const { isMobile } = useResponsive();

    // 整合所有表格相关状态
    const [state, setState] = useState<TableState>({
      list: [],
      loading: false,
      page: 1,
      pageSize: 10,
      total: 0,
      filters: DEFAULT_FILTERS,
    });

    const { list, loading, page, pageSize, total, filters } = state;
    const totalPages = Math.ceil(total / pageSize);

    // 删除确认对话框状态
    const [deleteDialog, setDeleteDialog] = useState<{
      open: boolean;
      id: number | null;
      tKey: string;
    }>({ open: false, id: null, tKey: '' });

    // 获取数据的核心函数
    const fetchLanguages = useCallback(
      async (searchFilters: FilterState, currentPage: number = 1) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData: ListLanguageReq = {
            pageNo: currentPage,
            pageSize: state.pageSize,
            orderBy: searchFilters.orderBy,
            isEnabled: searchFilters.isEnabled,
            descend: searchFilters.descend,
          };

          if (searchFilters.keyword) {
            requestData.keyword = searchFilters.keyword;
          }
          if (searchFilters.application) {
            requestData.application = searchFilters.application;
          }
          if (searchFilters.business) {
            requestData.business = searchFilters.business;
          }
          if (searchFilters.langCode) {
            requestData.langCode = searchFilters.langCode;
          }
          if (searchFilters.isEnabled !== undefined) {
            requestData.isEnabled = searchFilters.isEnabled;
          }

          const res = await LanguageAPI.listFn({ data: requestData });
          const response = res.data;
          const list = response?.data?.list || [];
          const totalCount = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            list: list,
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
      fetchLanguages(DEFAULT_FILTERS, 1);
    }, [fetchLanguages]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || filters;
          const pageToUse = newFilters ? 1 : page; // 如果有新筛选条件，重置到第一页
          fetchLanguages(filtersToUse, pageToUse);
        },
        getFilters: () => filters,
        getTotal: () => total,
      }),
      [fetchLanguages, filters, page, total],
    );

    // 处理新增
    const handleAdd = () => {
      formRef.current?.openAdd();
    };

    // 处理编辑
    const handleEdit = (row: TableState['list'][0]) => {
      formRef.current?.openEdit(row);
    };

    // 打开删除确认对话框
    const openDeleteDialog = (id: number, tKey: string) => {
      setDeleteDialog({ open: true, id, tKey });
    };

    // 关闭删除确认对话框
    const closeDeleteDialog = () => {
      setDeleteDialog({ open: false, id: null, tKey: '' });
    };

    // 确认删除
    const handleConfirmDelete = async () => {
      if (deleteDialog.id) {
        await LanguageAPI.deleteFn({ data: { id: deleteDialog.id } });
        fetchLanguages(filters, page);
      }
      closeDeleteDialog();
    };

    // 处理分页
    const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
      fetchLanguages(filters, newPage);
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
          {list.length > 0 ? (
            <Stack spacing={2}>
              {list.map((row) => (
                <Card key={row.id} variant="outlined">
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
                        <Typography variant="h6" component="div" sx={{ mb: 0.5 }}>
                          {row.tKey}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          <Chip
                            label={row.application}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            label={row.business}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                          <Chip label={row.langCode} size="small" variant="outlined" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          ID: {row.id}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {row.tValue}
                    </Typography>

                    {row.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mb: 1 }}
                      >
                        描述: {row.description}
                      </Typography>
                    )}

                    <Box sx={{ mb: 1 }}>
                      <Chip
                        label={row.isEnabled ? '已启用' : '已禁用'}
                        size="small"
                        color={row.isEnabled ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>

                    <Typography variant="caption" color="text.secondary" display="block">
                      创建时间: {formatTime(row.createTimeUtc)}
                    </Typography>

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <IconButton size="small" color="primary" onClick={() => handleEdit(row)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => openDeleteDialog(row.id!, row.tKey || '')}
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
                确定要删除翻译键 "{deleteDialog.tKey}" 吗？此操作无法撤销。
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
            新增翻译
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>应用</TableCell>
                <TableCell>业务</TableCell>
                <TableCell>语言</TableCell>
                <TableCell>翻译键</TableCell>
                <TableCell>翻译值</TableCell>
                <TableCell>描述</TableCell>
                <TableCell>启用状态</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length > 0 ? (
                list.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.application}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.business}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={row.langCode} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {row.tKey}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.tValue}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          maxWidth: 150,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.isEnabled ? '已启用' : '已禁用'}
                        size="small"
                        color={row.isEnabled ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatTime(row.createTimeUtc)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="编辑">
                        <IconButton size="small" color="primary" onClick={() => handleEdit(row)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openDeleteDialog(row.id!, row.tKey || '')}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
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
              确定要删除翻译键 "{deleteDialog.tKey}" 吗？此操作无法撤销。
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

export default TheTable;
