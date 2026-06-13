import AppRoutes from './routes';
import { useLoadTranslations } from '@/hooks/useLoadTranslations';
import { ThemeProvider } from './theme';
import { MenuProvider } from './contexts/MenuContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary';

import keySvg from '@/assets/imgs/key.svg?raw';
import { useState, useEffect } from 'react';

function App() {
  const isTranslationsLoaded = useLoadTranslations();
  const [progress, setProgress] = useState(0);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    if (!isTranslationsLoaded) {
      timer = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) return prev;
          const remaining = 95 - prev;
          const diff = Math.random() * remaining * 0.15 + 0.5;
          return Math.min(92, prev + diff);
        });
      }, 100);
    } else {
      setProgress(100);
      const delayTimer = window.setTimeout(() => {
        setShouldRender(true);
      }, 300);
      return () => window.clearTimeout(delayTimer);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [isTranslationsLoaded]);

  if (!shouldRender) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 transition-opacity duration-300">
        <div className="flex flex-col items-center">
          {/* 扁平优雅的 SVG Key 标志 */}
          <div
            className="w-12 h-12 text-[#1976d2] dark:text-[#90caf9] mb-8 opacity-80"
            dangerouslySetInnerHTML={{ __html: keySvg }}
          />

          {/* 进度条轨道 */}
          <div className="w-[180px] h-[3px] bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-[#1976d2] to-[#9c27b0] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* 加载文字提示 */}
          <span className="text-[11px] text-gray-400 dark:text-gray-600 tracking-wider mt-5 font-mono">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <ChunkErrorBoundary>
      <ThemeProvider>
        <PermissionProvider>
          <MenuProvider>
            <AppRoutes />
          </MenuProvider>
        </PermissionProvider>
      </ThemeProvider>
    </ChunkErrorBoundary>
  );
}

export default App;
