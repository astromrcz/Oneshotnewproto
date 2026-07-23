import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';
import { 
  Users, Table2, Tag, Megaphone, CalendarX2, DollarSign, 
  TrendingUp, Bell, CloudRain, Sun, Cloud, MapPin, 
  Database, RefreshCw, CalendarDays, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { format, isToday, isTomorrow } from 'date-fns';

export function AdminDashboard() {
  const { 
    staffUsers, tables, promoCodes, announcements, closedDates, 
    rates, reservations, feedback, weather, updateWeatherLocation, 
    activities, sessionHistory, refreshLiveMonitor 
  } = useAppContext();
  
  const navigate = useNavigate();

  const [isEditingWeather, setIsEditingWeather] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const activeUsers     = staffUsers.filter(u => u.isActive).length;
  const activePromos    = promoCodes.filter(p => p.isActive).length;
  const activeAnn       = announcements.filter(a => a.isActive).length;
  const upcomingClosed  = closedDates.filter(c => new Date(c.date) >= new Date()).length;
  
  const totalRevenue = 
    reservations.filter(r => r.status === 'completed').reduce((s, r) => s + r.totalAmount, 0) +
    (sessionHistory || []).reduce((s, sh) => s + (sh.totalAmount || 0), 0);

  const pendingReservations = reservations
    .filter(r => r.status === 'pending' || r.status === 'confirmed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleWeatherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(locationQuery.trim()) {
      toast.loading("Locating...", { id: 'weather-fetch' });
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationQuery.trim())}&count=1`);
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
          const { latitude, longitude, name } = data.results[0];
          updateWeatherLocation(latitude.toString(), longitude.toString(), name);
          toast.success(`Weather location updated to ${name}`, { id: 'weather-fetch' });
        } else {
          toast.error("Location not found. Please try a different city.", { id: 'weather-fetch' });
        }
      } catch (err) {
        toast.error("Network error. Failed to update location.", { id: 'weather-fetch' });
      }
    }
    setIsEditingWeather(false);
    setLocationQuery('');
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    toast.loading("Uploading local data to cloud...", { id: 'cloud-sync' });
    try {
      // Added artificial delay to allow visual feedback
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (refreshLiveMonitor) await refreshLiveMonitor();
      setLastSync(new Date());
      toast.success("Database successfully backed up to Cloud.", { id: 'cloud-sync' });
    } catch (e) {
      toast.error("Failed to synchronize database.", { id: 'cloud-sync' });
    } finally {
      setIsSyncing(false);
    }
  };

  const getDynamicAlerts = () => {
    const alerts = [];
    const timeSinceSync = (new Date().getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    if (timeSinceSync > 24) {
       alerts.push({
         id: 'alert_sync', title: 'Cloud Sync Overdue',
         desc: 'Local SQLite data has not been backed up to Supabase in over 24 hours. Run a manual sync to ensure data safety.',
         style: { box: 'bg-rose-950/20 border-rose-900/30', dot: 'bg-rose-500', title: 'text-rose-400', btn: 'bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border-rose-500/20' },
         action: { label: 'Sync Now', onClick: handleManualSync }
       });
    }

    const todayRes = pendingReservations.filter(r => isToday(new Date(r.date)));
    if (tables.length > 0 && todayRes.length > (tables.length * 2)) {
      alerts.push({
         id: 'alert_res', title: 'High Booking Volume',
         desc: `There are ${todayRes.length} reservations scheduled for today. Consider limiting walk-ins.`,
         style: { box: 'bg-emerald-950/20 border-emerald-900/30', dot: 'bg-emerald-500', title: 'text-emerald-400', btn: 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border-emerald-500/20' },
         action: { label: 'Adjust Limits', onClick: () => navigate('/admin/policy-rates') }
       });
    }

    const recentVoids = activities.filter(a => a.type === 'admin_action' && a.description.includes('Voided') && new Date(a.timestamp).getTime() > Date.now() - 86400000);
    if (recentVoids.length > 5) {
       alerts.push({
         id: 'alert_voids', title: 'Unusual POS Activity',
         desc: `Detected ${recentVoids.length} voided transactions in the last 24 hours. Please review the system logs.`,
         style: { box: 'bg-rose-950/20 border-rose-900/30', dot: 'bg-rose-500', title: 'text-rose-400', btn: 'bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border-rose-500/20' },
         action: { label: 'View Logs', onClick: () => navigate('/admin/activity') }
       });
    }

    if (weather?.isRaining) {
      alerts.push({
         id: 'alert_weather', title: 'Inclement Weather Detected',
         desc: 'Rain is forecasted. Predictive models suggest a 30% increase in indoor walk-in traffic.',
         style: { box: 'bg-blue-950/20 border-blue-900/30', dot: 'bg-blue-500', title: 'text-blue-400', btn: '' },
       });
    }
    return alerts;
  };

  const dynamicAlerts = getDynamicAlerts();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Main Welcome - Clean, Theme-Responsive SaaS Design */}
        <div className={`flex flex-col justify-between h-full bg-neutral-950 border border-neutral-800 rounded-2xl p-6 md:col-span-2 ${weather ? 'lg:col-span-7' : 'lg:col-span-8'}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-black text-neutral-100 mb-1">Admin Dashboard</h1>
              <p className="text-sm text-neutral-500">Full control over One Shot Bar & Billiards operations.</p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl flex-shrink-0">
              <DollarSign size={15} className="text-emerald-500" />
              <div>
                <p className="text-xs font-black text-emerald-500">₱{totalRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-emerald-600/80 font-bold uppercase tracking-wider">Total Revenue</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Hourly Rate', value: `₱${rates.hourlyRate}/hr` },
              { label: 'Happy Hour', value: `₱${rates.weekdayHappyHourRate}/hr` },
              { label: 'Down Payment', value: `${rates.downPaymentPercent}%` },
            ].map(r => (
              <button key={r.label} onClick={() => navigate('/admin/policy-rates')}
                className="bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 rounded-xl p-3 text-left transition-colors h-full flex flex-col justify-between">
                <p className="text-sm font-black text-emerald-500">{r.value}</p>
                <p className="text-[10px] text-emerald-600/80 uppercase tracking-wider mt-1 font-bold">{r.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Database Sync Card */}
        <div className={`flex flex-col justify-between h-full bg-neutral-950 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden md:col-span-1 ${weather ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          <div className="absolute -right-4 -top-4 text-neutral-800 opacity-20 pointer-events-none"><Database size={100} /></div>
          <div>
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Database size={12} /> Local Database</h3>
            <p className="text-[10px] text-neutral-500 leading-relaxed mb-4">Running efficiently on local Database.</p>
          </div>
          <div className="space-y-3 mt-auto pt-4">
             <div className="flex justify-between items-center text-[10px] border-b border-neutral-800/60 pb-2">
                <span className="text-neutral-500">Last Cloud Sync:</span>
                <span className="text-neutral-300 font-semibold">{format(lastSync, 'MMM d, h:mm a')}</span>
             </div>
             <button onClick={handleManualSync} disabled={isSyncing} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${isSyncing ? 'bg-neutral-800 text-neutral-500 cursor-wait' : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-600/20'}`}>
               <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Syncing to Supabase...' : 'Run Cloud Backup'}
             </button>
          </div>
        </div>

        {/* Weather API Display */}
        {weather && (
          <div className={`flex flex-col justify-center h-full border rounded-2xl p-5 relative overflow-hidden md:col-span-1 lg:col-span-2 ${weather.isRaining ? 'bg-blue-950/20 border-blue-900/30' : 'bg-neutral-950 border-neutral-800'}`}>
            {weather.isRaining && <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />}
            <div className="flex items-center justify-between mb-3 relative z-10">
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Live Weather</p>
              <div className="flex items-center gap-2">
                {isEditingWeather ? (
                  <form onSubmit={handleWeatherSubmit} className="flex items-center gap-1">
                    <input type="text" value={locationQuery} onChange={e => setLocationQuery(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-[10px] text-neutral-100 outline-none focus:border-emerald-500 w-16" placeholder={weather.locationName} autoFocus />
                  </form>
                ) : (
                  <button onClick={() => setIsEditingWeather(true)} className="flex items-center gap-1 text-[9px] text-neutral-400 hover:text-neutral-100 transition-colors bg-neutral-900 px-1.5 py-1 rounded border border-neutral-800 truncate max-w-[80px]">
                    <MapPin size={8} className="flex-shrink-0" /> <span className="truncate">{weather.locationName}</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${weather.isRaining ? 'bg-blue-500/20 text-blue-400' : weather.condition === 'Clear' ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-400'}`}>
                {weather.isRaining ? <CloudRain size={20} /> : weather.condition === 'Clear' ? <Sun size={20} /> : <Cloud size={20} />}
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black text-neutral-100 truncate">{Math.round(weather.temp)}°C</p>
                <p className="text-[11px] font-semibold text-neutral-400 truncate">{weather.condition}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Staff Users',       value: activeUsers,       total: staffUsers.length,       color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: Users,        link: '/admin/users' },
          { label: 'Tables',            value: tables.filter(t=>t.status==='available').length, total: tables.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Table2, link: '/admin/tables' },
          { label: 'Active Promos',     value: activePromos,      total: promoCodes.length,       color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  icon: Tag,          link: '/admin/events' },
          { label: 'Live Announcements',value: activeAnn,         total: announcements.length,    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Megaphone,    link: '/admin/announcements' },
          { label: 'Upcoming Closures', value: upcomingClosed,    total: closedDates.length,      color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    icon: CalendarX2,   link: '/admin/events' },
        ].map(c => (
          <button key={c.label} onClick={() => navigate(c.link)} className={`bg-neutral-950 border rounded-xl p-4 text-left hover:scale-[1.02] transition-all group ${c.border}`}>
            <div className="flex items-start justify-between mb-3"><div className={`p-2 rounded-lg ${c.bg}`}><c.icon size={16} className={c.color} /></div></div>
            <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
            <p className="text-[11px] text-neutral-500 mt-1 font-medium">{c.label}{c.total !== undefined && <span className="text-neutral-700"> · {c.total} total</span>}</p>
          </button>
        ))}
      </div>

      {/* ── Dynamic Layout Bottom Half ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex flex-col h-[400px]">
          <h3 className="text-sm font-bold text-neutral-200 mb-4 flex items-center gap-2"><Bell size={15} className="text-sky-400" /> System Intelligence Alerts</h3>
          <div className="space-y-3 overflow-y-auto pr-2 flex-1">
            {dynamicAlerts.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <ShieldCheck size={32} className="mx-auto mb-3 text-emerald-500" />
                <p className="text-xs text-neutral-400">All systems operational.</p>
              </div>
            ) : (
              dynamicAlerts.map(alert => (
                <div key={alert.id} className={`p-3.5 rounded-xl border flex flex-col ${alert.style.box}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-2 h-2 rounded-full ${alert.style.dot} flex-shrink-0`} />
                    <p className={`text-xs font-bold ${alert.style.title}`}>{alert.title}</p>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">{alert.desc}</p>
                  {alert.action && (
                    <button onClick={alert.action.onClick} className={`align-self-start self-start text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors border ${alert.style.btn}`}>
                      {alert.action.label}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2"><CalendarDays size={15} className="text-purple-400" /> Incoming Bookings</h3>
            <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded font-bold text-neutral-400">{pendingReservations.length} Active</span>
          </div>
          <div className="space-y-2 overflow-y-auto pr-2 flex-1">
            {pendingReservations.length === 0 ? <p className="text-xs text-neutral-500 italic text-center py-6">No upcoming reservations</p> : (
              pendingReservations.slice(0, 10).map(r => {
                const isTodayRes = isToday(new Date(r.date));
                const isTomorrowRes = isTomorrow(new Date(r.date));
                const dateLabel = isTodayRes ? 'Today' : isTomorrowRes ? 'Tomorrow' : format(new Date(r.date), 'MMM d');
                return (
                  <div key={r.id} className="p-3 bg-neutral-900/50 border border-neutral-800/60 rounded-lg hover:bg-neutral-900 transition-colors flex items-center justify-between group">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-neutral-100 truncate">{r.customerName}</span>
                        {isTodayRes && <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[8px] font-bold uppercase tracking-wider">Today</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                        <span>{dateLabel}, {r.timeSlot}</span><span>·</span><span>{r.partySize} pax</span>
                      </div>
                    </div>
                    <button onClick={() => navigate('/admin/reservations')} className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-emerald-400 transition-all"><ArrowRight size={14} /></button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2"><TrendingUp size={15} className="text-emerald-400" /> Recent Feedback</h3>
            <button onClick={() => navigate('/admin/feedback')} className="text-[10px] text-neutral-500 hover:text-emerald-400 transition-colors font-medium">View All</button>
          </div>
          <div className="space-y-2 overflow-y-auto pr-2 flex-1">
            {feedback.length === 0 ? <p className="text-xs text-neutral-500 italic text-center py-6">No recent feedback</p> : feedback.slice(0, 6).map(f => (
              <div key={f.id} className="flex items-start gap-3 py-3 border-b border-neutral-800/50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400 flex-shrink-0">{f.customerName.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <p className="text-xs font-bold text-neutral-300 truncate pr-2">{f.customerName}</p>
                    {f.feedbackType && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold flex-shrink-0 ${
                        f.feedbackType === 'compliment' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        f.feedbackType === 'complaint' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>{f.feedbackType.replace('_', ' ')}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">"{f.comment}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}