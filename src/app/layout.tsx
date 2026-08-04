import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
import {
  CheckCircle, Clock, Calendar, UserPlus,
  Tag, Shield, Palette,
  Menu, X, Bell, ChevronRight,
  Circle, LogOut, Settings,
  Monitor, ShieldCheck, Lock, ShieldAlert, Package, History, Music
} from 'lucide-react';
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

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // 🟢 Spotify State
  const [showSpotify, setShowSpotify] = useState(false);
  const [playlistLink, setPlaylistLink] = useState('');
  const [embedUrl, setEmbedUrl] = useState('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0');
  
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

  // 🟢 Spotify Link Parser
  const handleSpotifyLink = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!playlistLink.includes('spotify.com')) return;
      const urlObj = new URL(playlistLink);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathSegments.length >= 2) {
        const type = pathSegments[0]; 
        const id = pathSegments[1];
        setEmbedUrl(`https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`);
        setPlaylistLink('');
      }
    } catch (err) {}
  };

  if (!staffLoggedIn) return null;

  const waitingCount = queue.filter((q: any) => q.status === 'waiting').length;
  const occupiedCount = tables.filter((t: any) => t.status === 'occupied').length;
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

              {/* 🟢 NEW: Integrated Spotify Mini-Player Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowSpotify(!showSpotify)} 
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${showSpotify ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                >
                  <Music size={16} />
                  <span className="text-xs font-semibold hidden sm:block">Music Player</span>
                </button>
                
                {/* Notice we use opacity and scale to hide it, NOT unmounting it. The iframe stays alive! */}
                <div className={`absolute right-0 top-full mt-3 w-80 sm:w-96 bg-neutral-950 border border-neutral-800 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-50 overflow-hidden transition-all duration-200 origin-top-right ${showSpotify ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                  
                  {/* Playlist Input Form */}
                  <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex gap-2">
                    <input 
                      type="text" 
                      value={playlistLink} 
                      onChange={(e) => setPlaylistLink(e.target.value)} 
                      placeholder="Paste Spotify playlist link..." 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-neutral-600 transition-colors"
                    />
                    <button 
                      onClick={handleSpotifyLink}
                      disabled={!playlistLink} 
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                      Load
                    </button>
                  </div>

                  {/* Standard height="152" embeds include Prev/Next controls */}
                  <div className="w-full bg-black h-[152px]">
                    <iframe 
                      title="Spotify Audio"
                      src={embedUrl} 
                      width="100%" 
                      height="152" 
                      frameBorder="0" 
                      allowFullScreen 
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                      loading="lazy"
                      className="block m-0 p-0"
                    ></iframe>
                  </div>
                </div>
              </div>

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
                  <div className="w-8 h-8 bg-emerald-600/30 rounded-full border border-emerald-600/50 flex items-center justify-center text-emerald-400 text-xs font-bold overflow-hidden">
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