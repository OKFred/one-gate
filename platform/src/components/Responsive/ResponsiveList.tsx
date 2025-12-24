import { memo, type ReactNode } from 'react';
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
  Pagination,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import { useResponsive } from '@/hooks/useResponsive';

/** 表格列配置 */
export interface TableColumn<T> {
  /** 列标题 */
  title: string;
  /** 列宽 */
  width?: number | string;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 渲染单元格内容 */
  render: (item: T, index: number) => ReactNode;
}

/** 卡片字段配置 */
export interface CardField<T> {
  /** 字段标签（为空则不显示标签） */
  label?: string;
  /** 字段类型 */
  type?: 'title' | 'subtitle' | 'content' | 'tags';
  /** 渲染字段内容 */
  render: (item: T) => ReactNode;
}

/** ResponsiveList 组件属性 */
export interface ResponsiveListProps<T> {
  /** 数据列表 */
  data: T[];
  /** 是否加载中 */
  loading?: boolean;
  /** 当前页码 */
  page: number;
  /** 总数量 */
  total: number;
  /** 每页数量 */
  pageSize: number;
  /** 页码改变回调 */
  onPageChange: (page: number) => void;
  /** 每页数量改变回调 */
  onPageSizeChange?: (pageSize: number) => void;
  /** 获取每行的唯一 key */
  keyExtractor: (item: T) => string | number;
  /** 表格列配置（PC端） */
  columns: TableColumn<T>[];
  /** 卡片字段配置（移动端） */
  cardFields: CardField<T>[];
  /** 卡片操作按钮（移动端） */
  cardActions?: (item: T) => ReactNode;
  /** 空数据提示文字 */
  emptyText?: string;
  /** 额外内容（如删除确认对话框） */
  extraContent?: ReactNode;
}

/** 通用响应式列表组件 - 支持 PC 表格和移动端卡片布局 */
function ResponsiveListInner<T>({
  data,
  loading = false,
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  keyExtractor,
  columns,
  cardFields,
  cardActions,
  emptyText = '暂无数据',
  extraContent,
}: ResponsiveListProps<T>) {
  const { isMobile } = useResponsive();

  const totalPages = Math.ceil(total / pageSize);

  // 加载状态
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  // 空数据状态
  if (data.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="body1" color="text.secondary">
          {emptyText}
        </Typography>
      </Box>
    );
  }

  // 分页组件
  const pageSizeOptions = [5, 10, 20, 50, 100];
  const PaginationComponent =
    totalPages > 1 || (onPageSizeChange && pageSizeOptions.length > 0) ? (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 2,
          mt: isMobile ? 0 : undefined,
          gap: 2,
        }}
      >
        {onPageSizeChange && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              每页条数：
            </Typography>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                displayEmpty
              >
                {pageSizeOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => onPageChange(value)}
          color="primary"
          size={isMobile ? 'medium' : 'medium'}
        />
      </Box>
    ) : null;

  // 移动端卡片布局
  if (isMobile) {
    return (
      <Box sx={{ mt: 2, mb: 8, position: 'relative' }}>
        <Stack spacing={2}>
          {data.map((item) => {
            const titleField = cardFields.find((f) => f.type === 'title');
            const subtitleField = cardFields.find((f) => f.type === 'subtitle');
            const contentFields = cardFields.filter(
              (f) => f.type === 'content' || f.type === undefined,
            );
            const tagsField = cardFields.find((f) => f.type === 'tags');

            return (
              <Card key={keyExtractor(item)} variant="outlined">
                <CardContent>
                  {/* 头部：标题 + 操作按钮 */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      {titleField && (
                        <Typography variant="h6" component="div" gutterBottom>
                          {titleField.render(item)}
                        </Typography>
                      )}
                      {subtitleField && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {subtitleField.label && `${subtitleField.label}: `}
                          {subtitleField.render(item)}
                        </Typography>
                      )}
                    </Box>
                    {cardActions && (
                      <Stack direction="row" spacing={1}>
                        {cardActions(item)}
                      </Stack>
                    )}
                  </Box>

                  {/* 内容字段 */}
                  {contentFields.map((field, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      {field.label && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {field.label}
                        </Typography>
                      )}
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                        {field.render(item)}
                      </Typography>
                    </Box>
                  ))}

                  {/* 标签区域 */}
                  {tagsField && (
                    <Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {tagsField.render(item)}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
        {PaginationComponent}
        {extraContent}
      </Box>
    );
  }

  // PC端表格布局
  return (
    <TableContainer component={Paper} sx={{ position: 'relative' }}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((col, index) => (
              <TableCell key={index} align={col.align} width={col.width}>
                {col.title}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item, rowIndex) => (
            <TableRow key={keyExtractor(item)} hover>
              {columns.map((col, colIndex) => (
                <TableCell key={colIndex} align={col.align}>
                  {col.render(item, rowIndex)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {PaginationComponent}
      {extraContent}
    </TableContainer>
  );
}

// 使用 memo 优化性能，保留泛型支持
const ResponsiveList = memo(ResponsiveListInner) as typeof ResponsiveListInner;

export default ResponsiveList;
