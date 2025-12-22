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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { User } from '../type';
import dayjs from 'dayjs';

interface UserTableProps {
  users: User[];
  loading: boolean;
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function UserTable({
  users,
  loading,
  onEdit,
  onDelete,
  page,
  pageSize,
  total,
  onPageChange,
}: UserTableProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const totalPages = Math.ceil(total / pageSize);

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
        {users.length > 0 ? (
          <Stack spacing={2}>
            {users.map((user) => (
              <Card key={user.id} variant="outlined">
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
                        {user.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        ID: {user.id}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <IconButton onClick={() => onEdit(user)} color="primary" size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => user.id && onDelete(user.id)}
                        disabled={user.id === 1}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      部门ID
                    </Typography>
                    <Typography variant="body1">{user.departmentId || '-'}</Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      角色ID
                    </Typography>
                    <Typography variant="body1">{user.roleIdArr?.join(', ') || '-'}</Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      创建时间
                    </Typography>
                    <Typography variant="body1">
                      {user.createTimeUtc
                        ? dayjs(user.createTimeUtc).format('YYYY-MM-DD HH:mm:ss')
                        : '暂无'}
                    </Typography>
                  </Box>

                  <Box>
                    <Chip
                      label={user.isEnabled ? '启用' : '禁用'}
                      color={user.isEnabled ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              暂无用户
            </Typography>
          </Box>
        )}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => onPageChange(value)}
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
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>用户名</TableCell>
            <TableCell>部门ID</TableCell>
            <TableCell>角色ID</TableCell>
            <TableCell>状态</TableCell>
            <TableCell>创建时间</TableCell>
            <TableCell align="center">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.length > 0 &&
            users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.departmentId || '-'}</TableCell>
                <TableCell>{user.roleIdArr?.join(', ') || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={user.isEnabled ? '启用' : '禁用'}
                    color={user.isEnabled ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {user.createTimeUtc
                    ? dayjs(user.createTimeUtc).format('YYYY-MM-DD HH:mm:ss')
                    : '暂无'}
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <IconButton onClick={() => onEdit(user)} color="primary" size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => user.id && onDelete(user.id)}
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
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => onPageChange(value)}
            color="primary"
          />
        </Box>
      )}
    </TableContainer>
  );
}
