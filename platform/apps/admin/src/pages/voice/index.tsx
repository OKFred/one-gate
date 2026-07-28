import { Navigate } from 'react-router-dom';

/** 将 /admin/voice 重定向至 /admin/voice/session */
export default function VoiceRedirect() {
  return <Navigate to="/admin/voice/session" replace />;
}
