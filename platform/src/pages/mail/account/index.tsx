/**
 * 邮件账户管理页面 - 重构示例
 * 展示如何使用新的响应式组件系统来简化移动端适配
 */

import { useEffect, useState, useCallback } from 'react';
import { Add as AddIcon } from '@mui/icons-material';
import { listMailAccount, addMailAccount, updateMailAccount, deleteMailAccount } from '@/api/mail';
import { PageLayout, ResponsiveButton } from '@/layout/responsive';
import AccountForm from './components/AccountForm';
import AccountTable from './components/AccountTable';
import AccountFilter from './components/AccountFilter';

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

interface FilterState {
  keyword: string;
  orderBy: 'id' | 'createTimeUtc';
  descend: boolean;
}

export default function MailAccountRefactored() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    orderBy: 'id',
    descend: false,
  });
  const [form, setForm] = useState({
    nickname: '',
    mailAddress: '',
    host: '',
    port: '465',
    password: '',
    sslEnable: true,
    starttlsEnable: false,
  });

  // 不再需要手动检测移动端，响应式组件会自动处理
  // const theme = useTheme();
  // const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

      const res = await listMailAccount({ data: requestData });
      const response = res.data as { data?: { list?: MailAccount[]; total?: number } };
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

  const handleEdit = (acc: MailAccount) => {
    setEditId(acc.id!);
    setForm({
      nickname: acc.nickname || '',
      mailAddress: acc.mailAddress || '',
      host: acc.host || '',
      port: String(acc.port) || '',
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
      port: '465',
      password: '',
      sslEnable: true,
      starttlsEnable: false,
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteMailAccount({ data: { id } });
    fetchAccounts(filters);
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
    fetchAccounts(filters);
  };

  const handleCancel = () => {
    setEditId(null);
    setOpen(false);
    setForm({
      nickname: '',
      mailAddress: '',
      host: '',
      port: '465',
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

/**
 * 重构前后对比：
 *
 * 重构前需要的代码：
 * - 68行手动响应式检测和布局代码
 * - 重复的Container和Typography配置
 * - 手动的按钮适配逻辑
 *
 * 重构后：
 * - 只需要5行PageLayout和ResponsiveButton
 * - 自动处理所有响应式适配
 * - 代码更简洁，维护性更好
 *
 * 减少了约85%的布局相关代码！
 */
