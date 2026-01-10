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
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { ListUserRes, TreeDepartmentRes } from '@/api/system/type';
import dayjs from 'dayjs';
import { useResponsive } from '@/hooks/useResponsive';

interface UserTableProps {
  list: NonNullable<ListUserRes['list']>;
  loading: boolean;
  onEdit: (row: NonNullable<ListUserRes['list']>[0]) => void;
  onDelete: (id: number) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  roleOptions: { value: number; label: string }[];
  departmentTree: TreeDepartmentRes;
}

export default function UserTable({
  list,
  loading,
  onEdit,
  onDelete,
  page,
  pageSize,
  total,
  onPageChange,
  roleOptions,
  departmentTree,
}: UserTableProps) {
  const { isMobile } = useResponsive();

  const totalPages = Math.ceil(total / pageSize);

  // 根据部门ID获取部门名称
  const getDepartmentName = (departmentId: number | null | undefined): string => {
    if (!departmentId) return '--';
    const findDepartment = (tree: TreeDepartmentRes, id: number) => {
      for (const node of tree) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findDepartment(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    const department = findDepartment(departmentTree, departmentId);
    return department?.name || '--';
  };

  // 根据角色ID数组获取角色名称数组
  const getRoleNames = (roleIds: number[] | null | undefined): string => {
    if (!roleIds || roleIds.length === 0) return '--';
    const names = roleIds
      .map((id) => roleOptions.find((role) => role.value === id)?.label)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : '--';
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
                      <Typography variant="h6" component="div" gutterBottom>
                        {row.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        ID: {row.id}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <IconButton onClick={() => onEdit(row)} color="primary" size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => row.id && onDelete(row.id)}
                        disabled={row.id === 1}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      部门
                    </Typography>
                    <Typography variant="body1">{getDepartmentName(row.departmentId)}</Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      角色
                    </Typography>
                    <Typography variant="body1">{getRoleNames(row.roleIdArr)}</Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      创建时间
                    </Typography>
                    <Typography variant="body1">
                      {row.createTimeUtc
                        ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss')
                        : '暂无'}
                    </Typography>
                  </Box>

                  <Box>
                    <Chip
                      label={row.isEnabled ? '启用' : '禁用'}
                      color={row.isEnabled ? 'success' : 'error'}
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
            <TableCell>部门</TableCell>
            <TableCell>角色</TableCell>
            <TableCell>状态</TableCell>
            <TableCell>创建时间</TableCell>
            <TableCell align="center">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {list.length > 0 &&
            list.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.username}</TableCell>
                <TableCell>{getDepartmentName(row.departmentId)}</TableCell>
                <TableCell>{getRoleNames(row.roleIdArr)}</TableCell>
                <TableCell>
                  <Chip
                    label={row.isEnabled ? '启用' : '禁用'}
                    color={row.isEnabled ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {row.createTimeUtc
                    ? dayjs(row.createTimeUtc).format('YYYY-MM-DD HH:mm:ss')
                    : '暂无'}
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <IconButton onClick={() => onEdit(row)} color="primary" size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => row.id && onDelete(row.id)}
                      color="error"
                      size="small"
                      disabled={row.id === 1}
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
