import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { HashRouter } from 'react-router-dom';
import { reloadOnce, clearReloadFlag } from '@/components/ChunkErrorBoundary';
import { getSsoHashBridgeUrl } from '@/utils/ssoCallback';

// The identity center uses a fixed callback path; bridge it into HashRouter without losing code/state.
const ssoHashBridgeUrl = getSsoHashBridgeUrl(window.location);
if (ssoHashBridgeUrl) {
  window.history.replaceState({}, document.title, '/');
  window.location.replace(ssoHashBridgeUrl);
}

// Vite 5+ 内置事件：<link rel="modulepreload"> 预加载失败时触发（发版后旧 chunk 404）
window.addEventListener('vite:preloadError', () => {
  reloadOnce();
});

// 页面稳定运行一段时间后，清除上次 chunk 恢复标记
clearReloadFlag();

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <App />
  </HashRouter>,
);
