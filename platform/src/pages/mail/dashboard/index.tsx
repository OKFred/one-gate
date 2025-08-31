import { Link } from 'react-router-dom';

export default function MailDashboard() {
  return (
    <div style={{ padding: 32 }}>
      <h2>邮件管理面板</h2>
      <ul style={{ fontSize: 18, lineHeight: 2 }}>
        <li><Link to="/mail/template">邮件模板管理</Link></li>
        <li><Link to="/mail/log">邮件日志</Link></li>
        <li><Link to="/mail/send">邮件发送</Link></li>
        <li><Link to="/mail/account">邮件账户管理</Link></li>
      </ul>
    </div>
  );
}
