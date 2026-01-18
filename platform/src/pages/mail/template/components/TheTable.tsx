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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import * as MailTemplateAPI from '@/api/mail/template';
import { showGlobalNotification } from '@/components/Notification';
import type { ListMailTemplateReq, ListMailTemplateRes } from '@/api/mail/type';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';

// 筛选状态类型
export interface FilterState {
  keyword: string;
  orderBy: NonNullable<ListMailTemplateReq['orderBy']>;
  descend: boolean;
}

// 表格内部状态
export interface TableState {
  list: NonNullable<ListMailTemplateRes['list']>;
  loading: boolean;
  filters: FilterState;
}

// 暴露给父组件的方法
export interface TheTableRef {
  /** 刷新表格数据 */
  refresh: (filters?: FilterState) => void;
}

const DEFAULT_FILTERS: FilterState = {
  keyword: '',
  orderBy: 'id',
  descend: false,
};

const TheTable = memo(
  forwardRef<TheTableRef, Props>(({ localObj }, ref) => {
    const { filterRef, formRef, previewRef } = localObj;
    const { isMobile } = useResponsive();
    const t = useTranslation();
    const [state, setState] = useState<TableState>({
      list: [],
      loading: false,
      filters: DEFAULT_FILTERS,
    });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const { list, loading } = state;

    // 获取数据的核心函数
    const fetchTemplates = useCallback(
      async (searchFilters: FilterState) => {
        setState((prev) => ({ ...prev, loading: true }));
        try {
          const requestData = {
            pageNo: 1,
            pageSize: 100,
            ...(searchFilters.keyword && { keyword: searchFilters.keyword }),
            orderBy: searchFilters.orderBy,
            descend: searchFilters.descend,
          };

          const res = await MailTemplateAPI.listFn({ data: requestData });
          const response = res.data;
          const templatesList = response?.data?.list || [];
          const total = response?.data?.total || 0;

          setState((prev) => ({
            ...prev,
            list: templatesList,
            filters: searchFilters,
            loading: false,
          }));

          // 通知筛选组件更新数量
          filterRef.current?.updateCount(total);
        } catch {
          setState((prev) => ({ ...prev, loading: false }));
        }
      },
      [filterRef],
    );

    // 初始加载
    useEffect(() => {
      fetchTemplates(DEFAULT_FILTERS);
    }, [fetchTemplates]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        refresh: (newFilters?: FilterState) => {
          const filtersToUse = newFilters || DEFAULT_FILTERS;
          fetchTemplates(filtersToUse);
        },
      }),
      [fetchTemplates],
    );

    const formatDate = (timestamp?: number) => {
      if (!timestamp) return '-';
      return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
    };

    const truncateText = (text?: string, maxLength: number = 50) => {
      if (!text) return '-';
      return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    };

    const stripHtml = (html?: string) => {
      if (!html) return '-';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || '';
    };

    const handleEdit = (template: NonNullable<ListMailTemplateRes['list']>[0]) => {
      formRef.current?.onOpen(template);
    };

    const handlePreview = (template: NonNullable<ListMailTemplateRes['list']>[0]) => {
      previewRef.current?.onOpen(template);
    };

    const handleDeleteClick = (id: number) => {
      setDeleteId(id);
      setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
      if (!deleteId) return;

      try {
        const res = await MailTemplateAPI.deleteFn({ data: { id: deleteId } });
        if (res.data?.ok) {
          showGlobalNotification({
            message: t('mail.template.deleteSuccess'),
            type: 'success',
          });
          fetchTemplates(DEFAULT_FILTERS);
        } else {
          showGlobalNotification({
            message: res.data?.message || t('mail.template.deleteFailed'),
            type: 'error',
          });
        }
      } catch (error) {
        console.error('删除模板失败:', error);
        showGlobalNotification({
          message: t('mail.template.deleteFailed'),
          type: 'error',
        });
      } finally {
        setDeleteDialogOpen(false);
        setDeleteId(null);
      }
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
        <>
          <Box sx={{ mt: 2, mb: 8 }}>
            {list.length > 0 ? (
              <Stack spacing={2}>
                {list.map((template) => (
                  <Card key={template.id} variant="outlined">
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
                            {template.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            ID: {template.id} | {template.name}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            onClick={() => handlePreview(template)}
                            color="info"
                            size="small"
                          >
                            <ViewIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleEdit(template)}
                            color="primary"
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => template.id && handleDeleteClick(template.id)}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {t('mail.template.columns.preview')}
                        </Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                          {truncateText(stripHtml(template.content), 100)}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {t('common.columns.createTime')}
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(template.createTimeUtc)}
                        </Typography>
                      </Box>

                      <Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {template.langCode && (
                            <Chip label={template.langCode} color="info" size="small" />
                          )}
                          {template.category && (
                            <Chip label={template.category} color="secondary" size="small" />
                          )}
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body1" color="text.secondary">
                  {t('mail.template.empty')}
                </Typography>
              </Box>
            )}
          </Box>

          {/* 删除确认对话框 */}
          <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
            <DialogTitle>{t('common.confirm')}</DialogTitle>
            <DialogContent>
              <Typography>{t('mail.template.deleteConfirm')}</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                {t('common.delete')}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      );
    }

    // 桌面端表格布局
    return (
      <>
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('common.columns.id')}</TableCell>
                <TableCell>{t('mail.template.columns.title')}</TableCell>
                <TableCell>{t('mail.template.columns.name')}</TableCell>
                <TableCell>{t('mail.template.columns.preview')}</TableCell>
                <TableCell>{t('common.columns.createTime')}</TableCell>
                <TableCell align="center">{t('common.columns.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length > 0 &&
                list.map((template) => (
                  <TableRow key={template.id} hover>
                    <TableCell>{template.id}</TableCell>
                    <TableCell>
                      <Tooltip title={template.title || ''}>
                        <span>{truncateText(template.title, 30)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={template.name || ''}>
                        <span>{truncateText(template.name, 20)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{truncateText(stripHtml(template.content), 40)}</TableCell>
                    <TableCell>{formatDate(template.createTimeUtc)}</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => handlePreview(template)} color="info" size="small">
                        <ViewIcon />
                      </IconButton>
                      <IconButton onClick={() => handleEdit(template)} color="primary" size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => template.id && handleDeleteClick(template.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>{t('common.confirm')}</DialogTitle>
          <DialogContent>
            <Typography>{t('mail.template.deleteConfirm')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              {t('common.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }),
);

TheTable.displayName = 'TheTable';

export default TheTable;
