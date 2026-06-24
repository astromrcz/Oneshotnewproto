import { createBrowserRouter } from 'react-router';
import { RootWrapper } from './RootWrapper';
import { Layout } from './layout';
import { AdminLayout } from './adminLayout';
import { HomePage } from './pages/HomePage';
import { LiveMonitor } from './pages/LiveMonitor';
// Staff pages
import { OverviewDashboard } from './pages/OverviewDashboard';
import { Tables } from './pages/Tables';
import { Reservations } from './pages/Reservations';
import { Queue } from './pages/Queue';
import { ActivityLog } from './pages/ActivityLog';
import { PromoCodesPage } from './pages/PromoCodes';
import { SettingsPage } from './pages/Settings';
// Admin pages
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUsers } from './pages/AdminUsers';
import { AdminTableManagement } from './pages/AdminTableManagement';
import { AdminRates } from './pages/AdminRates';
import { AdminReservationTerms } from './pages/AdminReservationTerms';
import { AdminAnnouncements } from './pages/AdminAnnouncements';
import { AdminCalendar } from './pages/AdminCalendar';
import { AdminEvents } from './pages/AdminEvents';
import { Analytics } from './pages/Analytics';
import { FeedbackPage } from './pages/Feedback';
import { AdminInventory } from './pages/AdminInventory';
// Offline Login
import { OfflineLogin } from './pages/OfflineLogin';
import { NotFound } from './pages/NotFound';
import { AdminSiteSettings } from './pages/AdminSiteSettings';

const isDesktop = import.meta.env.VITE_APP_MODE === 'desktop';

export const router = createBrowserRouter([
  {
    Component: RootWrapper,
    children: [

      { 
        path: '/', 
        Component: isDesktop ? OfflineLogin : HomePage 
      },

      { path: '/',             Component: HomePage },
      { path: '/monitor',      Component: LiveMonitor },
      // ── Staff Portal ──────────────────────────────────────
      {
        path: '/staff',
        Component: Layout,
        children: [
          { index: true,                  Component: OverviewDashboard },
          { path: 'tables',               Component: Tables },
          { path: 'reservations',         Component: Reservations },
          { path: 'queue',                Component: Queue },
          { path: 'activity',             Component: ActivityLog },
          { path: 'promo-codes',          Component: PromoCodesPage },
          { path: 'settings',             Component: SettingsPage },
        ],
      },
      // ── Admin Portal ──────────────────────────────────────
      {
        path: '/admin',
        Component: AdminLayout,
        children: [
          { index: true,                    Component: AdminDashboard },
          { path: 'users',                  Component: AdminUsers },
          { path: 'tables',                 Component: AdminTableManagement },
          { path: 'inventory', Component: AdminInventory },
          { path: 'rates',                  Component: AdminRates },
          { path: 'reservation-terms',      Component: AdminReservationTerms },
          { path: 'announcements',          Component: AdminAnnouncements },
          { path: 'events',                 Component: AdminEvents },
          { path: 'analytics',              Component: Analytics },
          { path: 'feedback',               Component: FeedbackPage },
          { path: 'site-settings',               Component: AdminSiteSettings },

        ],
      },
      { path: '*', Component: NotFound },
    ],
  },
]);
