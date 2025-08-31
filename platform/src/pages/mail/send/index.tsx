import { useState } from 'react';
import { sendMailSingle } from '@/api/mail';

export default function MailSend() {
  const [form, setForm] = useState({
    senderObj: { accountId: '', mailAddress: '' },
    receiverArr: [{ name: '', address: '' }],
    contentObj: { templateId: '', subject: '', html: '' },
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleReceiverChange = (idx: number, key: string, value: string) => {
    setForm(f => ({
      ...f,
      receiverArr: f.receiverArr.map((r, i) => i === idx ? { ...r, [key]: value } : r),
    }));
  };

  const handleAddReceiver = () => {
    setForm(f => ({ ...f, receiverArr: [...f.receiverArr, { name: '', address: '' }] }));
  };

  const handleRemoveReceiver = (idx: number) => {
    setForm(f => ({ ...f, receiverArr: f.receiverArr.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        senderObj: {
          accountId: form.senderObj.accountId ? Number(form.senderObj.accountId) : undefined,
          mailAddress: form.senderObj.mailAddress,
        },
        contentObj: {
          ...form.contentObj,
          templateId: form.contentObj.templateId ? Number(form.contentObj.templateId) : undefined,
        },
      };
      const res = await sendMailSingle({ data: payload });
      setResult(res.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>发送邮件</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>发件账户ID: <input value={form.senderObj.accountId} onChange={e => handleChange('senderObj', { ...form.senderObj, accountId: e.target.value })} /></label>
          <label>或发件邮箱: <input value={form.senderObj.mailAddress} onChange={e => handleChange('senderObj', { ...form.senderObj, mailAddress: e.target.value })} /></label>
        </div>
        <div>
          <label>收件人:</label>
          {form.receiverArr.map((r, i) => (
            <div key={i}>
              <input placeholder="姓名" value={r.name} onChange={e => handleReceiverChange(i, 'name', e.target.value)} required />
              <input placeholder="邮箱" value={r.address} onChange={e => handleReceiverChange(i, 'address', e.target.value)} required />
              {form.receiverArr.length > 1 && <button type="button" onClick={() => handleRemoveReceiver(i)}>移除</button>}
            </div>
          ))}
          <button type="button" onClick={handleAddReceiver}>添加收件人</button>
        </div>
        <div>
          <label>模板ID: <input value={form.contentObj.templateId} onChange={e => handleChange('contentObj', { ...form.contentObj, templateId: e.target.value })} /></label>
          <label>主题: <input value={form.contentObj.subject} onChange={e => handleChange('contentObj', { ...form.contentObj, subject: e.target.value })} /></label>
          <label>内容: <input value={form.contentObj.html} onChange={e => handleChange('contentObj', { ...form.contentObj, html: e.target.value })} /></label>
        </div>
        <button type="submit" disabled={loading}>{loading ? '发送中...' : '发送'}</button>
      </form>
      {result && (
        <div style={{ marginTop: 24 }}>
          <h3>发送结果</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
