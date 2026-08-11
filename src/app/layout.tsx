import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
import {
  CheckCircle, Clock, Calendar, UserPlus,
  Tag,
  Menu, X, Bell, ChevronRight,
  LogOut, Settings,
  Monitor, ShieldCheck, Lock, ShieldAlert, Package, History,
  AlertTriangle, Sparkles
} from 'lucide-react';
import { addMinutes, differenceInSeconds } from 'date-fns';
import { useAppContext } from './context/AppContext';
import { LockScreen } from './components/LockScreen';
import logoImg from 'figma:asset/40eb82831843e17a3c48a360fd80f0aaaa58ddc8.png';
import { FirstTimeLoginModal } from './components/FirstTimeLoginModal';

const navItems = [
  { to: '/staff',                     icon: CheckCircle, label: 'Overview',            exact: true },
  { to: '/staff/tables',              icon: Clock,       label: 'Table Monitor' },
  { to: '/staff/reservations',        icon: Calendar,    label: 'Reservations' },
  { to: '/staff/queue',               icon: UserPlus,    label: 'Queue' },
  { to: '/staff/promo-codes',         icon: Tag,         label: 'Promo Codes' },
  { to: '/staff/history',             icon: History,     label: 'Session History' }, 
  { to: '/staff/lost-found',          icon: Package,     label: 'Lost & Found' },
  { to: '/staff/watchlist',           icon: ShieldAlert, label: 'Security Watchlist' },
  { to: '/staff/settings',            icon: Settings,    label: 'Settings' },
];

const pageTitles: Record<string, string> = {
  '/staff': 'Overview',
  '/staff/tables': 'Table Monitor',
  '/staff/reservations': 'Reservations',
  '/staff/queue': 'Queue Management',
  '/staff/lost-found': 'Lost & Found',       
  '/staff/watchlist': 'Security Watchlist',
  '/staff/promo-codes': 'Promo Codes',
  '/staff/history': 'Session History',
  '/staff/settings': 'Settings',
};

// ── SIDEBAR SMART AUTO-SWITCHING LIVE COUNTDOWN TIMER (#1 + #5) ──
function SidebarSmartTimer({ tables, onNavigate }: { tables: any[]; onNavigate: (path: string) => void }) {
  const [now, setNow] = useState(new Date());

  // 1-second ticker for live countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (totalSeconds: number) => {
    const absSecs = Math.abs(totalSeconds);
    const hrs = Math.floor(absSecs / 3600);
    const mins = Math.floor((absSecs % 3600) / 60);
    const secs = absSecs % 60;
    const parts = [
      hrs > 0 ? `${hrs}h` : '',
      `${mins.toString().padStart(2, '0')}m`,
      `${secs.toString().padStart(2, '0')}s`
    ].filter(Boolean).join(' ');
    return totalSeconds < 0 ? `+${parts}` : parts;
  };

  const occupiedTables = tables.filter((t: any) => t.isActive && t.status === 'occupied' && t.session);

  if (occupiedTables.length === 0) {
    return (
      <div className="px-4 py-3">
        <button
          onClick={() => onNavigate('/staff/tables')}
          className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3.5 text-left transition-all group"
        >
          <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Sparkles size={13} /> ✨ ALL TABLES CLEAR
          </div>
          <p className="text-sm font-black text-neutral-100 group-hover:text-emerald-400 transition-colors">
            Ready for Walk-ins
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            No tables are currently occupied.
          </p>
        </button>
      </div>
    );
  }

  const tableStatuses = occupiedTables.map((t: any) => {
    const start = new Date(t.session.startTime);
    const isOpen = t.session.isOpenTime || t.session.durationMinutes === null;
    if (isOpen) {
      const elapsedSecs = differenceInSeconds(now, start);
      return { table: t, type: 'open' as const, secs: elapsedSecs };
    }
    const end = addMinutes(start, t.session.durationMinutes);
    const remainingSecs = differenceInSeconds(end, now);
    if (remainingSecs <= 0) {
      return { table: t, type: 'overtime' as const, secs: remainingSecs };
    }
    if (remainingSecs <= 900) {
      return { table: t, type: 'warning' as const, secs: remainingSecs };
    }
    return { table: t, type: 'active' as const, secs: remainingSecs };
  });

  // Urgency sort: 1. Overtime -> 2. Warning (<15m) -> 3. Active -> 4. Open Time
  tableStatuses.sort((a, b) => {
    const score = (type: string) => {
      if (type === 'overtime') return 1;
      if (type === 'warning') return 2;
      if (type === 'active') return 3;
      return 4;
    };
    if (score(a.type) !== score(b.type)) return score(a.type) - score(b.type);
    return a.secs - b.secs;
  });

  const primary = tableStatuses[0];
  const isOt = primary.type === 'overtime';
  const isWarn = primary.type === 'warning';
  const isOpen = primary.type === 'open';

  const cardStyle = isOt
    ? 'bg-rose-950/30 border-rose-500/60 text-rose-400'
    : isWarn
    ? 'bg-amber-950/30 border-amber-500/60 text-amber-400'
    : 'bg-neutral-900 border-neutral-800 text-blue-400';

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => onNavigate('/staff/tables')}
        className={`w-full border rounded-xl p-3.5 text-left transition-all group ${cardStyle}`}
      >
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
          <span className="flex items-center gap-1.5 truncate">
            {isOt ? <AlertTriangle size={13} className="animate-bounce" /> : <Clock size={13} />}
            <span>{isOt ? '⚠️ OVERTIME' : isWarn ? '⏳ ENDS SOON' : '⏱️ NEXT UP'} · {primary.table.name}</span>
          </span>
          <span className="text-neutral-500 font-normal">#{occupiedTables.length} active</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <p className={`text-xl font-black ${isOt ? 'text-rose-400 animate-pulse' : 'text-neutral-100'}`}>
            {formatDuration(primary.secs)}
          </p>
          <span className="text-[10px] text-neutral-400 font-semibold">
            {isOt ? 'unpaid' : isOpen ? 'elapsed' : 'left'}
          </span>
        </div>
        <p className="text-[11px] text-neutral-400 mt-1 truncate">
          Player: <span className="font-semibold text-neutral-200">{primary.table.session?.customerName}</span>
        </p>
      </button>
    </div>
  );
}
// ────────────────────────────────────────────────────────────────

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const [isLocked, setIsLocked] = useState(() => sessionStorage.getItem('oneshot_is_locked') === 'true');
  
  const { queue, tables, activities, staffLoggedIn, staffLogout, staffProfile } = useAppContext() as any;
  const location = useLocation();
  const navigate = useNavigate();
  const [showSetup, setShowSetup] = useState(staffProfile?.isFirstLogin === 1);

  const handleLockTerminal = () => {
    sessionStorage.setItem('oneshot_is_locked', 'true');
    setIsLocked(true);
  };

  const handleUnlockTerminal = () => {
    sessionStorage.removeItem('oneshot_is_locked');
    setIsLocked(false);
  };
  
  useEffect(() => {
    if (!staffLoggedIn) navigate('/', { replace: true });
  }, [staffLoggedIn, navigate]);

  useEffect(() => {
    if (!staffLoggedIn || isLocked) return;
    let timeoutId: NodeJS.Timeout;
    const resetIdleTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log("⏳ System idle detected. Auto-locking terminal.");
        handleLockTerminal();
      }, 900000); 
    };

    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    window.addEventListener('scroll', resetIdleTimer);
    resetIdleTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      window.removeEventListener('scroll', resetIdleTimer);
    };
  }, [staffLoggedIn, isLocked]);

  if (!staffLoggedIn) return null;

  const waitingCount = queue.filter((q: any) => q.status === 'waiting').length;
  const overtimeCount = tables.filter((t: any) => {
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
    <>
      {showSetup && <FirstTimeLoginModal onComplete={() => setShowSetup(false)} />}
      
      {isLocked && <LockScreen onUnlock={handleUnlockTerminal} />}
        
      <div className={`flex h-screen bg-neutral-900 text-neutral-100 overflow-hidden transition-all duration-300 ${isLocked ? 'pointer-events-none blur-md select-none opacity-50' : ''}`}>
        
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col transition-transform duration-300
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Logo */}
          <div className="p-5 flex items-center justify-between border-b border-neutral-800/60">
            <button onClick={() => navigate('/staff')} className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity cursor-pointer">
              <img src={logoImg} alt="One Shot Bar" className="w-10 h-10 object-contain rounded-xl flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-neutral-100 leading-tight">One Shot Bar</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-medium">& Billiards</p>
              </div>
            </button>
            <button className="lg:hidden text-neutral-500 hover:text-neutral-200" onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* 🟢 REPLACED: Static Occupied / In Queue boxes replaced by Smart Auto-Switching Live Timer (#1 + #5) */}
          <SidebarSmartTimer tables={tables} onNavigate={navigate} />

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

          {/* Switch to Admin */}
          {staffProfile?.isAdmin && (
            <div className="px-4 pb-4">
              <button
                onClick={() => {
                  sessionStorage.setItem('oneshot_admin_auth', 'true');
                   window.location.href = '/admin';
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 transition-all text-xs font-semibold"
              >
                <ShieldCheck size={13} />
                <span className="flex-1 text-left">Switch to Admin Portal</span>
                <span className="text-[9px] text-neutral-600 font-black">→</span>
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="relative z-20 h-16 flex-none bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between px-5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <button className="lg:hidden text-neutral-400 hover:text-neutral-200 p-1" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <h1 className="text-base font-semibold text-neutral-200">{pageTitle}</h1>
            </div>
            
            <div className="flex items-center gap-3">
              
              <button onClick={openLiveMonitor} className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/25 px-3 py-2 rounded-lg transition-all font-semibold">
                <Monitor size={14} /> Live Monitor
              </button>

              {/* Notifications */}
              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-neutral-400 hover:text-neutral-200 transition-colors rounded-lg hover:bg-neutral-800">
                  <Bell size={18} />
                  {(waitingCount > 0 || overtimeCount > 0) && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-3 w-80 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-800 flex justify-between items-center">
                      <p className="text-sm font-semibold text-neutral-200">Recent Activity</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {activities.slice(0, 5).map((activity: any) => (
                        <div key={activity.id} className="px-4 py-3 border-b border-neutral-800/50 hover:bg-neutral-900/40 transition-colors">
                          <p className="text-xs text-neutral-300">{activity.description}</p>
                          <p className="text-[10px] text-neutral-600 mt-1">{new Date(activity.timestamp).toLocaleTimeString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 bg-neutral-800/60 rounded-full pl-1 pr-3 py-1 border border-neutral-700/50 hover:bg-neutral-800 transition-colors">
                  <div className="w-8 h-8 bg-emerald-600/30 rounded-full border border-emerald-600/50 flex items-center justify-center text-emerald-400 text-xs font-bold overflow-hidden flex-shrink-0">
                    {staffProfile?.avatarImg ? (
                      <img 
                        src={staffProfile.avatarImg.startsWith('http') ? staffProfile.avatarImg : `http://localhost:3001${staffProfile.avatarImg}`} 
                        alt="Profile" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      staffProfile?.fullName?.charAt(0) || 'S'
                    )}
                  </div>
                  <span className="text-xs text-neutral-300 font-medium hidden sm:block truncate max-w-[120px]">
                    {staffProfile?.fullName || 'Staff User'}
                  </span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-3 w-56 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-600/30 rounded-full border border-emerald-600/50 flex items-center justify-center text-emerald-400 text-sm font-bold overflow-hidden flex-shrink-0">
                        {staffProfile?.avatarImg ? (
                          <img 
                            src={staffProfile.avatarImg.startsWith('http') ? staffProfile.avatarImg : `http://localhost:3001${staffProfile.avatarImg}`} 
                            alt="Profile" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          staffProfile?.fullName?.charAt(0) || 'S'
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-200 truncate">{staffProfile?.fullName || 'Staff User'}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{staffProfile?.role || 'Staff'}</p>
                      </div>
                    </div>
                    <NavLink to="/staff/settings" onClick={() => setShowUserMenu(false)} className="w-full px-4 py-2.5 text-left text-sm text-neutral-300 hover:bg-neutral-900/60 transition-colors flex items-center gap-2">
                      <Settings size={14} /> Settings
                    </NavLink>
                    <button onClick={() => { handleLockTerminal(); setShowUserMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-amber-400 hover:bg-neutral-900/60 transition-colors flex items-center gap-2 border-t border-neutral-800">
                      <Lock size={14} /> Lock Device
                    </button>
                    <button onClick={handleLogout} className="w-full px-4 py-2.5 text-left text-sm text-rose-400 hover:bg-neutral-900/60 transition-colors flex items-center gap-2 border-t border-neutral-800">
                      <LogOut size={14} /> Logout
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
    </>
  );
}