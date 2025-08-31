import { useEffect, useState } from 'react';
import {
  listMailAccount,
  addMailAccount,
  updateMailAccount,
  deleteMailAccount,
  getMailAccount,
} from '@/api/mail';

export default function MailAccount() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    mailAddress: '',
    host: '',
    port: '',
    user: '',
    pass: '',
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await listMailAccount({ data: { pageNo: 1, pageSize: 100 } });
      setAccounts(res.data?.data?.list || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleEdit = (acc: any) => {
    setEditId(acc.id);
    setForm({
      name: acc.name,
      mailAddress: acc.mailAddress,
      host: acc.host,
      port: acc.port,
      user: acc.user,
      pass: acc.pass,
    });
  };

  const handleDelete = async (id: number) => {
    await deleteMailAccount({ data: { id } });
    fetchAccounts();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await updateMailAccount({ data: { id: editId, ...form } });
    } else {
      await addMailAccount({ data: form });
    }
    setEditId(null);
    setForm({ name: '', mailAddress: '', host: '', port: '', user: '', pass: '' });
    fetchAccounts();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>邮件账户管理</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <input
          placeholder="名称"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <input
          placeholder="邮箱地址"
          value={form.mailAddress}
          onChange={(e) => setForm((f) => ({ ...f, mailAddress: e.target.value }))}
          required
        />
        <input
          placeholder="SMTP主机"
          value={form.host}
          onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
          required
        />
        <input
          placeholder="端口"
          value={form.port}
          onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
          required
        />
        <input
          placeholder="用户名"
          value={form.user}
          onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
          required
        />
        <input
          placeholder="密码"
          value={form.pass}
          onChange={(e) => setForm((f) => ({ ...f, pass: e.target.value }))}
          required
        />
        <button type="submit">{editId ? '更新' : '新增'}</button>
        {editId && (
          <button
            type="button"
            onClick={() => {
              setEditId(null);
              setForm({ name: '', mailAddress: '', host: '', port: '', user: '', pass: '' });
            }}
          >
            取消
          </button>
        )}
      </form>
      {loading ? (
        <div>加载中...</div>
      ) : (
        <table border={1} cellPadding={8} style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>邮箱</th>
              <th>主机</th>
              <th>端口</th>
              <th>用户名</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length > 0 &&
              accounts.map((acc) => (
                <tr key={acc.id}>
                  <td>{acc.id}</td>
                  <td>{acc.name}</td>
                  <td>{acc.mailAddress}</td>
                  <td>{acc.host}</td>
                  <td>{acc.port}</td>
                  <td>{acc.user}</td>
                  <td>
                    <button onClick={() => handleEdit(acc)}>编辑</button>
                    <button onClick={() => handleDelete(acc.id)}>删除</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
