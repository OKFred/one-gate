import { useEffect, useState, useCallback } from 'react';
import { Add as AddIcon } from '@mui/icons-material';
import * as mailAccountAPI from '@/api/mail/account';
import { PageLayout, ResponsiveButton } from '@/layout/responsive';
import AccountForm from './components/AccountForm';
import AccountTable from './components/AccountTable';
import AccountFilter from './components/AccountFilter';
import type { FilterState, ListMailAccount, AddMailAccountRequest } from './type';

export default function MailAccountRefactored() {
  const [accounts, setAccounts] = useState<ListMailAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    orderBy: 'id',
    descend: false,
  });
  const [form, setForm] = useState<AddMailAccountRequest>({
    nickname: '',
    mailAddress: '',
    host: '',
    port: 465,
    password: '',
    sslEnable: true,
    starttlsEnable: false,
  });

  const fetchAccounts = useCallback(async (searchParams: FilterState) => {
    setLoading(true);
    try {
      const requestData = {
        pageNo: 1,
        pageSize: 100,
        ...(searchParams.keyword && { keyword: searchParams.keyword }),
        orderBy: searchParams.orderBy,
        descend: searchParams.descend,
      };

      const res = await mailAccountAPI.listFn({ data: requestData });
      const response = res.data;
      const accountsList = response?.data?.list || [];
      const total = response?.data?.total || 0;

      setAccounts(accountsList);
      setTotalCount(total);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      fetchAccounts(newFilters);
    },
    [fetchAccounts],
  );

  useEffect(() => {
    fetchAccounts({
      keyword: '',
      orderBy: 'id',
      descend: false,
    });
  }, [fetchAccounts]);

  const handleEdit = (acc: ListMailAccount) => {
    setEditId(acc.id!);
    setForm({
      nickname: acc.nickname || '',
      mailAddress: acc.mailAddress || '',
      host: acc.host || '',
      port: acc.port,
      password: acc.password || '',
      sslEnable: acc.sslEnable,
      starttlsEnable: acc.starttlsEnable,
    });
    setOpen(true);
  };

  const handleAdd = () => {
    setEditId(null);
    setForm({
      nickname: '',
      mailAddress: '',
      host: '',
      port: 465,
      password: '',
      sslEnable: true,
      starttlsEnable: false,
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    await mailAccountAPI.deleteFn({ data: { id } });
    fetchAccounts(filters);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = {
      ...form,
      port: form.port,
    };

    if (editId) {
      await mailAccountAPI.updateFn({ data: { id: editId, ...formData } });
    } else {
      await mailAccountAPI.addFn({ data: formData });
    }
    handleCancel();
    fetchAccounts(filters);
  };

  const handleCancel = () => {
    setEditId(null);
    setOpen(false);
    setForm({
      nickname: '',
      mailAddress: '',
      host: '',
      port: 465,
      password: '',
      sslEnable: true,
      starttlsEnable: false,
    });
  };

  return (
    <PageLayout
      title="邮件账户管理"
      actions={
        <ResponsiveButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
          新增账户
        </ResponsiveButton>
      }
    >
      {/* 筛选组件 */}
      <AccountFilter onFilterChange={handleFilterChange} filterCount={totalCount} />

      {/* 表单对话框 */}
      <AccountForm
        open={open}
        form={form}
        editId={editId}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />

      {/* 数据表格 */}
      <AccountTable
        accounts={accounts}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </PageLayout>
  );
}
