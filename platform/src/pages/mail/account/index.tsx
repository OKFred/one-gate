import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import {
  listMailAccount,
  addMailAccount,
  updateMailAccount,
  deleteMailAccount,
} from '@/api/mail';
import AccountForm from './components/AccountForm';
import AccountTable from './components/AccountTable';

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
  const [open, setOpen] = useState(false);
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
    setOpen(true);
  };

  const handleAdd = () => {
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
    setOpen(true);
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
    handleCancel();
    fetchAccounts();
  };

  const handleCancel = () => {
    setEditId(null);
    setOpen(false);
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
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          邮件账户管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          新增账户
        </Button>
      </Box>
      
      <AccountForm
        open={open}
        form={form}
        editId={editId}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />

      <AccountTable
        accounts={accounts}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </Container>
  );
}
