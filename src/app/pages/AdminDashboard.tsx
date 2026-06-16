import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Users, Table2, Tag, Megaphone, CalendarX2, DollarSign, TrendingUp, Bell, CloudRain, Sun, Cloud, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router';

export function AdminDashboard() {
  const { staffUsers, tables, promoCodes, announcements, closedDates, rates, reservations, feedback, weather, updateWeatherLocation } = useAppContext();
  const navigate = useNavigate();

  // Local state to toggle the Weather Location Editor
  const [isEditingWeather, setIsEditingWeather] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');

  const activeUsers     = staffUsers.filter(u => u.isActive).length;
  const activePromos    = promoCodes.filter(p => p.isActive).length;
  const activeAnn       = announcements.filter(a => a.isActive).length;
  const upcomingClosed  = closedDates.filter(c => new Date(c.date) >= new Date()).length;
  const totalRevenue    = reservations.filter(r => r.status === 'completed').reduce((s, r) => s + r.totalAmount, 0);

  const handleWeatherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(locationQuery.trim()) {
       updateWeatherLocation(locationQuery); // Send to AppContext to fetch new coordinates
    }
    setIsEditingWeather(false);
  };

  const cards = [
    { label: 'Staff Users',       value: activeUsers,       total: staffUsers.length,       color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: Users,        link: '/admin/users' },
    { label: 'Tables',            value: tables.filter(t=>t.status==='available').length, total: tables.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Table2, link: '/admin/tables', subLabel: 'available' },
    { label: 'Active Promos',     value: activePromos,      total: promoCodes.length,       color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  icon: Tag,          link: '/admin/events' },
    { label: 'Live Announcements',value: activeAnn,         total: announcements.length,    color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: Megaphone,    link: '/admin/announcements' },
    { label: 'Upcoming Closures', value: upcomingClosed,    total: closedDates.length,      color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    icon: CalendarX2,   link: '/admin/events' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome & Weather */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-r from-amber-950/40 to-neutral-950 border border-amber-900/30 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-black text-white mb-1">Admin Dashboard</h1>
              <p className="text-sm text-neutral-400">Full control over One Shot Bar & Billiards operations.</p>
            </div>
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl flex-shrink-0">
              <DollarSign size={15} className="text-amber-400" />
              <div>
                <p className="text-xs font-black text-amber-400">₱{totalRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-amber-700">Total Revenue</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Hourly Rate', value: `₱${rates.hourlyRate}/hr`, link: '/admin/rates' },
              { label: 'Happy Hour', value: `₱${rates.happyHourRate}/hr`, link: '/admin/rates' },
              { label: 'Down Payment', value: `${rates.downPaymentPercent}%`, link: '/admin/rates' },
            ].map(r => (
              <button key={r.label} onClick={() => navigate(r.link)}
                className="bg-amber-950/20 border border-amber-900/20 rounded-xl p-3 text-left hover:border-amber-700/30 transition-colors">
                <p className="text-sm font-black text-amber-300">{r.value}</p>
                <p className="text-[10px] text-amber-700 uppercase tracking-wider">{r.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Weather API Display */}
        {weather && (
          <div className={`border rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden ${
            weather.isRaining ? 'bg-blue-950/20 border-blue-900/30' : 'bg-neutral-950 border-neutral-800'
          }`}>
            {weather.isRaining && <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />}
            
            <div className="flex items-center justify-between mb-3 relative z-10">
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Live Local Weather</p>
              
              <div className="flex items-center gap-2">
                {isEditingWeather ? (
                  <form onSubmit={handleWeatherSubmit} className="flex items-center gap-1">
                    <input 
                      type="text" 
                      value={locationQuery}
                      onChange={e => setLocationQuery(e.target.value)}
                      className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-amber-500 w-28"
                      placeholder={weather.locationName}
                      autoFocus
                    />
                    <button type="submit" className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded transition-colors">Save</button>
                    <button type="button" onClick={() => setIsEditingWeather(false)} className="text-xs text-neutral-500 hover:text-white px-1"><X size={12}/></button>
                  </form>
                ) : (
                  <button onClick={() => setIsEditingWeather(true)} className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white transition-colors bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                    <MapPin size={10} /> {weather.locationName}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 relative z-10">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${weather.isRaining ? 'bg-blue-500/20 text-blue-400' : weather.condition === 'Clear' ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-400'}`}>
                {weather.isRaining ? <CloudRain size={24} /> : weather.condition === 'Clear' ? <Sun size={24} /> : <Cloud size={24} />}
              </div>
              <div className="min-w-0">
                <p className="text-3xl font-black text-white truncate">{Math.round(weather.temp)}°C</p>
                <p className="text-sm font-semibold text-neutral-400 truncate">{weather.condition}</p>
              </div>
            </div>
            {weather.isRaining && (
              <p className="text-[10px] font-bold text-blue-400 mt-4 bg-blue-950/50 px-2 py-1.5 rounded border border-blue-900/50 inline-block">
                Predictive Queue: High Walk-in Traffic Expected
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(c => (
          <button key={c.label} onClick={() => navigate(c.link)}
            className={`bg-neutral-950 border rounded-xl p-4 text-left hover:scale-[1.01] transition-all group ${c.border}`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <c.icon size={16} className={c.color} />
              </div>
              <span className="text-[10px] text-neutral-600 group-hover:text-neutral-500 font-medium">Manage →</span>
            </div>
            <p className={`text-3xl font-black ${c.color}`}>{c.value}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {c.label}
              {c.total !== undefined && <span className="text-neutral-700"> · {c.total} total{c.subLabel ? ` · ${c.subLabel}` : ''}</span>}
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Notifications & System Alerts */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex flex-col max-h-[350px]">
          <h3 className="text-sm font-bold text-neutral-200 mb-4 flex items-center gap-2">
            <Bell size={15} className="text-sky-400" /> Notifications & Alerts
          </h3>
          <div className="space-y-3 overflow-y-auto pr-2">
            {/* Supabase Backup Alert */}
            <div className="flex gap-3 items-start p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-indigo-300">System Automatic Backup</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                  Supabase successfully completed the monthly database snapshot. A downloadable backup file is now available in your storage bucket.
                </p>
              </div>
            </div>

            {/* Analytics Alert */}
            <div className="flex gap-3 items-start p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-300">Analytics Insight</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                  Revenue is up 12% compared to last week. The new "Happy Hour" promo code was utilized 15 times, driving a surge in early evening reservations.
                </p>
              </div>
            </div>

            {/* Calendar Alert */}
            <div className="flex gap-3 items-start p-3 bg-amber-950/20 border border-amber-900/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-300">Upcoming Event Reminder</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                  The "Spooky Shots Halloween Tournament" is scheduled in 2 days. 32 participants are currently registered. Ensure tables 1-5 are locked for tournament use.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent feedback */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex flex-col max-h-[350px]">
          <h3 className="text-sm font-bold text-neutral-200 mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-amber-400" /> Recent Feedback
          </h3>
          <div className="space-y-2 overflow-y-auto pr-2">
            {feedback.length === 0 ? (
              <p className="text-xs text-neutral-500 italic text-center py-6">No recent feedback</p>
            ) : feedback.slice(0, 4).map(f => (
              <div key={f.id} className="flex items-start gap-3 py-2 border-b border-neutral-800/50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400 flex-shrink-0">
                  {f.customerName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-300">{f.customerName}</p>
                  <p className="text-[11px] text-neutral-500 truncate">"{f.comment}"</p>
                </div>
                {f.feedbackType && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                    f.feedbackType === 'compliment' ? 'bg-emerald-500/10 text-emerald-400' :
                    f.feedbackType === 'complaint' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>{f.feedbackType}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}