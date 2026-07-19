import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, Users, Table2, Tag, BarChart3,
  DollarSign, FileText, Megaphone, CalendarX2,
  Menu, X, LogOut, ChevronRight,
  ShieldCheck, Shield, Settings, Lock, AlertTriangle
} from 'lucide-react';
import { useAppContext } from './context/AppContext';
import { LockScreen } from './components/LockScreen';
import logoImg from 'figma:asset/40eb82831843e17a3c48a360fd80f0aaaa58ddc8.png';

const navItems = [
  { to: '/admin',                   icon: LayoutDashboard, label: 'Dashboard',           exact: true },
  { to: '/admin/users',             icon: Users,           label: 'User Management' },
  { to: '/admin/tables',            icon: Table2,          label: 'Table Management' },
  { to: '/admin/events',            icon: CalendarX2,      label: 'Events & Calendar' },
  { to: '/admin/policy-rates',      icon: DollarSign,      label: 'Policy & Rates' }, 
  { to: '/admin/announcements',     icon: Megaphone,       label: 'Announcements' },
  { to: '/admin/analytics',         icon: BarChart3,       label: 'Analytics' },
  { to: '/admin/activity',          icon: Shield,          label: 'Activity Log' },
  { to: '/admin/feedback',          icon: Tag,             label: 'Feedback' },
  { to: '/admin/site-settings',     icon: FileText,        label: 'Site Settings' },
  { to: '/admin/settings',          icon: Settings,        label: 'Settings' },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/tables': 'Table Management',
  '/admin/events': 'Events & Calendar', 
  '/admin/policy-rates': 'Policy & Rates',
  '/admin/announcements': 'Announcements',
  '/admin/analytics': 'Analytics',
  '/admin/activity': 'Activity Log',
  '/admin/feedback': 'Feedback',
  '/admin/site-settings': 'Site Settings',
  '/admin/settings': 'Settings',
};

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('oneshot_is_locked') === 'true');  
  
  // 🟢 NEW: Global Unsaved Changes State & Interceptor
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);

  const { adminLoggedIn, adminLogout } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!adminLoggedIn) navigate('/', { replace: true });
  }, [adminLoggedIn, navigate]);
// 🛡️ POS Auto-Lock (Idle Timer)
  useEffect(() => {
    if (!adminLoggedIn || isLocked) return;

    let timeoutId: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(timeoutId);
      // 900,000 milliseconds = 15 minutes
      // Change to 60000 (1 min) if you want to test it quickly!
      timeoutId = setTimeout(() => {
        console.log("⏳ System idle detected. Auto-locking terminal.");
        handleLockTerminal();
      }, 900000); 
    };

    // Listen for any interaction with the computer
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    window.addEventListener('scroll', resetIdleTimer);

    // Start the timer immediately
    resetIdleTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      window.removeEventListener('scroll', resetIdleTimer);
    };
  }, [adminLoggedIn, isLocked]);
  // 🛡️ OS-Level Unsaved Changes Interceptor (Blocks closing tab or F5)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (!adminLoggedIn) return null;

  const pageTitle = pageTitles[location.pathname] || 'Admin';

  const handleLockTerminal = () => {
    localStorage.setItem('oneshot_is_locked', 'true');
    setIsLocked(true);
  };

  const handleUnlockTerminal = () => {
    localStorage.removeItem('oneshot_is_locked');
    setIsLocked(false);
  };

  const handleLogout = () => {
    if (hasUnsavedChanges) {
      setPendingNav('LOGOUT');
      return;
    }
    adminLogout();
    navigate('/');
  };

  const handleSwitchToStaff = () => {
    if (hasUnsavedChanges) {
      setPendingNav('STAFF_PORTAL');
      return;
    }
    // 🟢 FIXED: Hard reload to force AppContext to re-evaluate the auth flags
    localStorage.setItem('oneshot_staff_auth', 'true');
    window.location.href = '/staff';
  };

  const confirmNavigation = () => {
    setHasUnsavedChanges(false);
    if (pendingNav === 'LOGOUT') {
      adminLogout();
      navigate('/');
    } else if (pendingNav === 'STAFF_PORTAL') {
      localStorage.setItem('oneshot_staff_auth', 'true');
      window.location.href = '/staff';
    } else if (pendingNav) {
      navigate(pendingNav);
    }
    setPendingNav(null);
    setSidebarOpen(false);
  };

  return (
    <>
      {isLocked && <LockScreen onUnlock={handleUnlockTerminal} />}
      
      <div className={`flex h-screen w-full bg-neutral-950 overflow-hidden transition-all duration-300 ${isLocked ? 'pointer-events-none blur-md select-none opacity-50' : ''}`}>
        
        {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-neutral-950 border-r border-amber-900/30 flex flex-col transition-transform duration-300
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
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

          <div className="px-4 py-3">
            <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
              <ShieldCheck size={16} className="text-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-300">Administrator</p>
                <p className="text-[10px] text-amber-600">Full access · admin</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
            <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-semibold px-3 py-2">Admin Navigation</p>
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={(e) => {
                  // 🟢 UI-Level Unsaved Changes Interceptor
                  if (hasUnsavedChanges) {
                    e.preventDefault();
                    setPendingNav(item.to);
                  } else {
                    setSidebarOpen(false);
                  }
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/20'
                      : 'text-neutral-400 hover:bg-neutral-800/70 hover:text-neutral-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={16} className={isActive ? 'text-amber-400' : ''} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight size={13} className="text-amber-500/60" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="px-4 pb-4">
            <button
              onClick={handleSwitchToStaff}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 transition-all text-xs font-semibold"
            >
              <ShieldCheck size={13} />
              <span className="flex-1 text-left">Switch to Staff Portal</span>
              <span className="text-[9px] text-neutral-600 font-black">→</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="relative z-20 h-14 flex-none bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between px-5 backdrop-blur-sm">
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
              <button onClick={() => {
                if (hasUnsavedChanges) { setPendingNav('/admin/settings'); } 
                else { navigate('/admin/settings'); }
              }} className="p-1.5 text-neutral-400 hover:text-amber-400 transition-colors">
                <Settings size={16} />
              </button>
              
              <button
                onClick={handleLockTerminal}
                className="flex items-center gap-2 text-xs text-neutral-400 hover:text-amber-400 bg-neutral-800 hover:bg-amber-950/20 border border-neutral-700 hover:border-amber-800/40 px-3 py-1.5 rounded-full transition-all font-medium"
              >
                <Lock size={13} />
                Lock
              </button>
              
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
              {/* 🟢 NEW: Provide the Unsaved Changes function to all child pages */}
              <Outlet context={{ setHasUnsavedChanges }} />
            </div>
          </main>
        </div>
      </div>

      {/* 🟢 UNRESOLVED CHANGES WARNING MODAL 🟢 */}
      {pendingNav && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-amber-900/40 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-500">
                <AlertTriangle size={20} />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Unsaved Changes</h2>
              <p className="text-sm text-neutral-400 leading-relaxed">
                You have unsaved modifications on this page. If you leave now, all your pending changes will be permanently discarded.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-neutral-800 flex gap-3 bg-neutral-900/50">
              <button 
                onClick={() => setPendingNav(null)} 
                className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-semibold rounded-xl transition-colors"
              >
                Keep Editing
              </button>
              <button 
                onClick={confirmNavigation} 
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-rose-900/20"
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

