import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, BarChart3, Clock, DollarSign, TableProperties, 
  Calendar as CalendarIcon, Printer, CheckCircle, Table2, Users, 
  BarChart2, Download, X, ClipboardList 
} from 'lucide-react';
import { format, isToday, startOfDay, endOfDay, subDays, isSameDay, parseISO, eachDayOfInterval } from 'date-fns';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

const formatPHP = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Pending',    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  confirmed:    { label: 'Confirmed',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  'checked-in': { label: 'Checked In', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  completed:    { label: 'Completed',  color: 'bg-neutral-700/50 text-neutral-400 border-neutral-700' },
  cancelled:    { label: 'Cancelled',  color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs text-neutral-400 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={`tooltip-${i}`} className="text-xs font-semibold" style={{ color: p.color || p.fill }}>
            {p.name}:{' '}
            {p.dataKey === 'revenue' ? `₱${p.value.toLocaleString()}` : p.value}
            {p.dataKey === 'occupancy' ? '%' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">{label}</p>
        <div className={`p-1.5 rounded-lg ${color.replace('text-', 'bg-').replace('-400', '-500/10')}`}>
          <Icon size={14} className={color} />
        </div>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-neutral-500 mt-1">{sub}</p>}
    </div>
  );
}

export function Analytics() {
  const { tables, reservations, queue, sessionHistory } = useAppContext() as any;
  
  // 🟢 Custom Date Range for Overall Analytics
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // 🟢 Drawer & Shift Summary State
  const [isShiftDrawerOpen, setIsShiftDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const history = sessionHistory || [];

  // ==========================================
  // 🟢 TOP ANALYTICS: FILTERED BY CUSTOM RANGE
  // ==========================================
  const filteredHistory = useMemo(() => {
    const start = startOfDay(parseISO(dateRange.start));
    let end = endOfDay(parseISO(dateRange.end));
    if (end < start) end = endOfDay(start); 

    return history.filter((h: any) => {
      const d = new Date(h.startTime || h.endTime);
      return d >= start && d <= end;
    });
  }, [history, dateRange]);

  // 1. Revenue Trend
  const revenueTrend = useMemo(() => {
    const start = parseISO(dateRange.start);
    let end = parseISO(dateRange.end);
    if (end < start) end = start;

    try {
      const days = eachDayOfInterval({ start, end });
      return days.map(day => {
        const dayHist = filteredHistory.filter((h: any) => isSameDay(new Date(h.startTime || h.endTime), day));
        return {
          dayLabel: format(day, 'MMM dd'),
          revenue: dayHist.reduce((s: number, h: any) => s + (h.totalAmount || 0), 0),
          sessions: dayHist.length
        };
      });
    } catch (e) {
      return [];
    }
  }, [filteredHistory, dateRange]);

  // 2. Revenue by Day of Week
  const revenueByDayOfWeek = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const totals = [0, 0, 0, 0, 0, 0, 0];
    
    filteredHistory.forEach((h: any) => {
      const d = new Date(h.startTime || h.endTime);
      totals[d.getDay()] += (h.totalAmount || 0);
    });

    return days.map((day, i) => ({ day, revenue: totals[i] }));
  }, [filteredHistory]);

  // 3. Session Length Distribution
  const sessionDist = useMemo(() => {
    const counts = { 'Under 1h': 0, '1-2 Hours': 0, '2-3 Hours': 0, '3+ Hours': 0 };
    filteredHistory.forEach((h: any) => {
      const mins = h.durationMinutes || 0;
      if (mins <= 60) counts['Under 1h']++;
      else if (mins <= 120) counts['1-2 Hours']++;
      else if (mins <= 180) counts['2-3 Hours']++;
      else counts['3+ Hours']++;
    });
    
    const total = filteredHistory.length || 1; 
    return Object.entries(counts).map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100)
    })).filter(c => c.value > 0);
  }, [filteredHistory]);

  // 4. Peak Hours
  const peakHours = useMemo(() => {
    const hoursCount: Record<string, number> = {};
    filteredHistory.forEach((h: any) => {
      const d = new Date(h.startTime);
      const hourNum = d.getHours();
      const label = hourNum === 0 ? '12AM' : hourNum === 12 ? '12PM' : hourNum > 12 ? `${hourNum - 12}PM` : `${hourNum}AM`;
      hoursCount[label] = (hoursCount[label] || 0) + 1;
    });

    const total = filteredHistory.length || 1;
    const operatingHours = ['12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM','8PM','9PM','10PM','11PM','12AM'];
    return operatingHours.map(hour => ({
      hour,
      occupancy: Math.min(100, Math.round(((hoursCount[hour] || 0) / (total / operatingHours.length)) * 50))
    }));
  }, [filteredHistory]);

  // 5. Table Usage
  const tableUsage = useMemo(() => {
    return tables.map((table: any) => {
      const tHist = filteredHistory.filter((h: any) => h.tableId === table.id);
      const totalRev = tHist.reduce((s: number, h: any) => s + (h.totalAmount || 0), 0);
      return {
        name: table.name,
        sessions: tHist.length,
        revenue: totalRev,
        usage: Math.min(100, Math.round((tHist.length / 20) * 100))
      };
    }).sort((a: any, b: any) => b.revenue - a.revenue);
  }, [tables, filteredHistory]);

  // Top KPI Calcs
  const totalRevenue = filteredHistory.reduce((s: number, d: any) => s + (d.totalAmount || 0), 0);
  const avgOccupancy = Math.round(peakHours.reduce((s, d) => s + d.occupancy, 0) / peakHours.length) || 0;
  const peakHour = peakHours.reduce((max, d) => d.occupancy > max.occupancy ? d : max, peakHours[0]) || { hour: 'N/A', occupancy: 0 };
  const overallAvgDuration = filteredHistory.length 
    ? (filteredHistory.reduce((s: number, r: any) => s + (r.durationMinutes || 0), 0) / filteredHistory.length / 60).toFixed(1)
    : '0';


  // ==========================================
  // 🟢 SHIFT SUMMARY CALCULATIONS (FOR DRAWER)
  // ==========================================
  const dayStart = useMemo(() => startOfDay(new Date(selectedDate + 'T00:00:00')), [selectedDate]);
  const dayEnd   = useMemo(() => endOfDay(new Date(selectedDate + 'T00:00:00')), [selectedDate]);

  const dayReservations = useMemo(() => reservations.filter((r: any) => {
    const d = typeof r.date === 'string' ? parseISO(r.date) : new Date(r.date);
    return d >= dayStart && d <= dayEnd;
  }), [reservations, dayStart, dayEnd]);

  const dayHistory = useMemo(() => history.filter((h: any) => {
    const d = typeof h.endTime === 'string' ? parseISO(h.endTime) : new Date(h.endTime);
    return d >= dayStart && d <= dayEnd;
  }), [history, dayStart, dayEnd]);

  const combinedShiftData = useMemo(() => {
    const sessions = dayHistory.map((h: any) => ({
      id: h.id,
      isReservation: false,
      customerName: h.customerName,
      contactNumber: '—',
      timeSlot: format(new Date(h.startTime), 'h:mm a'),
      duration: `${h.durationMinutes}m`,
      partySize: '—',
      tableId: h.tableId,
      status: 'completed',
      totalAmount: h.totalAmount,
      paidAmount: h.amountPaid
    }));

    const pendingRes = dayReservations
      .filter((r: any) => r.status !== 'completed' && r.status !== 'cancelled')
      .map((r: any) => ({
        id: r.id,
        isReservation: true,
        customerName: r.customerName,
        contactNumber: r.contactNumber,
        timeSlot: r.timeSlot,
        duration: `${r.durationHours}h`,
        partySize: `${r.partySize} pax`,
        tableId: r.tableId,
        status: r.status,
        totalAmount: r.totalAmount,
        paidAmount: r.downPaymentPaid ? r.downPaymentAmount : 0
      }));

    return [...sessions, ...pendingRes];
  }, [dayHistory, dayReservations]);

  const tablesUsedToday = new Set(dayHistory.map((h: any) => h.tableId).filter(Boolean)).size;
  const revenueCollected = dayHistory.reduce((s: number, h: any) => s + (h.amountPaid || 0), 0);
  const reservationsServed = dayReservations.filter((r: any) => r.status === 'checked-in' || r.status === 'completed').length;
  const isSelectedToday = isToday(new Date(selectedDate + 'T00:00:00'));


  // ==========================================
  // 🟢 CSV EXPORT FUNCTIONS
  // ==========================================
  const handleExportAnalyticsCSV = () => {
    const headers = ['Session ID', 'Customer Name', 'Table', 'Start Time', 'End Time', 'Duration (mins)', 'Total Amount (PHP)', 'Amount Paid (PHP)'];
    
    const rows = filteredHistory.map((h: any) => {
      const tableName = tables.find((t: any) => t.id === h.tableId)?.name || h.tableId || 'Unknown';
      return [
        h.id,
        `"${h.customerName}"`,
        `"${tableName}"`,
        format(new Date(h.startTime), 'M/d/yy HH:mm'),
        h.endTime ? format(new Date(h.endTime), 'M/d/yy HH:mm') : '',
        h.durationMinutes || 0,
        (h.totalAmount || 0).toFixed(2),
        (h.amountPaid || 0).toFixed(2)
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Analytics_Export_${dateRange.start}_to_${dateRange.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportShiftCSV = () => {
    const headers = ['Customer Name', 'Type', 'Time Slot', 'Duration', 'Party Size', 'Table', 'Status', 'Total Bill (PHP)', 'Amount Paid (PHP)'];
    
    const rows = combinedShiftData.map((r: any) => {
      const tableName = tables.find((t: any) => t.id === r.tableId)?.name || r.tableId || 'Unknown';
      return [
        `"${r.customerName}"`,
        r.isReservation ? 'Reservation' : 'Walk-in',
        r.timeSlot,
        r.duration,
        r.partySize,
        `"${tableName}"`,
        r.status,
        (r.totalAmount || 0).toFixed(2),
        (r.paidAmount || 0).toFixed(2)
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Shift_Summary_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* ============================== */}
      {/* SHIFT SUMMARY DRAWER OVERLAY   */}
      {/* ============================== */}
      {isShiftDrawerOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsShiftDrawerOpen(false)}
        />
      )}

      {/* ============================== */}
      {/* SHIFT SUMMARY SLIDING DRAWER   */}
      {/* ============================== */}
      <div 
        className={`fixed inset-y-0 right-0 z-[110] w-full max-w-3xl bg-neutral-950 border-l border-neutral-800 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isShiftDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black text-neutral-100">Daily Shift Summary</h2>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Detailed single-day report</p>
            </div>
          </div>
          <button 
            onClick={() => setIsShiftDrawerOpen(false)} 
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2">
              <CalendarIcon size={14} className="text-neutral-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm text-neutral-200 focus:outline-none"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleExportShiftCSV}
                className="flex items-center gap-2 px-3 py-2 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-700/50 text-sky-400 text-sm rounded-xl font-semibold transition-all"
                title="Export shift data to CSV"
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 text-sm rounded-xl font-semibold transition-all"
                title="Print Shift Report"
              >
                <Printer size={14} /> Print
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Showing data for:</span>
            <span className="text-xs font-semibold text-neutral-200 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1">
              {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
              {isSelectedToday && <span className="ml-2 text-sky-400">(Today)</span>}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Tables Used', value: tablesUsedToday, icon: Table2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Completed Sessions', value: dayHistory.length, icon: BarChart2, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
              { label: 'Revenue Collected', value: formatPHP(revenueCollected), icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'Reservations Served', value: reservationsServed, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Avg Session Duration', value: dayHistory.length ? `${(dayHistory.reduce((s: number, r: any) => s + (r.durationMinutes || 0), 0) / dayHistory.length / 60).toFixed(1)}h` : '—', icon: Clock, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
              { label: 'Queue Served', value: isSelectedToday ? queue.filter((q: any) => q.status === 'called' || q.status === 'seated').length : '—', icon: Users, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`bg-neutral-950 border rounded-xl p-4 ${bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className={color} />
                  <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">{label}</p>
                </div>
                <p className={`text-xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden flex flex-col max-h-[500px]">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between flex-none bg-neutral-900/50">
              <h3 className="text-sm font-bold text-neutral-200">
                Transactions Log
              </h3>
              <span className="text-xs text-neutral-500">{combinedShiftData.length} records</span>
            </div>

            {combinedShiftData.length === 0 ? (
              <div className="px-5 py-12 text-center flex-1">
                <CalendarIcon size={28} className="mx-auto text-neutral-700 mb-2" />
                <p className="text-sm text-neutral-500">No transactions or reservations for this date.</p>
              </div>
            ) : (
              <div className="overflow-auto flex-1">
                <table className="w-full relative whitespace-nowrap">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-neutral-800 bg-neutral-950 shadow-sm">
                      {['Customer', 'Time', 'Duration', 'Party', 'Table', 'Status', 'Total', 'Paid'].map(h => (
                        <th key={h} className="text-left text-[10px] text-neutral-500 uppercase tracking-wider font-semibold px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {combinedShiftData.map((r: any, idx: number) => {
                      const cfg = statusConfig[r.status] || statusConfig.completed;
                      const tableName = r.tableId ? tables.find((t: any) => t.id === r.tableId)?.name || r.tableId : '—';
                      return (
                        <tr key={`${r.id}-${idx}`} className="hover:bg-neutral-900/40 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-neutral-200">
                              {r.customerName}
                              {r.isReservation ? (
                                <span className="ml-2 text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase border border-blue-500/30">Reservation</span>
                              ) : (
                                <span className="ml-2 text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase border border-emerald-500/30">Walk-in</span>
                              )}
                            </p>
                            <p className="text-xs text-neutral-500">{r.contactNumber}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-400">{r.timeSlot}</td>
                          <td className="px-4 py-3 text-sm text-neutral-400">{r.duration}</td>
                          <td className="px-4 py-3 text-sm text-neutral-400">{r.partySize}</td>
                          <td className="px-4 py-3 text-sm text-neutral-400">{tableName}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-200 font-semibold">{formatPHP(r.totalAmount || 0)}</td>
                          <td className="px-4 py-3 text-sm text-emerald-400 font-semibold">{formatPHP(r.paidAmount || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {combinedShiftData.length > 0 && (
              <div className="flex-none border-t border-neutral-700 bg-neutral-900/80 p-4 flex items-center justify-end gap-6 shadow-md">
                <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Day Totals:</span>
                <span className="text-sm font-black text-white">
                  {formatPHP(combinedShiftData.reduce((s: number, r: any) => s + (r.totalAmount || 0), 0))}
                </span>
                <span className="text-sm font-black text-emerald-400">
                  {formatPHP(combinedShiftData.reduce((s: number, r: any) => s + (r.paidAmount || 0), 0))}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* ============================== */}
      {/* MAIN ANALYTICS VIEW            */}
      {/* ============================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <h2 className="text-xl font-black text-neutral-100 flex items-center gap-2">
              <BarChart2 className="text-emerald-400" /> Overall Analytics
            </h2>
            <p className="text-xs text-neutral-500 mt-1">Review historical trends, revenue, and table performance.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Custom Date Range Picker */}
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="flex items-center px-3 py-2 border-r border-neutral-800">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mr-2">From</span>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-transparent text-sm text-neutral-200 focus:outline-none"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="flex items-center px-3 py-2">
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mr-2">To</span>
                <input
                  type="date"
                  value={dateRange.end}
                  min={dateRange.start}
                  onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-transparent text-sm text-neutral-200 focus:outline-none"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>

            <button
              onClick={handleExportAnalyticsCSV}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-xl font-semibold transition-all border border-neutral-700 flex-none"
              title="Export Range"
            >
              <Download size={14} /> <span className="hidden sm:inline">Export</span>
            </button>
            
            {/* 🟢 NEW: Daily Shift Summary Drawer Toggle */}
            <button
              onClick={() => setIsShiftDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-400 text-sm rounded-xl font-semibold transition-all flex-none shadow-lg shadow-sky-900/20"
            >
              <ClipboardList size={16} /> Daily Shift Summary
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Revenue" value={`₱${totalRevenue.toLocaleString()}`} sub="For selected date range" icon={DollarSign} color="text-emerald-400" />
          <StatCard label="Avg Occupancy" value={`${avgOccupancy}%`} sub="Across operating hours" icon={TableProperties} color="text-blue-400" />
          <StatCard label="Peak Hour" value={peakHour.hour} sub={`${peakHour.occupancy}% occupancy`} icon={Clock} color="text-amber-400" />
          <StatCard label="Avg Session" value={`${overallAvgDuration} hrs`} sub="Per table booking" icon={BarChart3} color="text-purple-400" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Trend Over Time */}
          <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-neutral-300">Revenue Trend</h3>
                <p className="text-xs text-neutral-600 mt-0.5">Daily revenue across the selected date range</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="analytics-revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop key="stop-top"    offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                    <stop key="stop-bottom" offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area key="area-weekly-revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#analytics-revGrad)" dot={{ fill: '#10b981', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Session Distribution */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-neutral-300 mb-1">Session Length</h3>
            <p className="text-xs text-neutral-600 mb-4">Distribution by duration</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={sessionDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {sessionDist.map((entry, i) => (
                    <Cell key={`pie-cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {sessionDist.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-neutral-400">{item.name}</span>
                  </div>
                  <span className="text-neutral-500 font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Peak Hours */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-neutral-300">Peak Hours Analysis</h3>
                <p className="text-xs text-neutral-600 mt-0.5">Estimated table occupancy by hour</p>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-xs text-amber-400 font-semibold">Peak: {peakHour.hour}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#737373' }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#737373' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line key="line-peak-occupancy" type="monotone" dataKey="occupancy" name="Avg Occupancy" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Day of Week */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-neutral-300">Revenue by Day</h3>
                <p className="text-xs text-neutral-600 mt-0.5">Which days of the week perform best?</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueByDayOfWeek} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar key="bar-monthly-revenue" dataKey="revenue" name="Total Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table Usage Table */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-300">Table Performance Report</h3>
              <p className="text-xs text-neutral-600 mt-0.5">Usage and revenue per table for the selected range</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  {['Table', 'Total Sessions', 'Revenue', 'Utilization', 'Status'].map(h => (
                    <th key={h} className="text-left text-[10px] text-neutral-500 uppercase tracking-wider font-semibold py-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/40">
                {tableUsage.map((t) => (
                  <tr key={t.name} className="hover:bg-neutral-900/40 transition-colors">
                    <td className="py-3 pr-4 text-sm font-semibold text-neutral-200">{t.name}</td>
                    <td className="py-3 pr-4 text-sm text-neutral-400">{t.sessions}</td>
                    <td className="py-3 pr-4 text-sm text-emerald-400 font-medium">₱{t.revenue.toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-neutral-800 rounded-full max-w-[80px]">
                          <div
                            className={`h-full rounded-full ${t.usage >= 80 ? 'bg-emerald-500' : t.usage >= 60 ? 'bg-blue-500' : t.usage >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${t.usage}%` }}
                          />
                        </div>
                        <span className="text-xs text-neutral-500">{t.usage}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        t.usage >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                        t.usage >= 60 ? 'bg-blue-500/10 text-blue-400' :
                        t.usage >= 40 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-rose-500/10 text-rose-400'
                      }`}>
                        {t.usage >= 80 ? 'High Demand' : t.usage >= 60 ? 'Active' : t.usage >= 40 ? 'Moderate' : 'Low Use'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}