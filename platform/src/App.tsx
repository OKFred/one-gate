import AppRoutes from './routes';
import { useLoadTranslations } from '@/hooks/useLoadTranslations';

function App() {
  useLoadTranslations();

  return <AppRoutes />;
}

export default App;
