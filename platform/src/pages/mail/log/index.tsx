import { useEffect, useState } from 'react';
import { listMailLog } from '@/api/mail';

export default function MailLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await listMailLog({ data: {} });
      setLogs(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>邮件日志</h2>
      {loading ? (
        <div>加载中...</div>
      ) : (
        <table border={1} cellPadding={8} style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>标题</th>
              <th>收件人</th>
              <th>发件人</th>
              <th>状态</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 &&
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.title}</td>
                  <td>{log.mailTo}</td>
                  <td>{log.mailFrom}</td>
                  <td>{log.sendStatus ? '成功' : '失败'}</td>
                  <td>{log.createdAt || log.time}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
