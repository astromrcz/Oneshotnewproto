import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  UserPlus, X, Bell, CheckCircle, Clock, Users, ChevronDown, ChevronUp, 
  Calendar as CalendarIcon, AlertCircle, Star, Sparkles, Info, Plus, Minus 
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isTomorrow, differenceInMinutes, addMinutes, differenceInSeconds } from 'date-fns';
import { useNavigate } from 'react-router';

export function Queue() {
  // 🟢 FIXED: Extracted reservationTerms to enforce Admin constraints
  const { queue, addToQueue, removeFromQueue, callQueueItem, tables, reservations, cancelReservation, reservationTerms } = useAppContext() as any;
  const navigate = useNavigate();
  
  // 🟢 NEW: Calculate the dynamic max party size based on the current day
  const currentDay = new Date().getDay();
  const isWeekend = currentDay === 0 || currentDay === 5 || currentDay === 6;
  const maxAllowedPartySize = isWeekend ? (reservationTerms?.weekendMaxPartySize || 20) : (reservationTerms?.weekdayMaxPartySize || 20);

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  // Live clock for AI calculation
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Priority queue: checked-in reservation customers jump ahead
  const checkedInReservations = reservations.filter((r: any) => r.status === 'checked-in');
  const waiting = queue.filter((q: any) => q.status === 'waiting');
  const called = queue.filter((q: any) => q.status === 'called');
  const availableTables = tables.filter((t: any) => t.status === 'available');

  // --- AI WAIT-TIME ESTIMATOR (PROTOTYPE LOGIC) ---
  const calculateAIWaitTime = () => {
    if (waiting.length === 0) return "No wait";

    // Get all occupied tables and find how many minutes they have left
    const activeTables = tables.filter((t: any) => t.status === 'occupied' && t.session);
    if (activeTables.length === 0) return "Available immediately";

    const remainingTimes = activeTables.map((t: any) => {
      const endTime = addMinutes(new Date(t.session.startTime), t.session.durationMinutes);
      return Math.max(0, Math.floor(differenceInSeconds(endTime, now) / 60));
    }).sort((a: number, b: number) => a - b); // Sort from ending soonest to longest

    // Prototype "AI" Math: Grab the table ending soonest, add 2 mins for cleaning, 
    // and add 15 mins penalty for every person ahead in the queue.
    const baseWait = remainingTimes[0] !== undefined ? remainingTimes[0] : 0;
    const estimatedMinutes = baseWait + 2 + (waiting.length * 15);

    if (estimatedMinutes < 60) return `~${estimatedMinutes} mins`;
    const hrs = Math.floor(estimatedMinutes / 60);
    const mins = estimatedMinutes % 60;
    return `~${hrs}h ${mins}m`;
  };

  // Get upcoming reservations (today and future)
  const upcomingReservations = reservations
    .filter((r: any) => r.status !== 'cancelled' && r.status !== 'completed')
    .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
    .slice(0, 10);

  const CharCount = ({ current, max }: { current?: string, max: number }) => {
    const len = current?.length || 0;
    return (
      <span className={`text-[10px] ${len >= max ? 'text-rose-400 font-bold' : 'text-neutral-600'}`}>
        {len}/{max}
      </span>
    );
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    // 🟢 FIXED: Hard stop if party size violates admin policy
    if (partySize > maxAllowedPartySize) {
      alert(`The maximum walk-in party size allowed today is ${maxAllowedPartySize} based on store policy.`);
      return;
    }
    
    addToQueue({ customerName: name, contactNumber: contact, partySize, notes });
    setName('');
    setContact('');
    setPartySize(2);
    setNotes('');
    setShowAddForm(false);
  };

  const handleCallCustomer = (customerId: string, customerName: string) => {
    callQueueItem(customerId);
    
    // Voice generation using Web Speech API
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(`${customerName}, your table is ready. Please proceed to the counter.`);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 flex items-center gap-2">
            <Users size={15} className="text-amber-400" />
            <span className="text-sm font-semibold text-neutral-200">{waiting.length} Waiting</span>
          </div>
          {availableTables.length > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">{availableTables.length} Table{availableTables.length > 1 ? 's' : ''} Available</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl transition-all font-semibold shadow-lg shadow-emerald-900/30"
        >
          <UserPlus size={15} /> Add to Queue
          {showAddForm ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-neutral-300 mb-4 flex items-center gap-2">
            <UserPlus size={15} className="text-emerald-500" /> Register Walk-in Customer (FCFS)
          </h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 🟢 FIXED: Capped Customer Name with Char Counter */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Full Name *</label>
                <CharCount current={name} max={50} />
              </div>
              <input type="text" value={name} maxLength={50} onChange={e => setName(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-neutral-600" placeholder="Customer name" required autoFocus />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Contact Number</label>
              </div>
              <input type="tel" value={contact} maxLength={15} onChange={e => setContact(e.target.value.replace(/\D/g, ''))} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-neutral-600" placeholder="09xx-xxx-xxxx" />
            </div>

            {/* 🟢 FIXED: Capped UI counter and displayed the dynamic Admin limit */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Party Size</label>
                <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Max {maxAllowedPartySize}</span>
              </div>
              <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-1.5">
                <button type="button" onClick={() => setPartySize(p => Math.max(1, p - 1))} className="flex-1 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-md transition-colors"><Minus size={14}/></button>
                <span className="w-12 text-center text-sm font-bold text-neutral-200">{partySize > maxAllowedPartySize ? maxAllowedPartySize : partySize}</span>
                <button type="button" disabled={partySize >= maxAllowedPartySize} onClick={() => setPartySize(p => Math.min(maxAllowedPartySize, p + 1))} className="flex-1 h-8 flex items-center justify-center bg-emerald-600/20 hover:bg-emerald-600/30 disabled:bg-neutral-800 disabled:text-neutral-700 text-emerald-400 rounded-md transition-colors"><Plus size={14}/></button>
              </div>
            </div>

            {/* 🟢 FIXED: Capped Notes with Char Counter */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Notes (optional)</label>
                <CharCount current={notes} max={100} />
              </div>
              <input type="text" value={notes} maxLength={100} onChange={e => setNotes(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-neutral-600" placeholder="Special requests..." />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl font-semibold transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
              >
                <UserPlus size={15} /> Add to Queue
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FCFS Notice */}
      <div className="flex items-center gap-2.5 bg-blue-950/20 border border-blue-900/30 rounded-xl px-4 py-3">
        <Clock size={15} className="text-blue-400 flex-none" />
        <p className="text-xs text-blue-300">
          <strong>First Come, First Served (FCFS)</strong> — Customers are served in the order they arrived. The position in queue is based on arrival time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Queue */}
        <div className="lg:col-span-2 space-y-3">

          {/* Priority Queue: Checked-In Reservations */}
          {checkedInReservations.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs text-sky-400 uppercase tracking-widest font-semibold flex items-center gap-2">
                <Star size={12} className="text-sky-400" /> Priority — Checked-In Reservations ({checkedInReservations.length})
              </h2>
              {checkedInReservations.map((r: any) => (
                <div key={r.id} className="bg-sky-950/20 border border-sky-800/40 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black text-sm flex-none">
                    <Star size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-200 truncate">{r.customerName}</p>
                      <span className="px-1.5 py-0.5 bg-sky-600/20 text-sky-400 text-[10px] font-bold rounded uppercase tracking-wider flex-shrink-0">Priority</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-0.5">
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Users size={10} /> {r.partySize} pax
                      </span>
                      <span className="text-xs text-neutral-500">{r.contactNumber}</span>
                      <span className="text-xs text-sky-500">{r.timeSlot} · {r.durationHours}h</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/staff/tables')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 text-xs font-semibold rounded-lg border border-sky-700/30 transition-colors flex-none"
                  >
                    Assign Table
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-2 mt-4">
            <h2 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> 
              <span>Walk-in Queue ({waiting.length})</span>
            </h2>
          </div>

          {/* AI WAIT TIME CARD */}
          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-400" />
              <span className="text-xs text-emerald-300 font-semibold">AI Est. Wait Time</span>
            </div>
            <span className="text-sm font-black text-emerald-400">{calculateAIWaitTime()}</span>
          </div>

          {waiting.length === 0 ? (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-10 text-center">
              <CheckCircle size={32} className="mx-auto text-emerald-500/40 mb-3" />
              <p className="text-neutral-400 font-semibold">No customers in queue</p>
              <p className="text-xs text-neutral-600 mt-1">Add walk-in customers using the button above</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {waiting.map((item: any, index: number) => (
                <div
                  key={item.id}
                  className={`bg-neutral-950 border rounded-xl p-4 flex items-center gap-4 transition-all ${
                    index === 0 ? 'border-emerald-700/40 shadow-sm shadow-emerald-900/10' : 'border-neutral-800'
                  }`}
                >
                  {/* Position */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-none ${
                    index === 0 ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-200 truncate">{item.customerName}</p>
                      {/* Queue number badge */}
                      {item.queueNumber && (
                        <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-500 text-[10px] font-mono font-bold rounded border border-neutral-700 flex-shrink-0">
                          #{String(item.queueNumber).padStart(3, '0')}
                        </span>
                      )}
                      {index === 0 && (
                        <span className="px-1.5 py-0.5 bg-emerald-600/20 text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wider flex-shrink-0">Next</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-0.5">
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Users size={10} /> {item.partySize} pax
                      </span>
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Clock size={10} /> {formatDistanceToNow(new Date(item.arrivalTime), { addSuffix: true })}
                      </span>
                      {item.contactNumber && (
                        <span className="text-xs text-neutral-500">{item.contactNumber}</span>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-[11px] text-neutral-600 mt-1 italic line-clamp-2" title={item.notes}>"{item.notes}"</p>
                    )}
                  </div>

                  {/* Arrival time */}
                  <div className="hidden sm:block text-right flex-none">
                    <p className="text-xs text-neutral-600">{format(new Date(item.arrivalTime), 'h:mm a')}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-none">
                    <button
                      onClick={() => handleCallCustomer(item.id, item.customerName)}
                      title="Call customer"
                      className="p-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 rounded-lg transition-colors border border-amber-700/30"
                    >
                      <Bell size={14} />
                    </button>
                    <button
                      onClick={() => removeFromQueue(item.id)}
                      title="Remove from queue"
                      className="p-2 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 rounded-lg transition-colors border border-rose-700/30"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Called Customers */}
          {called.length > 0 && (
            <div className="mt-5 space-y-2">
              <h2 className="text-xs text-neutral-600 uppercase tracking-widest font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" /> Called ({called.length})
              </h2>
              {called.map((item: any) => (
                <div key={item.id} className="bg-neutral-950 border border-blue-900/30 rounded-xl p-3 flex items-center gap-3">
                  <Bell size={14} className="text-blue-400 flex-none" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-200 truncate">{item.customerName}</p>
                    <p className="text-xs text-neutral-500 truncate">{item.partySize} pax · {item.contactNumber}</p>
                  </div>
                  <button
                    onClick={() => navigate('/staff/tables')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold rounded-lg border border-blue-700/30 transition-colors flex-none"
                  >
                    Assign Table
                  </button>
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors flex-none"
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Available Tables */}
        <div className="space-y-3">
          <h2 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Available Tables ({availableTables.length})
          </h2>
          {availableTables.length === 0 ? (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 text-center">
              <p className="text-sm text-neutral-500">No tables available</p>
              <button onClick={() => navigate('/staff/tables')} className="text-xs text-emerald-500 hover:text-emerald-400 mt-2 font-semibold">
                View Table Monitor →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {availableTables.map((table: any) => (
                <div key={table.id} className="bg-neutral-950 border border-emerald-800/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-neutral-200">{table.name}</p>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-bold px-1.5 py-0.5 rounded uppercase">Free</span>
                  </div>
                  {(called.length > 0 || waiting.length > 0) && (
                    <button
                      onClick={() => {
                        const targetCustomer = called.length > 0 ? called[0] : waiting[0];
                        sessionStorage.setItem('assignCustomer', JSON.stringify({
                          kind: 'queue',
                          id: targetCustomer.id,
                          name: targetCustomer.customerName,
                          partySize: targetCustomer.partySize,
                          contact: targetCustomer.contactNumber,
                          notes: targetCustomer.notes
                        }));
                        sessionStorage.setItem('assignTableId', table.id);
                        navigate('/staff/tables');
                      }}
                      className="w-full text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-700/30 py-2 rounded-lg transition-colors font-medium"
                    >
                      Assign {called.length > 0 ? called[0].customerName : waiting[0]?.customerName} to {table.name}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate('/staff/tables')}
            className="w-full text-xs text-neutral-500 hover:text-neutral-300 py-2 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors"
          >
            Go to Table Monitor →
          </button>
        </div>
      </div>

      {/* Upcoming Reservations Calendar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-2">
            <CalendarIcon size={14} /> Upcoming Reservations ({upcomingReservations.length})
          </h2>
          <button
            onClick={() => navigate('/staff/reservations')}
            className="text-xs text-emerald-500 hover:text-emerald-400 font-semibold"
          >
            View all →
          </button>
        </div>

        {upcomingReservations.length === 0 ? (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-10 text-center">
            <CalendarIcon size={32} className="mx-auto text-neutral-700 mb-3" />
            <p className="text-neutral-500">No upcoming reservations</p>
          </div>
        ) : (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="divide-y divide-neutral-800/50">
              {upcomingReservations.map((reservation: any) => {
                const minsUntil = differenceInMinutes(new Date(reservation.date), new Date());
                const isNearTime = minsUntil >= 0 && minsUntil <= 60;
                const isPast = minsUntil < 0;
                const tableName = reservation.tableId ? tables.find((t: any) => t.id === reservation.tableId)?.name : null;

                return (
                  <div
                    key={reservation.id}
                    className={`px-4 py-3 hover:bg-neutral-900/60 transition-colors ${isNearTime ? 'bg-amber-500/5 border-l-2 border-amber-500' : ''} ${isPast ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-neutral-200">{reservation.customerName}</p>
                          {isNearTime && (
                            <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 rounded px-1.5 py-0.5">
                              <AlertCircle size={10} className="text-amber-400" />
                              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wide">Soon</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {isToday(reservation.date) ? 'Today' : isTomorrow(reservation.date) ? 'Tomorrow' : format(reservation.date, 'MMM d')}, {reservation.timeSlot}
                          </span>
                          <span>{reservation.durationHours}h</span>
                          <span>{reservation.partySize} pax</span>
                          {tableName && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                isNearTime ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-neutral-800 text-neutral-400'
                              }`}
                            >
                              {tableName}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setCancelTarget(reservation.id);
                          setShowCancelDialog(true);
                        }}
                        className="flex-none p-1.5 text-neutral-600 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                        title="Cancel reservation"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Reservation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-neutral-100">Cancel Reservation</h2>
                <p className="text-xs text-neutral-500">Are you sure?</p>
              </div>
              <button onClick={() => setShowCancelDialog(false)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Reason for cancellation</label>
                <select
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  <option value="">Select reason...</option>
                  <option value="Customer no-show">Customer no-show</option>
                  <option value="Customer requested">Customer requested</option>
                  <option value="Overbooking">Overbooking</option>
                  <option value="Table unavailable">Table unavailable</option>
                  <option value="Payment not received">Payment not received</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCancelDialog(false)} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (cancelTarget) {
                      cancelReservation(cancelTarget, cancelReason || 'No reason provided');
                      setShowCancelDialog(false);
                      setCancelReason('');
                      setCancelTarget(null);
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