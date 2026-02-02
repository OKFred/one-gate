import AppRoutes from './routes';
import { useLoadTranslations } from '@/hooks/useLoadTranslations';
import { ThemeProvider } from './theme';
import { MenuProvider } from './contexts/MenuContext';
import { PermissionProvider } from './contexts/PermissionContext';

function App() {
  useLoadTranslations();

  return (
    <ThemeProvider>
      <PermissionProvider>
        <MenuProvider>
          <AppRoutes />
        </MenuProvider>
      </PermissionProvider>
    </ThemeProvider>
  );
}

export default App;
