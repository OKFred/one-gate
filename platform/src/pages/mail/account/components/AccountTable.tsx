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
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface MailAccount {
  id?: number;
  mailAddress?: string;
  password?: string;
  nickname?: string;
  host?: string;
  port: number;
  sslEnable: boolean;
  starttlsEnable: boolean;
  createTimeUtc?: number;
  updateTimeUtc?: number | null;
}

interface AccountTableProps {
  accounts: MailAccount[];
  loading: boolean;
  onEdit: (account: MailAccount) => void;
  onDelete: (id: number) => void;
}

export default function AccountTable({ accounts, loading, onEdit, onDelete }: AccountTableProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
                    <Stack direction="row" spacing={1}>
                      <IconButton onClick={() => onEdit(acc)} color="primary" size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => acc.id && onDelete(acc.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
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
            <TableCell>昵称</TableCell>
            <TableCell>邮箱</TableCell>
            <TableCell>主机</TableCell>
            <TableCell>端口</TableCell>
            <TableCell>账户所有者</TableCell>
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
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <IconButton onClick={() => onEdit(acc)} color="primary" size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => acc.id && onDelete(acc.id)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
