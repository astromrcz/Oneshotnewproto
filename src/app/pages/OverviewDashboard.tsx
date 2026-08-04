import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router';
import {
  TableProperties, Users, Calendar, 
  AlertTriangle, Clock, ChevronRight, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { addMinutes, differenceInSeconds, differenceInMinutes, format, isToday, isFuture } from 'date-fns';

const formatPHP = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

function StatCard({ label, value, sub, color, icon: Icon, onClick }: {
  label: string; value: string | number; sub?: string;
  color: string; icon: React.ElementType; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex items-start justify-between ${onClick ? 'cursor-pointer hover:border-neutral-700 transition-colors' : ''}`}
    >
      <div>
        <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
        <p className={`text-3xl font-black ${color}`}>{value}</p>
        {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-lg ${color.replace('text-', 'bg-').replace('-400', '-500/10').replace('-500', '-500/10')}`}>
        <Icon size={20} className={color} />
      </div>
    </div>
  );
}

export function OverviewDashboard() {
  const { tables, queue, reservations, watchlist } = useAppContext() as any;
  const navigate = useNavigate();

  const activeWatchlist = watchlist?.filter((w: any) => w.status === 'active' && !w.isArchived) || [];

  const available = tables.filter((t: any) => t.isActive && t.status === 'available').length;
  const occupied = tables.filter((t: any) => t.isActive && t.status === 'occupied').length;
  const reserved = tables.filter((t: any) => t.isActive && t.status === 'reserved').length;
  const waiting = queue.filter((q: any) => q.status === 'waiting').length;

  // ── Wait time estimation ──────────────────────────────────────
  const waitingQueue = queue.filter((q: any) => q.status === 'waiting');
  const occupiedWithSession = tables.filter((t: any) => t.isActive && t.status === 'occupied' && t.session);

  const sortedEndTimes = occupiedWithSession
    .map((t: any) => addMinutes(new Date(t.session!.startTime), t.session!.durationMinutes))
    .sort((a: any, b: any) => a.getTime() - b.getTime());

  const estimateWaitForPosition = (position: number): string => {
    const slotsNeeded = position - available;
    if (slotsNeeded <= 0) return 'Now';
    if (slotsNeeded > sortedEndTimes.length) return 'TBD';
    const endTime = sortedEndTimes[slotsNeeded - 1];
    const mins = Math.max(0, differenceInMinutes(endTime, new Date()));
    if (mins === 0) return '< 1 min';
    if (mins < 5) return '< 5 min';
    return `~${mins} min`;
  };

  const overallWait = waitingQueue.length > 0 ? estimateWaitForPosition(waitingQueue.length) : null;

  const overtimeTables = tables.filter((t: any) => {
    if (!t.isActive || t.status !== 'occupied' || !t.session) return false;
    const end = addMinutes(new Date(t.session.startTime), t.session.durationMinutes);
    return new Date() > end;
  });

  const alertTables = tables.filter((t: any) => {
    if (!t.isActive || t.status !== 'occupied' || !t.session) return false;
    const end = addMinutes(new Date(t.session.startTime), t.session.durationMinutes);
    const secsLeft = differenceInSeconds(end, new Date());
    return secsLeft > 0 && secsLeft <= 900;
  });

  const upcomingReservations = reservations
    .filter((r: any) => (r.status === 'pending' || r.status === 'confirmed') && isFuture(new Date(r.date)))
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  const getReservationStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-emerald-400 bg-emerald-500/10';
      case 'pending': return 'text-amber-400 bg-amber-500/10';
      case 'checked-in': return 'text-blue-400 bg-blue-500/10';
      case 'completed': return 'text-neutral-400 bg-neutral-800';
      case 'cancelled': return 'text-rose-400 bg-rose-500/10';
      default: return 'text-neutral-400 bg-neutral-800';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Alerts */}
      {(overtimeTables.length > 0 || alertTables.length > 0) && (
        <div className="space-y-2">
          {overtimeTables.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 bg-rose-950/30 border border-rose-800/40 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-rose-400 flex-none" />
              <span className="text-sm text-rose-300">
                <strong>{t.name}</strong> — <span className="font-medium">{t.session?.customerName}</span>'s session has exceeded the paid time. Overtime charges may apply.
              </span>
              <button onClick={() => navigate('/staff/tables')} className="ml-auto text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1">
                View <ChevronRight size={12} />
              </button>
            </div>
          ))}
          {alertTables.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3">
              <Clock size={16} className="text-amber-400 flex-none" />
              <span className="text-sm text-amber-300">
                <strong>{t.name}</strong> — <span className="font-medium">{t.session?.customerName}</span>'s session ends in less than 15 minutes.
              </span>
              <button onClick={() => navigate('/staff/tables')} className="ml-auto text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
                View <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Available Tables" value={available} sub={`of ${tables.length} total`} color="text-emerald-400" icon={TableProperties} onClick={() => navigate('/staff/tables')} />
        <StatCard label="Occupied" value={occupied} sub={`${reserved} reserved`} color="text-amber-400" icon={TableProperties} onClick={() => navigate('/staff/tables')} />
        <StatCard label="Waiting Queue" value={waiting} sub="FCFS order" color="text-purple-400" icon={Users} onClick={() => navigate('/staff/queue')} />
        <StatCard label="Overtime Tables" value={overtimeTables.length} sub="Requires attention" color="text-rose-400" icon={Clock} onClick={() => navigate('/staff/tables')} />
      </div>

      {/* Table Grid Quick View */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-300">Table Status</h2>
          <button onClick={() => navigate('/staff/tables')} className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1 font-semibold">
            Manage Tables <ChevronRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {tables.filter((t: any) => t.isActive).map((t: any) => {
            const isOpenTime = t.status === 'occupied' && t.session && (t.session.isOpenTime || t.session.durationMinutes === null);
            const isOvertime = !isOpenTime && t.status === 'occupied' && t.session && (() => {
              const end = addMinutes(new Date(t.session!.startTime), t.session!.durationMinutes!);
              return new Date() > end;
            })();
            const isAlert = !isOpenTime && !isOvertime && t.status === 'occupied' && t.session && (() => {
              const end = addMinutes(new Date(t.session!.startTime), t.session!.durationMinutes!);
              const secs = differenceInSeconds(end, new Date());
              return secs > 0 && secs <= 900;
            })();
            
            return (
              <div
                key={t.id}
                onClick={() => navigate('/staff/tables')}
                title={`${t.name}${t.session ? ` — ${t.session.customerName}` : ''} (${t.status})`}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer border transition-all text-[10px] font-bold
                  ${t.status === 'maintenance' ? 'bg-orange-950/40 border-orange-800/40 text-orange-500 opacity-60' :
                    isOvertime ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse' :
                    isOpenTime ? 'bg-blue-950/40 border-blue-800/40 text-blue-400' :
                    isAlert ? 'bg-rose-950/40 border-rose-500/50 text-rose-400' :
                    t.status === 'occupied' ? 'bg-amber-950/40 border-amber-800/40 text-amber-400' :
                    t.status === 'reserved' ? 'bg-sky-950/40 border-sky-800/40 text-sky-400' :
                    'bg-emerald-950/20 border-emerald-800/30 text-emerald-500'}
                `}
              >
                {t.id.replace('t', '')}
              </div>
            );
          })}
        </div>
        
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {[
            { color: 'bg-emerald-500', label: 'Open' },
            { color: 'bg-amber-500', label: 'In Use' },
            { color: 'bg-blue-500', label: 'Open Time' },
            { color: 'bg-rose-500', label: 'Overtime' },
            { color: 'bg-sky-500', label: 'Reserved' },
            { color: 'bg-orange-500', label: 'Maintenance' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
              <span className="text-xs text-neutral-500 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Upcoming Reservations */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
              <Calendar size={15} className="text-neutral-500" /> Upcoming Reservations
            </h2>
            <button onClick={() => navigate('/staff/reservations')} className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1 font-semibold">
              View All <ChevronRight size={12} />
            </button>
          </div>
          {upcomingReservations.length === 0 ? (
            <div className="text-center py-6">
              <Calendar size={24} className="mx-auto text-neutral-700 mb-2" />
              <p className="text-sm text-neutral-600">No upcoming reservations</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingReservations.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 bg-neutral-900 rounded-lg px-3 py-2.5 border border-neutral-800/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-200 truncate">{r.customerName}</p>
                    <p className="text-xs text-neutral-500">
                      {format(new Date(r.date), 'MMM d')} · {r.timeSlot} · {r.durationHours}h · {r.partySize} pax
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getReservationStatusColor(r.status)}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Queue Snapshot */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
              <Users size={15} className="text-neutral-500" /> Walk-in Queue
              {waiting > 0 && <span className="bg-amber-500 text-black text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">{waiting}</span>}
            </h2>
            <button onClick={() => navigate('/staff/queue')} className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1 font-semibold">
              Manage <ChevronRight size={12} />
            </button>
          </div>
          {waitingQueue.length === 0 ? (
            <div className="flex items-center gap-2 py-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <p className="text-sm text-neutral-500">No customers waiting</p>
            </div>
          ) : (
            <div className="space-y-2">
              {waitingQueue.slice(0, 3).map((q: any, i: number) => {
                const est = estimateWaitForPosition(i + 1);
                const isNow = est === 'Now';
                return (
                  <div key={q.id} className="flex items-center gap-2.5 text-sm">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-400 flex-none">{i + 1}</span>
                    <span className="text-neutral-300 font-medium flex-1 truncate">{q.customerName}</span>
                    <span className="text-xs text-neutral-500 flex-none">{q.partySize} pax</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-none ${isNow ? 'bg-emerald-500/15 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>
                      {isNow ? '✓ Now' : est}
                    </span>
                  </div>
                );
              })}
              {waitingQueue.length > 3 && (
                <p className="text-xs text-neutral-600 pl-7">+{waitingQueue.length - 3} more</p>
              )}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-neutral-800/60">
                <span className="text-[10px] text-neutral-600 flex items-center gap-1">
                  <Clock size={10} /> Est. max wait
                </span>
                <span className={`text-[10px] font-semibold ${overallWait === 'Now' ? 'text-emerald-400' : overallWait === 'TBD' ? 'text-neutral-500' : 'text-amber-400'}`}>
                  {overallWait}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Watchlist Snapshot */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
              <ShieldAlert size={15} className="text-rose-500" /> Security Watchlist
              {activeWatchlist.length > 0 && <span className="bg-rose-500 text-white text-[10px] font-black rounded-full px-2 py-0.5 flex items-center justify-center">{activeWatchlist.length}</span>}
            </h2>
            <button onClick={() => navigate('/staff/watchlist')} className="text-xs text-rose-500 hover:text-rose-400 flex items-center gap-1 font-semibold">
              Manage <ChevronRight size={12} />
            </button>
          </div>
          {activeWatchlist.length === 0 ? (
            <div className="flex items-center gap-2 py-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <p className="text-sm text-neutral-500">No active security alerts</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeWatchlist.slice(0, 4).map((w: any) => (
                <div key={w.id} className="flex flex-col gap-1 bg-rose-950/20 rounded-lg px-3 py-2.5 border border-rose-900/30">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-rose-400 truncate pr-2">{w.name}</p>
                    <span className="text-[9px] uppercase tracking-wider font-bold bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded flex-shrink-0">{w.reason}</span>
                  </div>
                  <p className="text-xs text-neutral-400 line-clamp-1">{w.description}</p>
                </div>
              ))}
              {activeWatchlist.length > 4 && (
                <p className="text-xs text-rose-500/70 pl-2">+{activeWatchlist.length - 4} more flagged</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}