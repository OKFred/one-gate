import { useRoutes } from 'react-router-dom';
import { childrenRoutes } from './routes';

export default function AppContent() {
  const element = useRoutes(childrenRoutes);
  return element;
}
