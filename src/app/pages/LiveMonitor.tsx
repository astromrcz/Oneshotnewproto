import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Table, QueueItem } from '../context/AppContext';
import { Clock, Users, X, Maximize2, Sparkles } from 'lucide-react';
import { addMinutes, differenceInSeconds } from 'date-fns';

// ── Helpers ────────────────────────────────────────────────────
function getSessionTimer(table: Table): {
  mm: string; ss: string; isOvertime: boolean; percentLeft: number; label: string;
} {
  if (!table.session) return { mm: '--', ss: '--', isOvertime: false, percentLeft: 0, label: '' };
  const start = new Date(table.session.startTime).getTime();
  const totalMs = table.session.durationMinutes * 60000;
  const elapsed = Date.now() - start;
  const remaining = totalMs - elapsed;
  const isOvertime = remaining < 0;
  const abs = Math.abs(remaining);
  const mm = String(Math.floor(abs / 60000)).padStart(2, '0');
  const ss = String(Math.floor((abs % 60000) / 1000)).padStart(2, '0');
  const percentLeft = Math.max(0, Math.min(100, (remaining / totalMs) * 100));
  const label = isOvertime ? `+${mm}:${ss} Overtime` : `${mm}:${ss} remaining`;
  return { mm, ss, isOvertime, percentLeft, label };
}

// ── Single Table Card ──────────────────────────────────────────
function TableCard({ table, tick }: { table: Table; tick: number }) {
  const timer = getSessionTimer(table);

  if (table.status === 'available') {
    return (
      <div className="relative bg-emerald-950/30 border-2 border-emerald-700/50 rounded-2xl p-5 flex flex-col items-center gap-3 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center">
          <span className="text-emerald-400 font-black text-lg">{table.name.replace('Table ', '')}</span>
        </div>
        <div className="text-center">
          <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">{table.name}</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-emerald-400 font-black text-lg">OPEN</span>
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">Walk-in Welcome</p>
        </div>
      </div>
    );
  }

  if (table.status === 'reserved') {
    return (
      <div className="bg-blue-950/30 border-2 border-blue-700/40 rounded-2xl p-5 flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
          <span className="text-blue-400 font-black text-lg">{table.name.replace('Table ', '')}</span>
        </div>
        <div className="text-center">
          <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">{table.name}</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-blue-300 font-black text-lg">RESERVED</span>
          </div>
          <p className="text-[11px] text-blue-600 mt-1">Pre-booked</p>
        </div>
      </div>
    );
  }

  // Occupied
  return (
    <div className={`relative border-2 rounded-2xl p-5 flex flex-col gap-3 overflow-hidden ${
      timer.isOvertime
        ? 'bg-rose-950/40 border-rose-600/60'
        : 'bg-neutral-900/80 border-neutral-700/50'
    }`}>
      {timer.isOvertime && (
        <div className="absolute inset-0 bg-rose-500/5 animate-pulse pointer-events-none" />
      )}

      {/* Table number + customer */}
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black">{table.name.replace('Table ', '')}</span>
        </div>
        <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
          timer.isOvertime
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
        }`}>
          {timer.isOvertime ? '⚠ OVERTIME' : 'IN USE'}
        </div>
      </div>

      {/* Customer name */}
      <div>
        <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Customer</p>
        <p className="text-white font-bold text-sm mt-0.5 truncate">{table.session?.customerName || '—'}</p>
      </div>

      {/* Countdown */}
      <div className="text-center">
        <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
          {timer.isOvertime ? 'Overtime' : 'Time Left'}
        </p>
        <div className={`font-black text-4xl tabular-nums tracking-tight ${
          timer.isOvertime ? 'text-rose-400' : timer.percentLeft < 15 ? 'text-amber-400' : 'text-white'
        }`}>
          {timer.mm}:{timer.ss}
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          {!timer.isOvertime && (
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                timer.percentLeft < 15 ? 'bg-rose-500' : timer.percentLeft < 30 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${timer.percentLeft}%` }}
            />
          )}
          {timer.isOvertime && (
            <div className="h-full w-full bg-rose-500/40 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Queue Row ──────────────────────────────────────────────────
function QueueRow({ item, position, estWait }: { item: QueueItem; position: number; estWait: string }) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${
      item.status === 'called'
        ? 'bg-emerald-950/40 border-emerald-700/40'
        : 'bg-neutral-900/60 border-neutral-800/60'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm ${
        item.status === 'called'
          ? 'bg-emerald-600 text-white'
          : position === 1
          ? 'bg-amber-600/20 border border-amber-600/40 text-amber-400'
          : 'bg-neutral-800 border border-neutral-700 text-neutral-400'
      }`}>
        {position}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm truncate ${item.status === 'called' ? 'text-emerald-300' : 'text-white'}`}>
          {item.customerName}
        </p>
        <p className="text-[11px] text-neutral-500">{item.partySize} person{item.partySize > 1 ? 's' : ''}</p>
      </div>
      {item.status === 'called' ? (
        <div className="flex items-center gap-1.5 bg-emerald-600/20 border border-emerald-600/30 px-2.5 py-1 rounded-full flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-semibold">Proceed to Table</span>
        </div>
      ) : (
        <div className="text-right flex-shrink-0 flex flex-col items-end">
          <div className="flex items-center gap-1 text-emerald-400 font-semibold text-xs">
            <Sparkles size={10} />
            <span>{estWait}</span>
          </div>
          <p className="text-[9px] text-neutral-600 uppercase tracking-wider font-semibold">AI Estimate</p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export function LiveMonitor() {
  const { tables, queue } = useAppContext();
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(new Date());

  // Refresh timers every second
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setNow(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // --- GLOBAL AI WAIT-TIME ESTIMATOR ---
  const calculateAIWaitTime = (position: number) => {
    const activeTables = tables.filter(t => t.status === 'occupied' && t.session);
    if (activeTables.length === 0) return "0 mins";

    const remainingTimes = activeTables.map(t => {
      const endTime = addMinutes(new Date(t.session!.startTime), t.session!.durationMinutes);
      return Math.max(0, Math.floor(differenceInSeconds(endTime, now) / 60));
    }).sort((a, b) => a - b);

    // AI Pattern: Soonest table free + 2 mins turnaround + 15 mins step penalty per position ahead
    const baseWait = remainingTimes[0] !== undefined ? remainingTimes[0] : 0;
    const estimatedMinutes = baseWait + 2 + ((position - 1) * 15);

    if (estimatedMinutes < 60) return `${estimatedMinutes} mins`;
    const h = Math.floor(estimatedMinutes / 60);
    const m = estimatedMinutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const availableCount = tables.filter(t => t.status === 'available').length;
  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const reservedCount = tables.filter(t => t.status === 'reserved').length;
  const waitingQueue = queue.filter(q => q.status === 'waiting' || q.status === 'called');

  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col overflow-auto">
      {/* Header Bar */}
      <header className="flex-none bg-black/60 border-b border-neutral-800/80 px-6 py-4 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-950">
            <span className="text-white font-black text-base tracking-tight">1S</span>
          </div>
          <div>
            <p className="text-white font-black text-base tracking-tight leading-tight">ONE SHOT BAR & BILLIARDS</p>
            <p className="text-[11px] text-neutral-500 uppercase tracking-widest">Live Table Status & Walk-in Queue</p>
          </div>
        </div>

        {/* Live clock */}
        <div className="text-right">
          <p className="text-2xl font-black text-white tabular-nums tracking-tight">{timeStr}</p>
          <p className="text-[11px] text-neutral-500">{dateStr}</p>
        </div>
      </header>

      {/* Status Summary Bar */}
      <div className="flex-none bg-neutral-900/50 border-b border-neutral-800/50 px-6 py-3 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
          <span className="text-sm font-semibold text-emerald-300">{availableCount} Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-sm font-semibold text-amber-300">{occupiedCount} In Use</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-sm font-semibold text-blue-300">{reservedCount} Reserved</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-neutral-500 uppercase tracking-widest font-semibold">Live</span>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* Tables Section */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-emerald-500 rounded-full" />
            <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-widest">Table Status</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {tables.map(table => (
              <TableCard key={table.id} table={table} tick={tick} />
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 text-[11px] text-neutral-600">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-700" /> Available — walk up to any open table</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-neutral-700" /> In Use — countdown shows remaining time</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-800" /> Reserved — pre-booked slot</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-800" /> Overtime — please see staff</div>
          </div>
        </div>

        {/* Queue Section */}
        <div className="lg:w-80 xl:w-96 flex-none border-t lg:border-t-0 lg:border-l border-neutral-800/60 bg-neutral-950/60 flex flex-col">
          <div className="px-5 pt-5 pb-3 border-b border-neutral-800/40">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 bg-amber-500 rounded-full" />
              <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-widest">Walk-in Queue</h2>
            </div>
            <p className="text-[11px] text-neutral-600 pl-3.5 flex items-center gap-1">
              <Sparkles size={11} className="text-emerald-400" /> Powered by Predictive AI
            </p>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {waitingQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-950/40 border border-emerald-800/30 flex items-center justify-center">
                  <Users size={22} className="text-emerald-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-emerald-400">No Queue</p>
                  <p className="text-[11px] text-neutral-600 mt-0.5">Walk right in — tables available!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {waitingQueue.map((item, i) => (
                  <QueueRow key={item.id} item={item} position={i + 1} estWait={calculateAIWaitTime(i + 1)} />
                ))}
              </div>
            )}
          </div>

          {/* Queue footer info */}
          <div className="p-4 border-t border-neutral-800/40">
            <div className="bg-neutral-900/80 border border-neutral-800/60 rounded-xl p-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-neutral-600">Parties waiting</span>
                <span className="text-neutral-300 font-semibold">{waitingQueue.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Rate per hour</span>
                <span className="text-neutral-300 font-semibold">₱250 / hr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Happy Hour (6–8PM)</span>
                <span className="text-amber-400 font-semibold">₱200 / hr</span>
              </div>
            </div>
            <p className="text-[10px] text-neutral-700 text-center mt-3 leading-relaxed">
              Please see staff at the counter to<br />join the queue or for assistance.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex-none bg-black/40 border-t border-neutral-800/50 px-6 py-2 flex items-center justify-between">
        <p className="text-[11px] text-neutral-700">Autobase OAX, San Juan, Cainta, Rizal · Mon–Sat 12PM–3AM · Sun 5PM–3AM</p>
        <a
          href="/staff"
          className="text-[11px] text-neutral-700 hover:text-neutral-500 transition-colors"
        >
          ← Staff Dashboard
        </a>
      </footer>
    </div>
  );
}