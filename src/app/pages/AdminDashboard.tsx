import { useAppContext } from '../context/AppContext';
import { Users, Table2, Tag, Megaphone, CalendarX2, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { useNavigate } from 'react-router';

export function AdminDashboard() {
  const { staffUsers, tables, promoCodes, announcements, closedDates, rates, reservations, feedback } = useAppContext();
  const navigate = useNavigate();

  const activeUsers     = staffUsers.filter(u => u.isActive).length;
  const activePromos    = promoCodes.filter(p => p.isActive).length;
  const activeAnn       = announcements.filter(a => a.isActive).length;
  const upcomingClosed  = closedDates.filter(c => new Date(c.date) >= new Date()).length;
  const totalRevenue    = reservations.filter(r => r.status === 'completed').reduce((s, r) => s + r.totalAmount, 0);

  const cards = [
    { label: 'Staff Users',       value: activeUsers,       total: staffUsers.length,       color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: Users,        link: '/admin/users' },
    { label: 'Tables',            value: tables.filter(t=>t.status==='available').length, total: tables.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Table2, link: '/admin/tables', subLabel: 'available' },
    { label: 'Active Promos',     value: activePromos,      total: promoCodes.length,       color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  icon: Tag,          link: '/admin/promo-codes' },
    { label: 'Live Announcements',value: activeAnn,         total: announcements.length,    color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: Megaphone,    link: '/admin/announcements' },
    { label: 'Upcoming Closures', value: upcomingClosed,    total: closedDates.length,      color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    icon: CalendarX2,   link: '/admin/calendar' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-amber-950/40 to-neutral-950 border border-amber-900/30 rounded-2xl p-6">
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent feedback */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-neutral-200 mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-amber-400" /> Recent Feedback
          </h3>
          <div className="space-y-2">
            {feedback.slice(0, 4).map(f => (
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

        {/* Quick Links */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-neutral-200 mb-3">Quick Settings</h3>
          <div className="space-y-2">
            {[
              { label: 'Edit Hourly Rate', sub: `Currently ₱${rates.hourlyRate}/hr`, link: '/admin/rates', color: 'text-amber-400' },
              { label: 'Manage Promo Codes', sub: `${activePromos} active codes`, link: '/admin/promo-codes', color: 'text-violet-400' },
              { label: 'Post Announcement', sub: `${activeAnn} currently active`, link: '/admin/announcements', color: 'text-amber-400' },
              { label: 'Add Closing Date', sub: `${upcomingClosed} upcoming closures`, link: '/admin/calendar', color: 'text-rose-400' },
              { label: 'Edit Reservation Terms', sub: 'Pricing & policies', link: '/admin/reservation-terms', color: 'text-blue-400' },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.link)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-neutral-900 hover:bg-neutral-800/70 border border-neutral-800 hover:border-neutral-700 rounded-xl text-left transition-colors group">
                <div>
                  <p className={`text-xs font-semibold ${item.color}`}>{item.label}</p>
                  <p className="text-[10px] text-neutral-600">{item.sub}</p>
                </div>
                <span className="text-neutral-600 group-hover:text-neutral-400 text-xs">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
