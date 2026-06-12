import { Outlet } from 'react-router';
import { AppProvider } from './context/AppContext';

export function RootWrapper() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}
