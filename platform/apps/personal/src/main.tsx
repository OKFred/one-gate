import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { HashRouter } from 'react-router-dom';
import 'uno.css';
import { reloadOnce, clearReloadFlag } from '@/components/ChunkErrorBoundary';

window.addEventListener('vite:preloadError', () => {
  reloadOnce();
});

clearReloadFlag();

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <App />
  </HashRouter>,
);
