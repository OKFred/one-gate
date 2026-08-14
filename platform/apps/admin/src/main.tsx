import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { HashRouter } from 'react-router-dom';
import { reloadOnce, clearReloadFlag } from '@/components/ChunkErrorBoundary';
import { getOAuthHashBridgeUrl } from '@/utils/oauthCallback';

// OAuth providers use a fixed callback path; bridge it into HashRouter without losing code/state.
const oauthHashBridgeUrl = getOAuthHashBridgeUrl(window.location);
if (oauthHashBridgeUrl) {
  window.history.replaceState({}, document.title, '/');
  window.location.replace(oauthHashBridgeUrl);
}

// Vite 5+ 内置事件：<link rel="modulepreload"> 预加载失败时触发（发版后旧 chunk 404）
window.addEventListener('vite:preloadError', () => {
  reloadOnce();
});

// 页面正常启动，清除上次刷新标记
clearReloadFlag();

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <App />
  </HashRouter>,
);
