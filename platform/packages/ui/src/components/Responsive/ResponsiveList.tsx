import { memo, useState, useCallback, useRef, type ReactNode } from 'react';
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
import { useTranslation } from '@/hooks/useTranslation';

const ExpandableContent = ({ children }: { children: ReactNode }) => {
  const [expanded, setExpanded] = useState(false);
  const lastTapRef = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setExpanded((prev) => !prev);
    }
    lastTapRef.current = now;
  }, []);

  return (
    <Box
      onClick={handleTap}
      sx={{
        display: expanded ? 'block' : '-webkit-box',
        WebkitLineClamp: expanded ? 'unset' : 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        width: 'max-content',
        maxWidth: '100%',
      }}
    >
      {children}
    </Box>
  );
};

/** 表格列配置 */
export interface TableColumn<T> {
  /** 列标题 */
  title: string;
  /** 列宽 */
  width?: number | string;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 是否固定列 */
  fixed?: 'left' | 'right';
  /** 是否为操作列（宽度自适应且不截断文本） */
  isAction?: boolean;
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
  emptyText,
  extraContent,
}: ResponsiveListProps<T>) {
  const { isMobile } = useResponsive();
  const t = useTranslation();
  if (!emptyText) {
    emptyText = t('column.noData');
  }
  const totalPages = Math.ceil(total / pageSize);

  // 加载状态
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
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
              {t('table.pageSizeLabel')}:
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
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
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
    <TableContainer
      component={Paper}
      sx={{
        position: 'relative',
        '&::-webkit-scrollbar': { height: 8, width: 8 },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'action.disabled',
          borderRadius: 4,
          '&:hover': { backgroundColor: 'action.active' },
        },
        '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((col, index) => {
              const isFixed = !!col.fixed;
              const isFixedLeft = col.fixed === 'left';
              const isFixedRight = col.fixed === 'right';
              const isActionCol = col.isAction || isFixedRight;
              const fixedStyles = isFixed
                ? {
                    position: 'sticky',
                    ...(isFixedLeft ? { left: 0 } : { right: 0 }),
                    zIndex: 11,
                    backgroundColor: 'background.paper',
                    ...(isFixedLeft && { borderRight: '1px solid', borderColor: 'divider' }),
                    ...(isFixedRight && { borderLeft: '1px solid', borderColor: 'divider' }),
                  }
                : {};
              return (
                <TableCell
                  key={index}
                  align={col.align}
                  width={col.width}
                  sx={{
                    ...(isActionCol
                      ? {
                          whiteSpace: 'nowrap',
                          width: col.width || '1%',
                          '& .MuiButtonBase-root': { minWidth: 50 },
                        }
                      : { minWidth: 100, maxWidth: '50vw' }),
                    ...fixedStyles,
                  }}
                >
                  {isActionCol ? col.title : <ExpandableContent>{col.title}</ExpandableContent>}
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((item, rowIndex) => (
            <TableRow key={keyExtractor(item)} hover>
              {columns.map((col, colIndex) => {
                const isFixed = !!col.fixed;
                const isFixedLeft = col.fixed === 'left';
                const isFixedRight = col.fixed === 'right';
                const isActionCol = col.isAction || isFixedRight;
                const fixedStyles = isFixed
                  ? {
                      position: 'sticky',
                      ...(isFixedLeft ? { left: 0 } : { right: 0 }),
                      zIndex: 10,
                      backgroundColor: 'background.paper',
                      ...(isFixedLeft && { borderRight: '1px solid', borderColor: 'divider' }),
                      ...(isFixedRight && { borderLeft: '1px solid', borderColor: 'divider' }),
                    }
                  : {};
                return (
                  <TableCell
                    key={colIndex}
                    align={col.align}
                    sx={{
                      ...(isActionCol
                        ? {
                            whiteSpace: 'nowrap',
                            width: col.width || '1%',
                            '& .MuiButtonBase-root': { minWidth: 50 },
                          }
                        : { minWidth: 100, maxWidth: '50vw' }),
                      ...fixedStyles,
                    }}
                  >
                    {isActionCol ? (
                      col.render(item, rowIndex)
                    ) : (
                      <ExpandableContent>{col.render(item, rowIndex)}</ExpandableContent>
                    )}
                  </TableCell>
                );
              })}
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
