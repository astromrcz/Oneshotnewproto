import { createBrowserRouter } from 'react-router';
import { RootWrapper } from './RootWrapper';
import { HomePage } from './pages/HomePage';
import { LiveMonitor } from './pages/LiveMonitor';
import { NotFound } from './pages/NotFound';
import { ResetPassword } from './app/pages/ResetPassword';

export const router = createBrowserRouter([
  {
    Component: RootWrapper,
    children: [
      { path: '/', Component: HomePage },
      { path: '/monitor', Component: LiveMonitor },
      { path: '*', Component: NotFound },
    ],
  },
]);