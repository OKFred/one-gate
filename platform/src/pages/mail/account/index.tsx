import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Stack,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  listMailAccount,
  addMailAccount,
  updateMailAccount,
  deleteMailAccount,
} from '@/api/mail';

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

export default function MailAccount() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    nickname: '',
    mailAddress: '',
    host: '',
    port: '587',
    accountOwner: '',
    password: '',
    sslEnable: false,
    starttlsEnable: true,
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await listMailAccount({ data: { pageNo: 1, pageSize: 100 } });
      const accountsList = (res.data as { data?: { list?: MailAccount[] } })?.data?.list || [];
      setAccounts(accountsList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleEdit = (acc: MailAccount) => {
    setEditId(acc.id!);
    setForm({
      nickname: acc.nickname || '',
      mailAddress: acc.mailAddress || '',
      host: acc.host || '',
      port: acc.port?.toString() || '587',
      accountOwner: acc.accountOwner || '',
      password: acc.password || '',
      sslEnable: acc.sslEnable || false,
      starttlsEnable: acc.starttlsEnable || true,
    });
  };

  const handleDelete = async (id: number) => {
    await deleteMailAccount({ data: { id } });
    fetchAccounts();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = {
      ...form,
      port: parseInt(form.port, 10),
    };
    
    if (editId) {
      await updateMailAccount({ data: { id: editId, ...formData } });
    } else {
      await addMailAccount({ data: formData });
    }
    setEditId(null);
    setForm({ 
      nickname: '', 
      mailAddress: '', 
      host: '', 
      port: '587', 
      accountOwner: '', 
      password: '',
      sslEnable: false,
      starttlsEnable: true,
    });
    fetchAccounts();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        邮件账户管理
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="昵称"
                  value={form.nickname}
                  onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="邮箱地址"
                  type="email"
                  value={form.mailAddress}
                  onChange={(e) => setForm((f) => ({ ...f, mailAddress: e.target.value }))}
                  required
                  fullWidth
                />
              </Stack>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="SMTP主机"
                  value={form.host}
                  onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="端口"
                  type="number"
                  value={form.port}
                  onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                  required
                  fullWidth
                />
              </Stack>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="账户所有者"
                  value={form.accountOwner}
                  onChange={(e) => setForm((f) => ({ ...f, accountOwner: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="密码"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  fullWidth
                />
              </Stack>
              
              <Stack direction="row" spacing={2}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                >
                  {editId ? '更新' : '新增'}
                </Button>
                {editId && (
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => {
                      setEditId(null);
                      setForm({ 
                        nickname: '', 
                        mailAddress: '', 
                        host: '', 
                        port: '587', 
                        accountOwner: '', 
                        password: '',
                        sslEnable: false,
                        starttlsEnable: true,
                      });
                    }}
                  >
                    取消
                  </Button>
                )}
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
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
                          onClick={() => handleEdit(acc)}
                          color="primary"
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          onClick={() => acc.id && handleDelete(acc.id)}
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
      )}
    </Container>
  );
}
