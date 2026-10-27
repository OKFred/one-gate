import { useRoutes } from 'react-router-dom';
import { childrenRoutes } from './routes';
import './locales/register';

export default function AppContent() {
  const element = useRoutes(childrenRoutes);
  return element;
}
