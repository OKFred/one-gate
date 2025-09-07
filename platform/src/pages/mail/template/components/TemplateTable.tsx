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
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

interface MailTemplate {
  id?: number;
  name?: string;
  title?: string;
  langCode?: string;
  content?: string;
  creatorName?: string;
  category?: string;
  createTimeUtc?: number;
  updateTimeUtc?: number | null;
}

interface TemplateTableProps {
  templates: MailTemplate[];
  loading: boolean;
  onEdit: (template: MailTemplate) => void;
  onDelete: (id: number) => void;
  onPreview?: (template: MailTemplate) => void;
}

export default function TemplateTable({
  templates,
  loading,
  onEdit,
  onDelete,
  onPreview,
}: TemplateTableProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
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
      <Box sx={{ mt: 2, mb: 8 }}>
        {templates.length > 0 ? (
          <Stack spacing={2}>
            {templates.map((template) => (
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
                        ID: {template.id} | 名称: {template.name}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {onPreview && (
                        <IconButton onClick={() => onPreview(template)} color="info" size="small">
                          <ViewIcon />
                        </IconButton>
                      )}
                      <IconButton onClick={() => onEdit(template)} color="primary" size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => template.id && onDelete(template.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      内容预览
                    </Typography>
                    <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                      {truncateText(stripHtml(template.content), 100)}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      创建者
                    </Typography>
                    <Typography variant="body1">{template.creatorName}</Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      创建时间
                    </Typography>
                    <Typography variant="body1">{formatDate(template.createTimeUtc)}</Typography>
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
              暂无邮件模板
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // 桌面端表格布局
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>模板名称</TableCell>
            <TableCell>邮件标题</TableCell>
            <TableCell>内容预览</TableCell>
            <TableCell>创建者</TableCell>
            <TableCell>语言/分类</TableCell>
            <TableCell>创建时间</TableCell>
            <TableCell align="center">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {templates.length > 0 &&
            templates.map((template) => (
              <TableRow key={template.id} hover>
                <TableCell>{template.id}</TableCell>
                <TableCell>
                  <Tooltip title={template.name} arrow>
                    <Typography variant="body2" sx={{ maxWidth: 120 }}>
                      {truncateText(template.name, 15)}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip title={template.title} arrow>
                    <Typography variant="body2" sx={{ maxWidth: 150 }}>
                      {truncateText(template.title, 20)}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip title={stripHtml(template.content)} arrow>
                    <Typography variant="body2" sx={{ maxWidth: 200 }}>
                      {truncateText(stripHtml(template.content), 30)}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>{template.creatorName}</TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    {template.langCode && (
                      <Chip label={template.langCode} color="info" size="small" />
                    )}
                    {template.category && (
                      <Chip label={template.category} color="secondary" size="small" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatDate(template.createTimeUtc)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    {onPreview && (
                      <Tooltip title="预览" arrow>
                        <IconButton onClick={() => onPreview(template)} color="info" size="small">
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="编辑" arrow>
                      <IconButton onClick={() => onEdit(template)} color="primary" size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除" arrow>
                      <IconButton
                        onClick={() => template.id && onDelete(template.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
