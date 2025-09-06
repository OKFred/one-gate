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
  accountOwner?: string;
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
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

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
                <TableCell>{acc.accountOwner}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <IconButton 
                      onClick={() => onEdit(acc)}
                      color="primary"
                      size="small"
                    >
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
