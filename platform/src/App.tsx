import AppRoutes from './routes';
import { useLoadTranslations } from '@/hooks/useLoadTranslations';
import { ThemeProvider } from './theme';
import { MenuProvider } from './contexts/MenuContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary';

function App() {
  const isTranslationsLoaded = useLoadTranslations();

  if (!isTranslationsLoaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        {/* 全屏居中的加载占位 */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="text-sm text-gray-500">Loading Configuration...</span>
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
