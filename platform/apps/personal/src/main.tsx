import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { HashRouter } from 'react-router-dom';
import { reloadOnce, clearReloadFlag } from '@/components/ChunkErrorBoundary';

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
