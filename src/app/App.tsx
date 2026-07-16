import { RouterProvider } from 'react-router';
import { AppProvider } from '@/app/context/AppContext';
import { router } from '@/app/routes';

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}