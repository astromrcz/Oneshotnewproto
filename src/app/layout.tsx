import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
import {
  CheckCircle, Clock, Calendar, UserPlus,
  Tag, Shield, Palette,
  Menu, X, Bell, ChevronRight,
  Circle, LogOut, Settings,
  Monitor, ShieldCheck
} from 'lucide-react';
import { useAppContext } from './context/AppContext';
import logoImg from 'figma:asset/40eb82831843e17a3c48a360fd80f0aaaa58ddc8.png';

const navItems = [
  { to: '/staff',                     icon: CheckCircle, label: 'Overview',            exact: true },
  { to: '/staff/tables',              icon: Clock,       label: 'Table Monitor' },
  { to: '/staff/reservations',        icon: Calendar,    label: 'Reservations' },
  { to: '/staff/queue',               icon: UserPlus,    label: 'Queue' },
  { to: '/staff/promo-codes',         icon: Tag,         label: 'Promo Codes' },
  { to: '/staff/settings',            icon: Settings,    label: 'Settings' },
];

const pageTitles: Record<string, string> = {
  '/staff': 'Overview',
  '/staff/tables': 'Table Monitor',
  '/staff/reservations': 'Reservations',
  '/staff/queue': 'Queue Management',
  '/staff/promo-codes': 'Promo Codes',
  '/staff/settings': 'Settings',
};

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { queue, tables, activities, staffLoggedIn, staffLogout } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    if (!staffLoggedIn) {
      navigate('/', { replace: true });
    }
  }, [staffLoggedIn, navigate]);

  if (!staffLoggedIn) return null;

  const waitingCount = queue.filter(q => q.status === 'waiting').length;
  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const overtimeCount = tables.filter(t => {
    if (t.status !== 'occupied' || !t.session) return false;
    const end = new Date(t.session.startTime).getTime() + t.session.durationMinutes * 60000;
    return Date.now() > end;
  }).length;

  const pageTitle = pageTitles[location.pathname] || 'One Shot Bar';

  const handleLogout = () => {
    setShowUserMenu(false);
    staffLogout();
    navigate('/');
  };

  const openLiveMonitor = () => {
    window.open('/monitor', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col transition-transform duration-300
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-5 flex items-center justify-between border-b border-neutral-800/60">
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="One Shot Bar & Billiards"
              className="w-10 h-10 object-contain rounded-xl"
            />
            <div>
              <p className="text-sm font-bold text-neutral-100 leading-tight">One Shot Bar</p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-medium">& Billiards</p>
            </div>
          </div>
          <button className="lg:hidden text-neutral-500 hover:text-neutral-200" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Quick Status */}
        <div className="px-4 py-3 flex gap-2">
          <div className="flex-1 bg-neutral-900 rounded-lg p-2.5 text-center border border-neutral-800">
            <p className="text-lg font-black text-rose-500">{occupiedCount}</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Occupied</p>
          </div>
          <div className="flex-1 bg-neutral-900 rounded-lg p-2.5 text-center border border-neutral-800">
            <p className="text-lg font-black text-amber-500">{waitingCount}</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">In Queue</p>
          </div>
          {overtimeCount > 0 && (
            <div className="flex-1 bg-rose-950/30 rounded-lg p-2.5 text-center border border-rose-800/40">
              <p className="text-lg font-black text-rose-400">{overtimeCount}</p>
              <p className="text-[10px] text-rose-500 uppercase tracking-wider font-semibold">Overtime</p>
            </div>
          )}
        </div>

        {/* Live Monitor Button */}
        <div className="px-4 pb-1">
          <button
            onClick={openLiveMonitor}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/25 hover:border-emerald-600/40 text-emerald-400 transition-all text-sm font-semibold group"
          >
            <Monitor size={15} className="flex-shrink-0" />
            <span className="flex-1 text-left">Live Table Monitor</span>
            <span className="text-[9px] uppercase tracking-widest text-emerald-600 group-hover:text-emerald-500 font-black">↗</span>
          </button>
          <p className="text-[9px] text-neutral-700 text-center mt-1">Opens customer display in new tab</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-semibold px-3 py-2">Navigation</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group ${
                  isActive
                    ? 'bg-emerald-600/15 text-emerald-400 font-semibold border border-emerald-600/20'
                    : 'text-neutral-400 hover:bg-neutral-800/70 hover:text-neutral-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={17} className={isActive ? 'text-emerald-400' : ''} />
                  <span className="flex-1">{item.label}</span>
                  {item.to === '/staff/queue' && waitingCount > 0 && (
                    <span className="bg-amber-500 text-black text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                      {waitingCount}
                    </span>
                  )}
                  {isActive && <ChevronRight size={14} className="text-emerald-500/60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-neutral-800 space-y-2">
          {/* Admin Portal shortcut */}
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/30 hover:border-amber-800/50 text-amber-500/80 hover:text-amber-400 transition-all text-xs font-semibold"
          >
            <ShieldCheck size={14} />
            <span className="flex-1 text-left">Admin Portal</span>
            <span className="text-[9px] text-amber-700 font-black">↗</span>
          </button>
          
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="relative z-50 h-14 flex-none bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between px-5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-neutral-400 hover:text-neutral-200 p-1"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base font-semibold text-neutral-200">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Live Monitor quick-launch in header */}
            <button
              onClick={openLiveMonitor}
              title="Open Live Table Monitor"
              className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/25 px-3 py-1.5 rounded-full transition-all font-semibold"
            >
              <Monitor size={13} />
              Live Monitor
            </button>

            {overtimeCount > 0 && (
              <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-800/40 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs text-rose-400 font-semibold">{overtimeCount} Overtime</span>
              </div>
            )}
            
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-neutral-400 hover:text-neutral-200 transition-colors rounded-lg hover:bg-neutral-800"
              >
                <Bell size={18} />
                {(waitingCount > 0 || overtimeCount > 0) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-800">
                    <p className="text-sm font-semibold text-neutral-200">Recent Activity</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {activities.slice(0, 5).map(activity => (
                      <div key={activity.id} className="px-4 py-3 border-b border-neutral-800/50 hover:bg-neutral-900/40 transition-colors">
                        <p className="text-xs text-neutral-300">{activity.description}</p>
                        <p className="text-[10px] text-neutral-600 mt-1">{new Date(activity.timestamp).toLocaleTimeString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-neutral-800">
                    <NavLink
                      to="/staff/activity"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      View all activity →
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-neutral-800/60 rounded-full pl-1 pr-3 py-1 border border-neutral-700/50 hover:bg-neutral-800 transition-colors"
              >
                <div className="w-7 h-7 bg-emerald-600/30 rounded-full border border-emerald-600/50 flex items-center justify-center text-emerald-400 text-xs font-bold">
                  S
                </div>
                <span className="text-xs text-neutral-400 font-medium">Staff</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-800">
                    <p className="text-sm font-semibold text-neutral-200">Staff User</p>
                    <p className="text-xs text-neutral-500">admin@oneshot.com</p>
                  </div>
                  <NavLink
                    to="/staff/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full px-4 py-2.5 text-left text-sm text-neutral-300 hover:bg-neutral-900/60 transition-colors flex items-center gap-2"
                  >
                    <Settings size={14} />
                    Settings
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm text-rose-400 hover:bg-neutral-900/60 transition-colors flex items-center gap-2 border-t border-neutral-800"
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-neutral-900">
          <div className="p-6 max-w-screen-xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}