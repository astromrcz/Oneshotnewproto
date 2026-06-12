import { useState } from 'react';
import { useAppContext, HOURLY_RATE } from '../context/AppContext';
import { TableCard } from '../components/TableCard';
import {
  Search, Play, Zap, X, UserPlus, Clock,
  Calendar, Users, CheckCircle, ChevronRight,
  CreditCard, Banknote, AlertTriangle, CircleCheck
} from 'lucide-react';
import { isToday, differenceInSeconds, addMinutes } from 'date-fns';

type FilterStatus = 'all' | 'available' | 'occupied' | 'reserved' | 'maintenance';
type PaymentMethod = 'gcash' | 'cash';
type PaymentStatus = 'paid' | 'partial' | 'unpaid';

const formatPHP = (amount: number) => `₱${amount.toFixed(2)}`;

type CustomerSource =
  | { kind: 'queue';        id: string; name: string; partySize: number; contact: string; notes?: string }
  | { kind: 'reservation';  id: string; name: string; partySize: number; contact: string; durationHours: number; timeSlot: string };

export function Tables() {
  const { tables, queue, reservations, assignTable, extendSession, freeTable } = useAppContext();
  const [filter, setFilter]       = useState<FilterStatus>('all');
  const [search, setSearch]       = useState('');
  const [assigningTableId, setAssigningTableId] = useState<string | null>(null);
  const [extendingTableId, setExtendingTableId] = useState<string | null>(null);
  const [endingTableId,    setEndingTableId]    = useState<string | null>(null);

  // Near-end banner dismissed set
  const [dismissedNearEnd, setDismissedNearEnd] = useState<Set<string>>(new Set());

  // Assign form state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSource | null>(null);
  const [customerName,     setCustomerName]      = useState('');
  const [durationMinutes,  setDurationMinutes]   = useState(60);
  const [amountPaid,       setAmountPaid]        = useState('');

  // Extend form + payment state
  const [extendMinutes,       setExtendMinutes]       = useState(60);
  const [extendPayStatus,     setExtendPayStatus]     = useState<PaymentStatus>('paid');
  const [extendPayMethod,     setExtendPayMethod]     = useState<PaymentMethod>('cash');
  const [extendPartialAmount, setExtendPartialAmount] = useState('');

  // End session payment state
  const [endPayStatus,     setEndPayStatus]     = useState<PaymentStatus>('paid');
  const [endPayMethod,     setEndPayMethod]     = useState<PaymentMethod>('cash');
  const [endPartialAmount, setEndPartialAmount] = useState('');

  // ── Derived ───────────────────────────────────────────────────
  const activeTables = tables.filter(t => t.isActive);
  const available    = activeTables.filter(t => t.status === 'available').length;
  const occupied     = activeTables.filter(t => t.status === 'occupied').length;
  const reserved     = activeTables.filter(t => t.status === 'reserved').length;
  const maintenance  = activeTables.filter(t => t.status === 'maintenance').length;

  const filtered = activeTables.filter(t => {
    const matchFilter = filter === 'all' || t.status === filter;
    const matchSearch = !search
      || t.name.toLowerCase().includes(search.toLowerCase())
      || (t.session?.customerName.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  // ── Near-end sessions (≤10 mins remaining, not overtime) ──────
  const nearEndTables = activeTables.filter(t => {
    if (t.status !== 'occupied' || !t.session) return false;
    const endTime = addMinutes(new Date(t.session.startTime), t.session.durationMinutes);
    const secsLeft = differenceInSeconds(endTime, new Date());
    return secsLeft > 0 && secsLeft <= 10 * 60;
  });

  // ── Customer picker data ───────────────────────────────────────
  const waitingCustomers: CustomerSource[] = queue
    .filter(q => q.status === 'waiting')
    .map(q => ({ kind: 'queue', id: q.id, name: q.customerName, partySize: q.partySize, contact: q.contactNumber, notes: q.notes }));

  const todayReservations: CustomerSource[] = reservations
    .filter(r => (r.status === 'confirmed' || r.status === 'pending') && isToday(new Date(r.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(r => ({ kind: 'reservation', id: r.id, name: r.customerName, partySize: r.partySize, contact: r.contactNumber, durationHours: r.durationHours, timeSlot: r.timeSlot }));

  const allCustomers: CustomerSource[] = [...waitingCustomers, ...todayReservations];

  // ── End session derived values ─────────────────────────────────
  const endingTable = tables.find(t => t.id === endingTableId);
  const getEndSessionInfo = () => {
    if (!endingTable?.session) return null;
    const { startTime, durationMinutes: bookedMins, amountPaid: alreadyPaid, hourlyRate } = endingTable.session;
    const now = new Date();
    const elapsedSecs = differenceInSeconds(now, new Date(startTime));
    const elapsedMins = Math.ceil(elapsedSecs / 60);
    const endTime = addMinutes(new Date(startTime), bookedMins);
    const isOvertime = now > endTime;
    const overtimeMins = isOvertime ? Math.ceil(differenceInSeconds(now, endTime) / 60) : 0;
    const bookedCharge = (bookedMins / 60) * hourlyRate;
    const overtimeCharge = (overtimeMins / 60) * hourlyRate;
    const totalDue = bookedCharge + overtimeCharge;
    const balance = Math.max(0, totalDue - alreadyPaid);
    return { elapsedMins, alreadyPaid, bookedCharge, overtimeCharge, totalDue, balance, isOvertime, overtimeMins };
  };
  const endInfo = getEndSessionInfo();

  // ── Extend derived values ──────────────────────────────────────
  const extendingTable = tables.find(t => t.id === extendingTableId);
  const extendCharge = (extendMinutes / 60) * HOURLY_RATE;

  // ── Handlers ──────────────────────────────────────────────────
  const openAssign = (tableId: string) => {
    setAssigningTableId(tableId);
    setSelectedCustomer(null);
    setCustomerName('');
    setDurationMinutes(60);
    setAmountPaid('');
  };

  const openEnd = (tableId: string) => {
    setEndingTableId(tableId);
    setEndPayStatus('paid');
    setEndPayMethod('cash');
    setEndPartialAmount('');
  };

  const openExtend = (tableId: string) => {
    setExtendingTableId(tableId);
    setExtendMinutes(60);
    setExtendPayStatus('paid');
    setExtendPayMethod('cash');
    setExtendPartialAmount('');
  };

  const pickCustomer = (c: CustomerSource) => {
    setSelectedCustomer(c);
    setCustomerName(c.name);
    if (c.kind === 'reservation') {
      const mins = c.durationHours * 60;
      setDurationMinutes(mins);
      setAmountPaid(((mins / 60) * HOURLY_RATE).toFixed(2));
    } else {
      setAmountPaid(((durationMinutes / 60) * HOURLY_RATE).toFixed(2));
    }
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTableId || !customerName) return;
    const autoPayment = (durationMinutes / 60) * HOURLY_RATE;
    assignTable(assigningTableId, {
      customerName,
      durationMinutes,
      startTime: new Date(),
      isPaid: true,
      hourlyRate: HOURLY_RATE,
      amountPaid: parseFloat(amountPaid) || autoPayment,
    });
    setAssigningTableId(null);
    setSelectedCustomer(null);
    setCustomerName('');
    setDurationMinutes(60);
    setAmountPaid('');
  };

  const handleConfirmEnd = () => {
    if (!endingTableId || !endInfo) return;
    freeTable(endingTableId);
    setEndingTableId(null);
  };

  const handleConfirmExtend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingTableId) return;
    const charge = extendPayStatus === 'paid'
      ? extendCharge
      : extendPayStatus === 'partial'
        ? parseFloat(extendPartialAmount) || 0
        : 0;
    extendSession(extendingTableId, extendMinutes, charge);
    setExtendingTableId(null);
  };

  const getNextReservation = (tableId: string) => {
    const now = new Date();
    const upcoming = reservations
      .filter(r => r.tableId === tableId && (r.status === 'pending' || r.status === 'confirmed') && new Date(r.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (!upcoming.length) return null;
    const r = upcoming[0];
    return { date: new Date(r.date), customerName: r.customerName, timeSlot: r.timeSlot };
  };

  const filterBtns: { key: FilterStatus; label: string; count: number; color: string }[] = [
    { key: 'all',         label: 'All',         count: activeTables.length, color: 'bg-neutral-800 text-neutral-200 border-neutral-700' },
    { key: 'available',   label: 'Available',   count: available,           color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    { key: 'occupied',    label: 'Occupied',    count: occupied,            color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    { key: 'reserved',    label: 'Reserved',    count: reserved,            color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    { key: 'maintenance', label: 'Maintenance', count: maintenance,         color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  ];

  const durationOptions = [30, 60, 90, 120, 180, 240];
  const extendOptions   = [30, 60, 90, 120];

  // Payment status / method helpers
  const PayStatusBtn = ({ value, current, label, onChange }: { value: PaymentStatus; current: PaymentStatus; label: string; onChange: (v: PaymentStatus) => void }) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
        current === value
          ? value === 'paid'    ? 'bg-emerald-600/15 border-emerald-600 text-emerald-400'
          : value === 'partial' ? 'bg-amber-600/15 border-amber-600 text-amber-400'
          :                       'bg-rose-600/15 border-rose-600 text-rose-400'
          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
      }`}
    >
      {label}
    </button>
  );

  const PayMethodBtn = ({ value, current, icon: Icon, label, onChange }: { value: PaymentMethod; current: PaymentMethod; icon: any; label: string; onChange: (v: PaymentMethod) => void }) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
        current === value
          ? 'bg-emerald-600/15 border-emerald-600 text-emerald-400'
          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Available',    value: available,   color: 'text-emerald-400' },
          { label: 'Occupied',     value: occupied,    color: 'text-rose-400' },
          { label: 'Reserved',     value: reserved,    color: 'text-amber-400' },
          { label: 'Maintenance',  value: maintenance, color: 'text-orange-400' },
        ].map(s => (
          <div key={s.label} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Near-End Session Warning Banner */}
      {nearEndTables.filter(t => !dismissedNearEnd.has(t.id)).length > 0 && (
        <div className="space-y-2">
          {nearEndTables.filter(t => !dismissedNearEnd.has(t.id)).map(t => {
            const endTime = addMinutes(new Date(t.session!.startTime), t.session!.durationMinutes);
            const minsLeft = Math.ceil(differenceInSeconds(endTime, new Date()) / 60);
            return (
              <div key={t.id} className="flex items-center gap-3 bg-amber-950/40 border border-amber-700/50 rounded-xl px-4 py-3">
                <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />
                <p className="flex-1 text-xs text-amber-300">
                  <strong>{t.name}</strong> — session ends in <strong>{minsLeft} minute{minsLeft !== 1 ? 's' : ''}</strong>.{' '}
                  <span className="text-amber-400/70">{t.session!.customerName} · Consider extending.</span>
                </p>
                <button
                  onClick={() => setDismissedNearEnd(prev => new Set([...prev, t.id]))}
                  className="p-1 text-amber-600 hover:text-amber-300 transition-colors flex-shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search tables or customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filterBtns.map(b => (
            <button
              key={b.key}
              onClick={() => setFilter(b.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                filter === b.key ? b.color : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {b.label}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${filter === b.key ? '' : 'bg-neutral-800'}`}>{b.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {filtered.map(table => (
          <TableCard
            key={table.id}
            table={table}
            onAssign={() => openAssign(table.id)}
            onExtend={() => openExtend(table.id)}
            onEnd={() => openEnd(table.id)}
            nextReservation={table.status === 'reserved' ? getNextReservation(table.id) : null}
          />
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          START SESSION MODAL
      ════════════════════════════════════════════════════════ */}
      {assigningTableId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]">
            <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center flex-none">
              <div>
                <h2 className="text-base font-bold text-neutral-100">Start Session</h2>
                <p className="text-xs text-neutral-500">{tables.find(t => t.id === assigningTableId)?.name} · ₱{HOURLY_RATE}/hour</p>
              </div>
              <button onClick={() => setAssigningTableId(null)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Customer Picker */}
              {allCustomers.length > 0 && (
                <div className="px-6 pt-5 pb-4 border-b border-neutral-800/60">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5">
                    <Users size={11} /> Assign to Waiting Customer
                  </p>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {waitingCustomers.length > 0 && (
                      <>
                        <p className="text-[10px] text-amber-500/80 uppercase tracking-wider font-semibold flex items-center gap-1.5 mt-1">
                          <UserPlus size={10} /> Walk-in Queue ({waitingCustomers.length})
                        </p>
                        {waitingCustomers.map((c, i) => (
                          <button key={`queue-${c.id}`} type="button" onClick={() => pickCustomer(c)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                              selectedCustomer?.id === c.id && selectedCustomer.kind === 'queue'
                                ? 'bg-emerald-600/15 border-emerald-600/50'
                                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                              i === 0 ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' : 'bg-neutral-800 border border-neutral-700 text-neutral-400'
                            }`}>{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-neutral-200 truncate">{c.name}</p>
                              <p className="text-[11px] text-neutral-500">{c.partySize} {c.partySize === 1 ? 'person' : 'people'}{c.notes ? ` · ${c.notes}` : ''}</p>
                            </div>
                            {selectedCustomer?.id === c.id && selectedCustomer.kind === 'queue'
                              ? <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
                              : <ChevronRight size={14} className="text-neutral-600 flex-shrink-0" />}
                          </button>
                        ))}
                      </>
                    )}
                    {todayReservations.length > 0 && (
                      <>
                        <p className="text-[10px] text-blue-400/80 uppercase tracking-wider font-semibold flex items-center gap-1.5 mt-2">
                          <Calendar size={10} /> Today's Reservations ({todayReservations.length})
                        </p>
                        {todayReservations.map(c => (
                          <button key={`res-${c.id}`} type="button" onClick={() => pickCustomer(c)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                              selectedCustomer?.id === c.id && selectedCustomer.kind === 'reservation'
                                ? 'bg-emerald-600/15 border-emerald-600/50'
                                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                              <Calendar size={11} className="text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-neutral-200 truncate">{c.name}</p>
                              <p className="text-[11px] text-neutral-500">{c.timeSlot} · {c.durationHours}h · {c.partySize} {c.partySize === 1 ? 'person' : 'people'}</p>
                            </div>
                            {selectedCustomer?.id === c.id && selectedCustomer.kind === 'reservation'
                              ? <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
                              : <ChevronRight size={14} className="text-neutral-600 flex-shrink-0" />}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1 h-px bg-neutral-800" />
                    <span className="text-[10px] text-neutral-600 uppercase tracking-wider">or walk-in</span>
                    <div className="flex-1 h-px bg-neutral-800" />
                  </div>
                </div>
              )}

              <form onSubmit={handleAssign} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <UserPlus size={11} />{selectedCustomer ? 'Selected Customer' : 'Customer Name'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => { setCustomerName(e.target.value); if (selectedCustomer) setSelectedCustomer(null); }}
                      className={`w-full bg-neutral-900 border rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-neutral-600 transition-colors ${
                        selectedCustomer ? 'border-emerald-600/40 bg-emerald-950/20' : 'border-neutral-800'
                      }`}
                      placeholder="Enter customer name"
                      required
                      autoFocus={allCustomers.length === 0}
                    />
                    {selectedCustomer && (
                      <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerName(''); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  {selectedCustomer && (
                    <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                      <CheckCircle size={10} />
                      {selectedCustomer.kind === 'queue' ? 'Assigned from walk-in queue' : `Assigned from today's reservation · ${(selectedCustomer as any).timeSlot}`}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Clock size={11} /> Duration
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {durationOptions.map(d => (
                      <button key={d} type="button"
                        onClick={() => { setDurationMinutes(d); setAmountPaid(((d / 60) * HOURLY_RATE).toFixed(2)); }}
                        className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                          durationMinutes === d ? 'bg-emerald-600/15 border-emerald-600 text-emerald-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >{d < 60 ? `${d}m` : `${d / 60}h`}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Amount Paid (PHP)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder={`₱${((durationMinutes / 60) * HOURLY_RATE).toFixed(2)}`}
                    step="0.01"
                  />
                  <p className="text-[10px] text-neutral-600">Suggested: {formatPHP((durationMinutes / 60) * HOURLY_RATE)} for {durationMinutes < 60 ? `${durationMinutes}min` : `${durationMinutes / 60}hr`}</p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setAssigningTableId(null)}
                    className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 font-semibold">
                    <Play size={14} /> Start Timer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          END SESSION MODAL — Payment Verification
      ════════════════════════════════════════════════════════ */}
      {endingTableId && endingTable?.session && endInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center flex-none bg-rose-950/20">
              <div>
                <h2 className="text-base font-bold text-neutral-100">End Session</h2>
                <p className="text-xs text-neutral-500">{endingTable.name} · {endingTable.session.customerName}</p>
              </div>
              <button onClick={() => setEndingTableId(null)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Session Summary */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-3">Session Summary</p>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Customer</span>
                  <span className="text-neutral-200 font-semibold">{endingTable.session.customerName}</span>
                </div>
                {endInfo.isOvertime ? (
                  /* Overtime billing breakdown */
                  <div className="space-y-2">
                    <div className="bg-neutral-800/50 rounded-lg p-3 space-y-1.5">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-2">Billing Breakdown</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400">
                          Booked: {endingTable.session.durationMinutes < 60 ? `${endingTable.session.durationMinutes}m` : `${endingTable.session.durationMinutes / 60}h`}
                        </span>
                        <span className="text-neutral-200">{formatPHP(endInfo.bookedCharge)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle size={10} /> Overtime: {endInfo.overtimeMins}m
                          <span className="text-neutral-500 font-normal">(billed at regular rate, rounded up)</span>
                        </span>
                        <span className="text-amber-400 font-semibold">+{formatPHP(endInfo.overtimeCharge)}</span>
                      </div>
                      <div className="border-t border-neutral-700 pt-1.5 flex justify-between text-sm">
                        <span className="text-neutral-300 font-semibold">Total Due</span>
                        <span className="text-white font-black">{formatPHP(endInfo.totalDue)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400">Already Paid</span>
                        <span className="text-emerald-400">−{formatPHP(endInfo.alreadyPaid)}</span>
                      </div>
                      <div className={`flex justify-between text-sm pt-1 rounded-lg px-2 py-1.5 ${endInfo.balance > 0 ? 'bg-rose-950/40' : 'bg-emerald-950/20'}`}>
                        <span className={endInfo.balance > 0 ? 'text-rose-300 font-semibold' : 'text-emerald-400 font-semibold'}>
                          {endInfo.balance > 0 ? 'Balance Due' : 'Settled'}
                        </span>
                        <span className={`font-black ${endInfo.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {formatPHP(endInfo.balance > 0 ? endInfo.balance : 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Booked Duration</span>
                      <span className="text-neutral-200">{endingTable.session.durationMinutes < 60 ? `${endingTable.session.durationMinutes}m` : `${endingTable.session.durationMinutes / 60}h`}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Booked Charge</span>
                      <span className="text-neutral-200">{formatPHP(endInfo.bookedCharge)}</span>
                    </div>
                    <div className="border-t border-neutral-800 pt-2 mt-2 flex justify-between text-sm">
                      <span className="text-neutral-300 font-semibold">Total Due</span>
                      <span className="text-white font-black">{formatPHP(endInfo.totalDue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Already Paid</span>
                      <span className="text-emerald-400 font-semibold">−{formatPHP(endInfo.alreadyPaid)}</span>
                    </div>
                    <div className={`flex justify-between text-sm pt-1 rounded-lg px-2 py-1.5 ${endInfo.balance > 0 ? 'bg-rose-950/30' : 'bg-emerald-950/20'}`}>
                      <span className={endInfo.balance > 0 ? 'text-rose-300 font-semibold' : 'text-emerald-400 font-semibold'}>
                        {endInfo.balance > 0 ? 'Outstanding Balance' : 'Settled ✓'}
                      </span>
                      <span className={`font-black ${endInfo.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {endInfo.balance > 0 ? formatPHP(endInfo.balance) : formatPHP(0)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Payment Status */}
              <div className="space-y-2">
                <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Payment Status</label>
                <div className="flex gap-2">
                  <PayStatusBtn value="paid"    current={endPayStatus} label="Fully Paid"   onChange={setEndPayStatus} />
                  <PayStatusBtn value="partial" current={endPayStatus} label="Partial"      onChange={setEndPayStatus} />
                  <PayStatusBtn value="unpaid"  current={endPayStatus} label="Unpaid"       onChange={setEndPayStatus} />
                </div>
                {endPayStatus === 'partial' && (
                  <div>
                    <label className="text-xs text-neutral-500 mb-1.5 block">Amount Collected (PHP)</label>
                    <input
                      type="number"
                      value={endPartialAmount}
                      onChange={e => setEndPartialAmount(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      placeholder={formatPHP(endInfo.balance)}
                      step="0.01"
                    />
                  </div>
                )}
                {endPayStatus === 'unpaid' && (
                  <div className="flex items-center gap-2 bg-rose-950/30 border border-rose-800/30 rounded-xl px-4 py-3 text-xs text-rose-400">
                    <AlertTriangle size={13} className="flex-shrink-0" />
                    <span>Mark session as ended with outstanding balance of {formatPHP(endInfo.balance)}.</span>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Payment Method</label>
                <div className="flex gap-2">
                  <PayMethodBtn value="cash"  current={endPayMethod} icon={Banknote}    label="Cash"  onChange={setEndPayMethod} />
                  <PayMethodBtn value="gcash" current={endPayMethod} icon={CreditCard}  label="GCash" onChange={setEndPayMethod} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEndingTableId(null)}
                  className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEnd}
                  className="flex-1 px-4 py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-sm rounded-xl shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2 font-semibold"
                >
                  <CircleCheck size={15} /> Confirm End
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          EXTEND SESSION MODAL — Payment Verification
      ════════════════════════════════════════════════════════ */}
      {extendingTableId && extendingTable?.session && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center flex-none bg-amber-950/20">
              <div>
                <h2 className="text-base font-bold text-neutral-100">Extend Session</h2>
                <p className="text-xs text-neutral-500">{extendingTable.name} · {extendingTable.session.customerName}</p>
              </div>
              <button onClick={() => setExtendingTableId(null)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmExtend} className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Extra Time */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Extra Time</label>
                <div className="grid grid-cols-2 gap-2">
                  {extendOptions.map(d => (
                    <button key={d} type="button" onClick={() => setExtendMinutes(d)}
                      className={`py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                        extendMinutes === d ? 'bg-amber-600/15 border-amber-600 text-amber-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      +{d < 60 ? `${d}min` : `${d / 60}hr`}
                      <br />
                      <span className="text-[10px] font-normal opacity-70">+{formatPHP((d / 60) * HOURLY_RATE)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Charge Summary */}
              <div className="bg-neutral-900 rounded-xl p-3 text-xs border border-neutral-800">
                <div className="flex justify-between text-neutral-400">
                  <span>Extension charge</span>
                  <span className="font-semibold text-amber-400">{formatPHP(extendCharge)}</span>
                </div>
                <div className="flex justify-between text-neutral-500 mt-1">
                  <span>Rate</span>
                  <span>₱{HOURLY_RATE}/hr</span>
                </div>
              </div>

              {/* Payment Status */}
              <div className="space-y-2">
                <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Extension Payment</label>
                <div className="flex gap-2">
                  <PayStatusBtn value="paid"    current={extendPayStatus} label="Paid Now"  onChange={setExtendPayStatus} />
                  <PayStatusBtn value="partial" current={extendPayStatus} label="Partial"   onChange={setExtendPayStatus} />
                  <PayStatusBtn value="unpaid"  current={extendPayStatus} label="Defer"     onChange={setExtendPayStatus} />
                </div>
                {extendPayStatus === 'partial' && (
                  <input
                    type="number"
                    value={extendPartialAmount}
                    onChange={e => setExtendPartialAmount(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder={`Amount collected (of ${formatPHP(extendCharge)})`}
                    step="0.01"
                  />
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Payment Method</label>
                <div className="flex gap-2">
                  <PayMethodBtn value="cash"  current={extendPayMethod} icon={Banknote}   label="Cash"  onChange={setExtendPayMethod} />
                  <PayMethodBtn value="gcash" current={extendPayMethod} icon={CreditCard} label="GCash" onChange={setExtendPayMethod} />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setExtendingTableId(null)}
                  className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-xl shadow-lg shadow-amber-900/30 transition-all flex items-center justify-center gap-2 font-semibold">
                  <Zap size={15} /> Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}