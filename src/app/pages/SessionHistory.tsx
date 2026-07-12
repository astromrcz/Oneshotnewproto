import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { History, Search, Calendar, Clock, DollarSign, ShoppingCart, CheckCircle, X, ChevronRight, Filter } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

const formatPHP = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export function SessionHistory() {
  const { sessionHistory, reservations, tables } = useAppContext();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'table_session' | 'reservation'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Unify and format data
  const unifiedHistory = useMemo(() => {
    const tableSessions = sessionHistory.map(sh => ({
      id: sh.id,
      sortDate: new Date(sh.endTime),
      source: 'table_session',
      customerName: sh.customerName,
      tableName: sh.tableName,
      startTime: new Date(sh.startTime),
      endTime: new Date(sh.endTime),
      durationLabel: `${sh.durationMinutes} mins`,
      totalAmount: sh.totalAmount,
      amountPaid: sh.amountPaid,
      orders: sh.orders || [],
      isFullyPaid: sh.amountPaid >= sh.totalAmount
    }));

    const completedReservations = reservations
      .filter(r => r.status === 'completed')
      .map(r => {
        const paid = r.downPaymentAmount + (r.balancePaid ? (r.totalAmount - r.downPaymentAmount) : 0);
        return {
          id: r.id,
          sortDate: new Date(r.createdAt), // or date of event
          source: 'reservation',
          customerName: r.customerName,
          tableName: tables.find(t => t.id === r.tableId)?.name || r.tableId || 'N/A',
          startTime: new Date(r.date),
          endTime: null, // Reservations don't have explicit end time unless logged via table session
          durationLabel: `${r.durationHours} hrs`,
          totalAmount: r.totalAmount,
          amountPaid: paid,
          orders: [],
          isFullyPaid: r.balancePaid
        };
      });

    return [...tableSessions, ...completedReservations].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  }, [sessionHistory, reservations, tables]);

  const filtered = unifiedHistory.filter(record => {
    const matchSearch = record.customerName.toLowerCase().includes(search.toLowerCase()) || record.id.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || record.source === filterType;
    
    let matchDate = true;
    if (dateFilter === 'today') {
      matchDate = isToday(record.sortDate);
    } else if (dateFilter === 'week') {
      matchDate = isThisWeek(record.sortDate, { weekStartsOn: 1 }); 
    } else if (dateFilter === 'month') {
      matchDate = isThisMonth(record.sortDate);
    } else if (dateFilter === 'custom' && dateRange.start && dateRange.end) {
      const start = startOfDay(new Date(dateRange.start));
      const end = endOfDay(new Date(dateRange.end));
      matchDate = isWithinInterval(record.sortDate, { start, end });
    }

    return matchSearch && matchType && matchDate;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-950 p-6 rounded-2xl border border-neutral-800">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2"><History className="text-emerald-500" /> Session History</h2>
          <p className="text-sm text-neutral-500 mt-1">Comprehensive log of completed walk-in sessions and reservations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <div className="relative flex-1 min-w-[200px] lg:w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input type="text" placeholder="Search customer or ID..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:border-emerald-500 outline-none" />
          </div>
          
          <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
            <option value="all">All Records</option>
            <option value="table_session">Walk-ins</option>
            <option value="reservation">Reservations</option>
          </select>

          <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)} className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {dateFilter === 'custom' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-wrap items-end gap-4 animate-in slide-in-from-top-2">
          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-1.5"><Calendar size={12}/> Start Date</label>
            <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-1.5"><Calendar size={12}/> End Date</label>
            <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
          </div>
          {(dateRange.start || dateRange.end) && (
            <button onClick={() => setDateRange({ start: '', end: '' })} className="px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/50">
              Clear Dates
            </button>
          )}
        </div>
      )}

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50 text-left text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                <th className="px-4 py-3">Customer & Type</th>
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Total Bill</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-neutral-500">No completed sessions found.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={`${r.id}-${i}`} className="hover:bg-neutral-900/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-neutral-200">{r.customerName}</p>
                    <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${r.source === 'table_session' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                      {r.source === 'table_session' ? 'Table Session' : 'Reservation'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-neutral-300">{format(r.sortDate, 'MMM d, yyyy')}</p>
                    <p className="text-[11px] text-neutral-500">
                      {format(r.startTime, 'h:mm a')} {r.endTime ? `- ${format(r.endTime, 'h:mm a')}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3"><span className="text-sm text-neutral-300">{r.tableName}</span></td>
                  <td className="px-4 py-3"><span className="text-sm text-neutral-300">{r.durationLabel}</span></td>
                  <td className="px-4 py-3"><span className="text-sm font-bold text-white">{formatPHP(r.totalAmount)}</span></td>
                  <td className="px-4 py-3">
                    {r.isFullyPaid ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><CheckCircle size={12}/> Fully Paid</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">Paid: {formatPHP(r.amountPaid)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedRecord(r)} className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors">
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedRecord(null)}>
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-white">{selectedRecord.customerName}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">ID: {selectedRecord.id.toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-neutral-500 hover:text-white"><X size={18}/></button>
            </div>
            
            <div className="space-y-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <div className="flex justify-between text-sm border-b border-neutral-800 pb-2">
                <span className="text-neutral-500">Table</span>
                <span className="text-white font-semibold">{selectedRecord.tableName}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-neutral-800 pb-2">
                <span className="text-neutral-500">Duration</span>
                <span className="text-white font-semibold">{selectedRecord.durationLabel}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-neutral-800 pb-2">
                <span className="text-neutral-500">Total Bill</span>
                <span className="text-white font-black">{formatPHP(selectedRecord.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Amount Paid</span>
                <span className={selectedRecord.isFullyPaid ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                  {formatPHP(selectedRecord.amountPaid)}
                </span>
              </div>
            </div>

            {selectedRecord.orders && selectedRecord.orders.length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5"><ShoppingCart size={12}/> Food & Beverage Orders</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedRecord.orders.map((o: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-800">
                      <span className="text-neutral-300">{o.qty}x {o.name}</span>
                      <span className="text-neutral-400 font-mono">{formatPHP(o.price * o.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}