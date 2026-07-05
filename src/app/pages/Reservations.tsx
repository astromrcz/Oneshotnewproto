import { useState } from 'react';
import { useAppContext, HOURLY_RATE, DOWN_PAYMENT_RATE, ReservationStatus, Reservation, Event, PromoCode } from '../context/AppContext';
import {
  Plus, X, Calendar, Clock, Users, Phone, Mail, ChevronDown, CheckCircle,
  XCircle, Search, Filter, DollarSign, AlertTriangle, Download, Image as ImageIcon,
  CalendarX2, List as ListIcon, Lock, ChevronLeft, ChevronRight, Send
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, addMonths, subMonths } from 'date-fns';

const formatPHP = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const statusConfig: Record<ReservationStatus, { label: string; color: string; dot: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  confirmed: { label: 'Confirmed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  'checked-in': { label: 'Checked In', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-400' },
  completed: { label: 'Completed', color: 'bg-neutral-700/50 text-neutral-400 border-neutral-700', dot: 'bg-neutral-500' },
  cancelled: { label: 'Cancelled', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dot: 'bg-rose-400' },
};

const formatDate = (d: Date) => {
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
};

const todayStart = startOfDay(new Date());

export function Reservations() {
  const { reservations, addReservation, updateReservationStatus, cancelReservation, updateDownPayment, updateBalance, tables, events, promoCodes, closedDates, rates } = useAppContext();
  
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [viewMonth, setViewMonth] = useState(new Date());
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);
  const [emailToast, setEmailToast] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | ReservationStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [voidModal, setVoidModal] = useState<{ type: 'downPayment' | 'balance'; id: string } | null>(null);
  const [voidPassword, setVoidPassword] = useState('');
  const [voidError, setVoidError] = useState('');

  // GCash Receipt State (browser memory)
  const [gcashReceipts, setGcashReceipts] = useState<Record<string, { refNo: string; imageUrl: string }>>(() => {
    if (typeof window !== 'undefined' && localStorage) {
      const saved = localStorage.getItem('gcashReceipts');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  // Form state
  const [form, setForm] = useState({
    customerName: '', contactNumber: '', email: '', date: '',
    timeSlot: '', durationHours: 2, partySize: 2, tableId: '',
  });

  const effectiveHourly = (rates && Number(rates.hourlyRate) > 0) ? Number(rates.hourlyRate) : HOURLY_RATE;
  const totalAmount = form.durationHours * effectiveHourly;
  const downPaymentPercentVal = rates && Number(rates.downPaymentPercent) >= 0 ? Number(rates.downPaymentPercent) : DOWN_PAYMENT_RATE * 100;
  const downPayment = totalAmount * (downPaymentPercentVal / 100);

  // ─── Data Mappers for Calendar ───────────────────────────────────────
  const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');
  
  const closedMap = new Map(closedDates.map(c => [c.date, c]));
  
  const resMap = reservations.reduce((acc, r) => {
    const d = dateKey(new Date(r.date));
    if (!acc[d]) acc[d] = [];
    acc[d].push(r);
    return acc;
  }, {} as Record<string, Reservation[]>);

  const eventsMap = events.reduce((acc, e) => {
    if (!e.date) return acc;
    const datesArray = e.date.split(',');
    datesArray.forEach(d => {
      const key = d.trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
    });
    return acc;
  }, {} as Record<string, Event[]>);
  
  const promosMap = promoCodes.reduce((acc, p) => {
    if(p.expiresAt) {
      const d = format(new Date(p.expiresAt), 'yyyy-MM-dd');
      if (!acc[d]) acc[d] = [];
      acc[d].push(p);
    }
    return acc;
  }, {} as Record<string, PromoCode[]>);

  const handleSendEmail = (resId: string) => {
    setEmailToast(`Reschedule email sent to Reservation #${resId.toUpperCase()}`);
    setTimeout(() => setEmailToast(null), 3000);
  };

  const handleGcashReceiptUpload = (resId: string, refNo: string, imageFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      const updated = { ...gcashReceipts, [resId]: { refNo, imageUrl } };
      setGcashReceipts(updated);
      if (typeof window !== 'undefined' && localStorage) {
        localStorage.setItem('gcashReceipts', JSON.stringify(updated));
      }
    };
    reader.readAsDataURL(imageFile);
  };

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['ID', 'Customer Name', 'Contact', 'Email', 'Date', 'Time', 'Duration (hrs)', 'Party Size', 'Table', 'Status', 'Total Amount', 'Down Payment', 'Balance Paid', 'Promo Code'];
    const rows = reservations.map(r => [
      r.id,
      r.customerName,
      r.contactNumber,
      r.email || '',
      format(new Date(r.date), 'yyyy-MM-dd'),
      r.timeSlot,
      r.durationHours,
      r.partySize,
      r.tableId || '',
      r.status,
      r.totalAmount.toFixed(2),
      r.downPaymentAmount.toFixed(2),
      r.balancePaid ? 'Yes' : 'No',
      r.promoCode || '',
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const [year, month, day] = form.date.split('-').map(Number);
    const [hour, minute] = form.timeSlot.split(':').map(Number);
    const dateObj = new Date(year, month - 1, day, hour, minute);

    addReservation({
      customerName: form.customerName,
      contactNumber: form.contactNumber,
      email: form.email,
      date: dateObj,
      timeSlot: form.timeSlot,
      durationHours: form.durationHours,
      partySize: form.partySize,
      tableId: form.tableId || undefined,
      status: 'pending',
      totalAmount,
      downPaymentAmount: downPayment,
      downPaymentPaid: false,
      balancePaid: false,
    });
    setShowForm(false);
    setForm({ customerName: '', contactNumber: '', email: '', date: '', timeSlot: '', durationHours: 2, partySize: 2, tableId: '' });
  };

  const filtered = reservations
    .filter(r => {
      const matchSearch = !search || r.customerName.toLowerCase().includes(search.toLowerCase()) || r.contactNumber.includes(search) || r.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchSearch && matchStatus;
    })
    // 🟢 Wrap createdAt in new Date() to safely convert it from a string before sorting
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const selected = reservations.find(r => r.id === selectedId);

  const statusOptions: Array<'all' | ReservationStatus> = ['all', 'pending', 'confirmed', 'checked-in', 'completed', 'cancelled'];

  const todayCount = reservations.filter(r => isToday(r.date)).length;
  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const totalRevenue = reservations.filter(r => r.status === 'completed').reduce((s, r) => s + r.totalAmount, 0);
  const pendingPayment = reservations.filter(r => r.status !== 'cancelled').reduce((s, r) => {
    if (!r.downPaymentPaid) return s + r.downPaymentAmount;
    if (!r.balancePaid) return s + (r.totalAmount - r.downPaymentAmount);
    return s;
  }, 0);

  // ─── Render Calendar ─────────────────────────────────────────────────
  const renderCalendar = () => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd   = endOfMonth(viewMonth);
    const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startPad   = monthStart.getDay();

    return (
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <button onClick={() => setViewMonth(m => subMonths(m, 1))} className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-sm font-bold text-neutral-200">{format(viewMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => setViewMonth(m => addMonths(m, 1))} className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] text-neutral-500 font-semibold uppercase tracking-wider py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const key = dateKey(day);
              const isPastDate = isBefore(day, todayStart);
              const isTodayDate = isSameDay(day, new Date());
              
              const dayCls = closedMap.get(key);
              const dayEvs = eventsMap[key] || [];
              const dayPrs = promosMap[key] || [];
              const dayRes = resMap[key] || [];

              return (
                <button
                  key={key}
                  onClick={() => setDayViewDate(day)}
                  className={`relative aspect-square rounded-xl p-1.5 flex flex-col items-start transition-all border text-left
                    ${isPastDate ? 'bg-neutral-900/40 border-neutral-800/40 text-neutral-700 cursor-default' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-600 cursor-pointer'}
                    ${isTodayDate ? 'ring-1 ring-amber-500/50' : ''}
                    ${dayCls ? 'bg-rose-950/20 border-rose-900/30' : ''}
                  `}
                >
                  <span className={`font-semibold text-xs ${isTodayDate ? 'text-amber-400' : isPastDate ? 'text-neutral-600' : 'text-neutral-300'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  <div className="mt-auto w-full space-y-0.5 overflow-hidden">
                    {dayCls && <div className="w-full text-[8px] bg-rose-500/20 text-rose-400 rounded px-1 truncate font-semibold">Closed</div>}
                    {!dayCls && dayRes.length > 0 && (
                      <div className="w-full text-[8px] bg-blue-500/20 text-blue-400 rounded px-1 truncate font-semibold border border-blue-500/30">
                        {dayRes.length} Rsv
                      </div>
                    )}
                    {!dayCls && dayEvs.map(e => (
                      <div key={e.id} className="w-full text-[8px] bg-amber-500/20 text-amber-400 rounded px-1 truncate font-semibold">{e.title}</div>
                    ))}
                    {!dayCls && dayPrs.map(p => (
                      <div key={p.id} className="w-full text-[8px] bg-violet-500/20 text-violet-400 rounded px-1 truncate font-semibold">{p.code} exp</div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Today's Bookings", value: todayCount, color: 'text-blue-400' },
          { label: 'Pending Confirmation', value: pendingCount, color: 'text-amber-400' },
          { label: 'Total Revenue', value: formatPHP(totalRevenue), color: 'text-emerald-400' },
          { label: 'Pending Payments', value: formatPHP(pendingPayment), color: 'text-rose-400' },
        ].map(s => (
          <div key={s.label} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Email Toast */}
      {emailToast && (
        <div className="flex items-center gap-2 bg-sky-950/40 border border-sky-700/40 text-sky-400 text-sm px-4 py-3 rounded-xl mb-4">
          <CheckCircle size={14} /> {emailToast}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1 flex-shrink-0">
          <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
            <ListIcon size={14} /> List
          </button>
          <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors ${viewMode === 'calendar' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
            <CalendarX2 size={14} /> Calendar
          </button>
        </div>
        
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by ID, name or contact..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statusOptions.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border capitalize transition-all ${
                filterStatus === s
                  ? s === 'all' ? 'bg-neutral-700 text-neutral-200 border-neutral-600' : `${statusConfig[s as ReservationStatus]?.color} border`
                  : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {s === 'all' ? 'All' : statusConfig[s as ReservationStatus]?.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl font-semibold transition-all border border-neutral-700 flex-none"
          title="Export to CSV"
        >
          <Download size={14} /> Export CSV
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl font-semibold transition-all shadow-lg shadow-emerald-900/30 flex-none"
        >
          <Plus size={15} /> New Reservation
        </button>
      </div>

      {/* Table View */}
      {viewMode === 'list' && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/50">
                  {['Customer', 'Date & Time', 'Duration', 'Party', 'Table', 'Status', 'Payment', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[10px] text-neutral-500 uppercase tracking-wider font-semibold px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Calendar size={28} className="mx-auto text-neutral-700 mb-2" />
                      <p className="text-sm text-neutral-600">No reservations found</p>
                    </td>
                  </tr>
                ) : filtered.map(r => {
                  const cfg = statusConfig[r.status];
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className="hover:bg-neutral-900/60 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                          {r.customerName}
                          <span className="text-[9px] font-mono text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded tracking-widest">{r.id}</span>
                        </p>
                        <p className="text-xs text-neutral-500">{r.contactNumber}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-neutral-300">{formatDate(r.date)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-400">{r.durationHours}h</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-400">{r.partySize} pax</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-400">{r.tableId ? tables.find(t => t.id === r.tableId)?.name || r.tableId : '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            {r.downPaymentPaid
                              ? <CheckCircle size={11} className="text-emerald-400" />
                              : <XCircle size={11} className="text-neutral-600" />}
                            <span className="text-[10px] text-neutral-500">DP {formatPHP(r.downPaymentAmount)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {r.balancePaid
                              ? <CheckCircle size={11} className="text-emerald-400" />
                              : <XCircle size={11} className="text-neutral-600" />}
                            <span className="text-[10px] text-neutral-500">Bal {formatPHP(r.totalAmount - r.downPaymentAmount)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          {r.status === 'pending' && (
                            <button
                              onClick={() => updateReservationStatus(r.id, 'confirmed')}
                              className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-[10px] font-bold rounded border border-emerald-700/30 transition-colors"
                            >
                              Verify
                            </button>
                          )}
                          {r.status === 'confirmed' && (
                            <button
                              onClick={() => updateReservationStatus(r.id, 'checked-in')}
                              className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-[10px] font-bold rounded border border-blue-700/30 transition-colors"
                            >
                              Check In
                            </button>
                          )}
                          {r.status === 'checked-in' && (
                            <button
                              onClick={() => updateReservationStatus(r.id, 'completed')}
                              className="px-2 py-1 bg-neutral-700/50 hover:bg-neutral-600/50 text-neutral-300 text-[10px] font-bold rounded border border-neutral-700 transition-colors"
                            >
                              Complete
                            </button>
                          )}
                          {(r.status !== 'cancelled' && r.status !== 'completed') && (
                            <button
                              onClick={() => {
                                setCancelTarget(r.id);
                                setShowCancelDialog(true);
                              }}
                              className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 text-[10px] font-bold rounded border border-rose-700/30 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && renderCalendar()}

      {/* Day View Modal (Calendar click) */}
      {dayViewDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
              <h3 className="font-bold text-neutral-200">{format(dayViewDate, 'MMMM d, yyyy')}</h3>
              <button onClick={() => setDayViewDate(null)} className="p-1.5 text-neutral-500 hover:text-white rounded-lg transition-colors"><X size={15}/></button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-4">
              {(() => {
                const key = dateKey(dayViewDate);
                const dayEvs = eventsMap[key] || [];
                const dayPrs = promosMap[key] || [];
                const dayCls = closedMap.get(key);
                const dayRes = resMap[key] || [];

                return (
                  <>
                    {(dayCls || dayEvs.length > 0 || dayPrs.length > 0) && (
                      <div className="space-y-2 mb-4 bg-neutral-900/50 rounded-lg p-3 border border-neutral-800">
                        <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-2">Events & Closures</p>
                        {dayCls && <div className="text-xs text-rose-400 font-semibold">Closed: {dayCls.reason}</div>}
                        {dayEvs.map(e => <div key={e.id} className="text-xs text-amber-400 font-semibold">Event: {e.title}</div>)}
                        {dayPrs.map(p => <div key={p.id} className="text-xs text-violet-400 font-semibold">Promo Expiry: {p.code}</div>)}
                      </div>
                    )}

                    <div className="space-y-3">
                      <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold border-b border-neutral-800 pb-2">
                        Reservations ({dayRes.length})
                      </p>
                      {dayRes.length === 0 ? (
                        <p className="text-xs text-neutral-600">No reservations for this date.</p>
                      ) : (
                        dayRes.map(r => {
                          const isCancelled = r.status === 'cancelled';
                          
                          return (
                            <div key={r.id} className={`p-3 rounded-lg border flex flex-col gap-2 ${dayCls && !isCancelled ? 'bg-rose-950/20 border-rose-900/30' : 'bg-neutral-900 border-neutral-800'}`}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-neutral-200">{r.customerName}</p>
                                    <span className="text-[9px] font-mono text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded tracking-widest">{r.id}</span>
                                  </div>
                                  <p className="text-xs text-neutral-500">{r.timeSlot} · {r.partySize} pax</p>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${statusConfig[r.status]?.color}`}>
                                  {r.status}
                                </span>
                              </div>
                              
                              {/* Affected by Closure Logic */}
                              {dayCls && (
                                <div className="mt-2 pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                                  {isCancelled ? (
                                    <span className="text-[10px] text-neutral-500 flex items-center gap-1"><CheckCircle size={10} /> Action Taken (Cancelled/Rescheduled)</span>
                                  ) : (
                                    <>
                                      <span className="text-[10px] text-rose-400 flex items-center gap-1 font-semibold"><AlertTriangle size={10} /> Affected: No Action</span>
                                      <button 
                                        onClick={() => handleSendEmail(r.id)}
                                        className="text-[10px] bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                      >
                                        <Send size={10} /> Resend Email
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-neutral-100">{selected.customerName}</h2>
                <p className="text-xs text-neutral-500 font-mono tracking-wider">Reservation #{selected.id.toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Date & Time</p>
                  <p className="text-neutral-300">{format(selected.date, 'MMM d, yyyy')}</p>
                  <p className="text-neutral-500 text-xs">{selected.timeSlot}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Duration</p>
                  <p className="text-neutral-300">{selected.durationHours} hour{selected.durationHours > 1 ? 's' : ''}</p>
                  <p className="text-neutral-500 text-xs">{selected.partySize} pax</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Contact</p>
                  <p className="text-neutral-300">{selected.contactNumber}</p>
                  {selected.email && <p className="text-neutral-500 text-xs">{selected.email}</p>}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Table</p>
                  <p className="text-neutral-300">{selected.tableId ? tables.find(t => t.id === selected.tableId)?.name || selected.tableId : 'Not assigned'}</p>
                </div>
              </div>

              {/* Payment breakdown */}
              <div className="bg-neutral-900 rounded-xl p-4 space-y-4 border border-neutral-800">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Payment Details</p>
                
                {/* Down Payment Block */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-400">Down Payment ({rates?.downPaymentPercent || 25}%)</span>
                  <div className="flex items-center gap-2">
                    <span className={selected.downPaymentPaid ? 'text-emerald-400 font-bold' : 'text-neutral-400'}>
                      {formatPHP(selected.downPaymentAmount)}
                    </span>
                    {selected.downPaymentPaid ? (
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-500 border border-emerald-900/50 cursor-default flex items-center gap-1">
                           <CheckCircle size={10}/> Paid
                         </span>
                         <button onClick={() => setVoidModal({ type: 'downPayment', id: selected.id })} className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/30 text-rose-500 border border-rose-900/50 hover:bg-rose-900/50 transition-colors">
                           Void
                         </button>
                      </div>
                    ) : (
                      <button onClick={() => updateDownPayment(selected.id, true)} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">Mark Paid</button>
                    )}
                  </div>
                </div>

                {/* GCash Receipt Area (Mandatory Logic) */}
                <div className="space-y-2 border-t border-neutral-800 pt-3">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">GCash Receipt (Mandatory)</label>
                  {selected.paymentRef ? (
                    <div className="flex items-center justify-between bg-neutral-950 p-2 rounded border border-neutral-800">
                      <span className="text-xs font-mono text-neutral-300">Ref: {selected.paymentRef}</span>
                      {selected.receiptImg ? (
                        <a href={selected.receiptImg} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors p-1" title="View Receipt Image">
                          <ImageIcon size={14} />
                        </a>
                      ) : (
                        <span className="text-[9px] text-neutral-600 italic px-1">No Image</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-rose-500 italic">No receipt provided in database.</p>
                  )}
                </div>

                {/* Balance Block */}
                <div className="flex justify-between items-center text-sm border-t border-neutral-800 pt-3">
                  <span className="text-neutral-300 font-semibold">Balance</span>
                  <div className="flex items-center gap-2">
                    <span className={selected.balancePaid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {formatPHP(selected.totalAmount - selected.downPaymentAmount)}
                    </span>
                    {selected.balancePaid ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-500 border border-emerald-900/50 cursor-default flex items-center gap-1">
                          <CheckCircle size={10}/> Paid
                        </span>
                        <button onClick={() => setVoidModal({ type: 'balance', id: selected.id })} className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/30 text-rose-500 border border-rose-900/50 hover:bg-rose-900/50 transition-colors">
                          Void
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => updateBalance(selected.id, true)} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">Settle Balance</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex gap-2 flex-wrap">
                {selected.status === 'pending' && (
                  <button onClick={() => { updateReservationStatus(selected.id, 'confirmed'); setSelectedId(null); }} className="flex-1 px-3 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm font-semibold rounded-xl border border-emerald-700/30 transition-colors">
                    Confirm Booking
                  </button>
                )}
                {selected.status === 'confirmed' && (
                  <button onClick={() => { updateReservationStatus(selected.id, 'checked-in'); setSelectedId(null); }} className="flex-1 px-3 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm font-semibold rounded-xl border border-blue-700/30 transition-colors">
                    Check In Customer
                  </button>
                )}
                {selected.status === 'checked-in' && (
                  <button onClick={() => { updateReservationStatus(selected.id, 'completed'); setSelectedId(null); }} className="flex-1 px-3 py-2.5 bg-neutral-700/50 hover:bg-neutral-600/50 text-neutral-300 text-sm font-semibold rounded-xl border border-neutral-700 transition-colors">
                    Mark Complete
                  </button>
                )}
                {selected.status !== 'cancelled' && selected.status !== 'completed' && (
                  <button onClick={() => { updateReservationStatus(selected.id, 'cancelled'); setSelectedId(null); }} className="px-3 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-sm font-semibold rounded-xl border border-rose-700/30 transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Reservation Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center sticky top-0 bg-neutral-950">
              <h2 className="text-base font-bold text-neutral-100">New Reservation</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Customer Name *</label>
                  <input required value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-neutral-600"
                    placeholder="Full name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Contact Number *</label>
                  <input required value={form.contactNumber} onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-neutral-600"
                    placeholder="09xx-xxx-xxxx" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Email (optional)</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-neutral-600"
                    placeholder="email@example.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Date *</label>
                  <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Time Slot *</label>
                  <input required type="time" value={form.timeSlot} onChange={e => setForm(f => ({ ...f, timeSlot: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Duration (hours)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(h => (
                      <button key={h} type="button" onClick={() => setForm(f => ({ ...f, durationHours: h }))}
                        className={`flex-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                          form.durationHours === h ? 'bg-emerald-600/15 border-emerald-600 text-emerald-400' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                        }`}>
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Party Size</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <button key={n} type="button" onClick={() => setForm(f => ({ ...f, partySize: n }))}
                        className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                          form.partySize === n ? 'bg-emerald-600/15 border-emerald-600 text-emerald-400' : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                        }`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800 space-y-2">
                <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Payment Summary</p>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Total ({form.durationHours}h × ₱{effectiveHourly})</span>
                  <span className="text-neutral-200 font-semibold">{formatPHP(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-neutral-800 pt-2">
                  <span className="text-neutral-400">Down Payment ({downPaymentPercentVal}%)</span>
                  <span className="text-amber-400 font-semibold">{formatPHP(downPayment)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl font-semibold transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2">
                  <Plus size={15} /> Create Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Reservation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-neutral-100">Cancel Reservation</h2>
                <p className="text-xs text-neutral-500">Reservation #{cancelTarget?.toUpperCase()}</p>
              </div>
              <button onClick={() => setShowCancelDialog(false)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-neutral-500">Are you sure you want to cancel this reservation?</p>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Enter reason for cancellation (optional)"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-neutral-600"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCancelDialog(false)} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (cancelTarget) {
                      cancelReservation(cancelTarget, cancelReason);
                      setShowCancelDialog(false);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm rounded-xl font-semibold transition-all shadow-lg shadow-rose-900/30 flex items-center justify-center gap-2"
                >
                  <X size={15} /> Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}