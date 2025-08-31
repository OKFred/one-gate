import { useEffect, useState } from 'react';
import {
  listMailTemplate,
  addMailTemplate,
  updateMailTemplate,
  deleteMailTemplate,
} from '@/api/mail';

export default function MailTemplate() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await listMailTemplate({ data: {} });
      setTemplates(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleEdit = (tpl: any) => {
    setEditId(tpl.id);
    setForm({ title: tpl.title, content: tpl.content });
  };

  const handleDelete = async (id: number) => {
    await deleteMailTemplate({ data: { id } });
    fetchTemplates();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await updateMailTemplate({ data: { id: editId, ...form } });
    } else {
      await addMailTemplate({ data: form });
    }
    setEditId(null);
    setForm({ title: '', content: '' });
    fetchTemplates();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>邮件模板管理</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <input
          placeholder="标题"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
        <input
          placeholder="内容"
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          required
        />
        <button type="submit">{editId ? '更新' : '新增'}</button>
        {editId && (
          <button
            type="button"
            onClick={() => {
              setEditId(null);
              setForm({ title: '', content: '' });
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
              <th>标题</th>
              <th>内容</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {templates.length > 0 &&
              templates.map((tpl) => (
                <tr key={tpl.id}>
                  <td>{tpl.id}</td>
                  <td>{tpl.title}</td>
                  <td>{tpl.content}</td>
                  <td>
                    <button onClick={() => handleEdit(tpl)}>编辑</button>
                    <button onClick={() => handleDelete(tpl.id)}>删除</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
