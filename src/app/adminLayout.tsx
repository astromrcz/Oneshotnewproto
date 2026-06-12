import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, Users, Table2, Tag, BarChart3,
  DollarSign, FileText, Megaphone, CalendarX2,
  Bot, Menu, X, LogOut, ChevronRight,
  ShieldCheck, Bell, Circle
} from 'lucide-react';
import { useAppContext } from './context/AppContext';
import logoImg from 'figma:asset/40eb82831843e17a3c48a360fd80f0aaaa58ddc8.png';

const navItems = [
  { to: '/admin',               icon: LayoutDashboard, label: 'Dashboard',           exact: true },
  { to: '/admin/tako',          icon: Bot,             label: 'Tako Bot',            activeColor: 'text-purple-400' },
  { to: '/admin/users',         icon: Users,           label: 'User Management' },
  { to: '/admin/tables',        icon: Table2,          label: 'Table Management' },
  { to: '/admin/events',        icon: CalendarX2,      label: 'Events & Promo Mgr' },
  { to: '/admin/rates',         icon: DollarSign,      label: 'Rates Editor' },
  { to: '/admin/reservation-terms', icon: FileText,    label: 'Reservation Terms' },
  { to: '/admin/announcements', icon: Megaphone,       label: 'Announcements' },
  { to: '/admin/calendar',      icon: CalendarX2,      label: 'Closing Calendar' },
  { to: '/admin/analytics',     icon: BarChart3,       label: 'Analytics' },
  { to: '/admin/feedback',      icon: Tag,             label: 'Feedback' },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/tako': 'Tako Bot',
  '/admin/users': 'User Management',
  '/admin/tables': 'Table Management',
  '/admin/events': 'Events & Promo Manager',
  '/admin/rates': 'Rates Editor',
  '/admin/reservation-terms': 'Reservation Terms',
  '/admin/announcements': 'Announcements',
  '/admin/calendar': 'Closing Calendar',
  '/admin/analytics': 'Analytics',
  '/admin/feedback': 'Feedback',
};

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { adminLoggedIn, adminLogout, announcements, closedDates } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!adminLoggedIn) navigate('/', { replace: true });
  }, [adminLoggedIn, navigate]);

  if (!adminLoggedIn) return null;

  const activeAnnouncements = announcements.filter(a => a.isActive).length;
  const upcomingClosed = closedDates.filter(c => new Date(c.date) >= new Date()).length;
  const pageTitle = pageTitles[location.pathname] || 'Admin';

  const handleLogout = () => {
    adminLogout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-neutral-950 border-r border-amber-900/30 flex flex-col transition-transform duration-300
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-5 flex items-center justify-between border-b border-amber-900/30">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="One Shot Bar" className="w-10 h-10 object-contain rounded-xl" />
            <div>
              <p className="text-sm font-bold text-neutral-100 leading-tight">One Shot Bar</p>
              <p className="text-[10px] text-amber-500/70 uppercase tracking-widest font-semibold">Admin Portal</p>
            </div>
          </div>
          <button className="lg:hidden text-neutral-500 hover:text-neutral-200" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Admin badge */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
            <ShieldCheck size={16} className="text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-300">Administrator</p>
              <p className="text-[10px] text-amber-600">Full access · admin</p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="px-4 pb-2 flex gap-2">
          <div className="flex-1 bg-neutral-900 rounded-lg p-2 text-center border border-neutral-800">
            <p className="text-sm font-black text-amber-400">{activeAnnouncements}</p>
            <p className="text-[9px] text-neutral-500 uppercase tracking-wider">Active Ann.</p>
          </div>
          <div className="flex-1 bg-neutral-900 rounded-lg p-2 text-center border border-neutral-800">
            <p className="text-sm font-black text-rose-400">{upcomingClosed}</p>
            <p className="text-[9px] text-neutral-500 uppercase tracking-wider">Closed Days</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-semibold px-3 py-2">Admin Navigation</p>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group ${
                  isActive
                    ? item.activeColor
                      ? `bg-purple-500/15 ${item.activeColor} font-semibold border border-purple-500/20`
                      : 'bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/20'
                    : 'text-neutral-400 hover:bg-neutral-800/70 hover:text-neutral-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={16} className={isActive ? (item.activeColor || 'text-amber-400') : ''} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={13} className={item.activeColor ? 'text-purple-500/60' : 'text-amber-500/60'} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Staff Portal link */}
        <div className="px-4 pb-2">
          <button
            onClick={() => window.open('/staff', '_blank')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 transition-all text-xs font-semibold"
          >
            <ShieldCheck size={13} />
            <span className="flex-1 text-left">Staff Portal</span>
            <span className="text-[9px] text-neutral-600 font-black">↗</span>
          </button>
        </div>

        {/* Bottom */}
        <div className="p-4 border-t border-amber-900/20">
          <div className="flex items-center gap-2 text-neutral-600">
            <Circle size={8} className="fill-amber-500 text-amber-500" />
            <span className="text-xs">Admin · One Shot Bar & Billiards</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 flex-none bg-neutral-950/80 border-b border-amber-900/20 flex items-center justify-between px-5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-neutral-400 hover:text-neutral-200 p-1" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-amber-500" />
              <h1 className="text-base font-semibold text-neutral-200">{pageTitle}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
              <ShieldCheck size={13} className="text-amber-400" />
              <span className="text-xs text-amber-400 font-semibold">Admin Mode</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs text-neutral-400 hover:text-rose-400 bg-neutral-800 hover:bg-rose-950/20 border border-neutral-700 hover:border-rose-800/40 px-3 py-1.5 rounded-full transition-all font-medium"
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-neutral-900 relative">
          <div className="p-6 max-w-screen-xl mx-auto h-full">
            <Outlet />
          </div>

          {/* Tako Bot Quick Chat Bubble */}
          <button
            onClick={() => navigate('/admin/tako')}
            className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 rounded-full shadow-lg shadow-purple-900/50 flex items-center justify-center hover:scale-110 hover:bg-purple-500 transition-all z-50 group"
          >
            <Bot size={24} className="text-white" />
            <span className="absolute -top-10 right-0 bg-neutral-800 text-neutral-200 text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-neutral-700">
              Ask Tako Bot
            </span>
          </button>
        </main>
      </div>
    </div>
  );
}
