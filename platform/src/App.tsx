import AppRoutes from './routes';
import { NotificationProvider } from './utils/notification';

function App() {
  return (
    <NotificationProvider>
      <AppRoutes />
    </NotificationProvider>
  );
}

export default App;
