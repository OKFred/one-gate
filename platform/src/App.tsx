import AppRoutes from './routes';
import { useLoadTranslations } from '@/hooks/useLoadTranslations';
import { ThemeProvider } from './theme';
import { MenuProvider } from './contexts/MenuContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary';

function App() {
  useLoadTranslations();

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
