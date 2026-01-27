import AppRoutes from './routes';
import { useLoadTranslations } from '@/hooks/useLoadTranslations';
import { ThemeProvider } from './theme';

function App() {
  useLoadTranslations();

  return (
    <ThemeProvider>
      <AppRoutes />
    </ThemeProvider>
  );
}

export default App;
