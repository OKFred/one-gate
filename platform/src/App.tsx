import AppRoutes from './routes';
import { useLoadTranslations } from '@/hooks/useLoadTranslations';
import { ThemeProvider } from './theme';
import { MenuProvider } from './contexts/MenuContext';

function App() {
  useLoadTranslations();

  return (
    <ThemeProvider>
      <MenuProvider>
        <AppRoutes />
      </MenuProvider>
    </ThemeProvider>
  );
}

export default App;
