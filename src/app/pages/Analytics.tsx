import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { TrendingUp, TrendingDown, BarChart3, Clock, DollarSign, TableProperties, Calendar as CalendarIcon, Printer, CheckCircle, Table2, Users, BarChart2 } from 'lucide-react';
import { format, isToday, startOfDay, endOfDay, subDays, subMonths, isSameDay, isSameMonth, parseISO } from 'date-fns';

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
          <p key={`tooltip-${i}`} className="text-xs font-semibold" style={{ color: p.color }}>
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

function StatCard({ label, value, sub, trend, icon: Icon, color }: any) {
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
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(trend)}% vs last week
        </div>
      )}
    </div>
  );
}

export function Analytics() {
  const { tables, reservations, queue } = useAppContext();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // ==========================================
  // 🟢 DYNAMIC DATA CALCULATIONS (Replaces Hardcoded Arrays)
  // ==========================================
  const validReservations = useMemo(() => reservations.filter(r => r.status === 'completed' || r.status === 'checked-in'), [reservations]);

  // 1. Weekly Revenue (Last 7 Days)
  const weeklyRevenue = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const targetDate = subDays(new Date(), 6 - i); // 6 days ago up to today
      const dayRes = validReservations.filter(r => isSameDay(new Date(r.date), targetDate));
      return {
        day: format(targetDate, 'EEE'), // e.g., 'Mon', 'Tue'
        revenue: dayRes.reduce((s, r) => s + r.totalAmount, 0),
        tables: dayRes.length
      };
    });
  }, [validReservations]);

  // 2. Monthly Trend (Last 6 Months)
  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const targetMonth = subMonths(new Date(), 5 - i);
      const monthRes = validReservations.filter(r => isSameMonth(new Date(r.date), targetMonth));
      return {
        month: format(targetMonth, 'MMM'), // e.g., 'Jan', 'Feb'
        revenue: monthRes.reduce((s, r) => s + r.totalAmount, 0),
        sessions: monthRes.length
      };
    });
  }, [validReservations]);

  // 3. Session Length Distribution
  const sessionDist = useMemo(() => {
    const counts = { '1 Hour': 0, '2 Hours': 0, '3 Hours': 0, '4+ Hours': 0 };
    validReservations.forEach(r => {
      if (r.durationHours === 1) counts['1 Hour']++;
      else if (r.durationHours === 2) counts['2 Hours']++;
      else if (r.durationHours === 3) counts['3 Hours']++;
      else if (r.durationHours >= 4) counts['4+ Hours']++;
    });
    
    const total = validReservations.length || 1; // avoid division by zero
    return Object.entries(counts).map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100)
    })).filter(c => c.value > 0);
  }, [validReservations]);

  // 4. Peak Hours
  const peakHours = useMemo(() => {
    const hoursCount: Record<string, number> = {};
    validReservations.forEach(r => {
      const hourStr = r.timeSlot.split(':')[0]; // e.g., "14" from "14:00"
      const hourNum = parseInt(hourStr, 10);
      const label = hourNum === 12 ? '12PM' : hourNum > 12 ? `${hourNum - 12}PM` : `${hourNum}AM`;
      hoursCount[label] = (hoursCount[label] || 0) + 1;
    });

    const total = validReservations.length || 1;
    // Map to an array of common operating hours
    const operatingHours = ['12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM','8PM','9PM','10PM','11PM','12AM'];
    return operatingHours.map(hour => ({
      hour,
      // Rough occupancy estimation for demo based on counts
      occupancy: Math.min(100, Math.round(((hoursCount[hour] || 0) / (total / operatingHours.length)) * 50))
    }));
  }, [validReservations]);

  // 5. Table Usage
  const tableUsage = useMemo(() => {
    return tables.map(table => {
      const tRes = validReservations.filter(r => r.tableId === table.id);
      const totalRev = tRes.reduce((s, r) => s + r.totalAmount, 0);
      return {
        name: table.name,
        sessions: tRes.length,
        revenue: totalRev,
        // Rough mock usage calc: max possible is arbitrary 20 for this view
        usage: Math.min(100, Math.round((tRes.length / 20) * 100))
      };
    }).sort((a, b) => b.revenue - a.revenue); // Sort best performing to top
  }, [tables, validReservations]);


  // ==========================================
  // TOP KPI CALCULATIONS
  // ==========================================
  const totalRevenue = weeklyRevenue.reduce((s, d) => s + d.revenue, 0);
  const avgOccupancy = Math.round(peakHours.reduce((s, d) => s + d.occupancy, 0) / peakHours.length) || 0;
  const peakHour = peakHours.reduce((max, d) => d.occupancy > max.occupancy ? d : max, peakHours[0]) || { hour: 'N/A', occupancy: 0 };
  const overallAvgDuration = validReservations.length 
    ? (validReservations.reduce((s, r) => s + r.durationHours, 0) / validReservations.length).toFixed(1)
    : '0';

  // ==========================================
  // SHIFT SUMMARY CALCULATIONS
  // ==========================================
  const dayStart = useMemo(() => startOfDay(new Date(selectedDate + 'T00:00:00')), [selectedDate]);
  const dayEnd   = useMemo(() => endOfDay(new Date(selectedDate + 'T00:00:00')), [selectedDate]);

  const dayReservations = useMemo(() => reservations.filter(r => {
    // Need to handle both actual Date objects and stringified ISO dates coming from backend
    const d = typeof r.date === 'string' ? parseISO(r.date) : new Date(r.date);
    return d >= dayStart && d <= dayEnd;
  }), [reservations, dayStart, dayEnd]);

  const tablesUsedToday = useMemo(() => {
    const used = new Set<string>();
    dayReservations.forEach(r => { if (r.tableId) used.add(r.tableId); });
    return used.size;
  }, [dayReservations]);

  const revenueCollected = useMemo(() => {
    return dayReservations
      .filter(r => r.status !== 'cancelled')
      .reduce((s, r) => {
        let paid = 0;
        if (r.downPaymentPaid) paid += r.downPaymentAmount;
        if (r.balancePaid) paid += (r.totalAmount - r.downPaymentAmount);
        return s + paid;
      }, 0);
  }, [dayReservations]);

  const isSelectedToday = isToday(new Date(selectedDate + 'T00:00:00'));

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Weekly Revenue" value={`₱${totalRevenue.toLocaleString()}`} sub="Table rentals only" trend={0} icon={DollarSign} color="text-emerald-400" />
        <StatCard label="Avg Occupancy" value={`${avgOccupancy}%`} sub="Across operating hours" icon={TableProperties} color="text-blue-400" />
        <StatCard label="Peak Hour" value={peakHour.hour} sub={`${peakHour.occupancy}% occupancy`} icon={Clock} color="text-amber-400" />
        <StatCard label="Avg Session" value={`${overallAvgDuration} hrs`} sub="Per table booking" icon={BarChart3} color="text-purple-400" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Revenue */}
        <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-300">Weekly Revenue</h3>
              <p className="text-xs text-neutral-600 mt-0.5">Table rental income this week</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyRevenue}>
              <defs>
                <linearGradient id="analytics-revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop key="stop-top"    offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                  <stop key="stop-bottom" offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area key="area-weekly-revenue" type="monotone" dataKey="revenue" name="Weekly Revenue" stroke="#10b981" strokeWidth={2} fill="url(#analytics-revGrad)" dot={{ fill: '#10b981', r: 3 }} />
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
              <Line key="line-peak-occupancy" type="monotone" dataKey="occupancy" name="Peak Occupancy" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-300">Monthly Trend</h3>
              <p className="text-xs text-neutral-600 mt-0.5">Revenue growth over 6 months</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyTrend} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar key="bar-monthly-revenue" dataKey="revenue" name="Monthly Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Usage Table */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-300">Table Performance Report</h3>
            <p className="text-xs text-neutral-600 mt-0.5">Historical usage and revenue per table</p>
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

      {/* Daily Shift Summary */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" /> Daily Shift Summary
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">Summary of table activity, revenue, and reservations for selected date</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2">
              <CalendarIcon size={14} className="text-neutral-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm text-neutral-200 focus:outline-none"
              />
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 text-sm rounded-xl font-semibold transition-all"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* Date Label */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Showing data for:</span>
          <span className="text-xs font-semibold text-neutral-200 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1">
            {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
            {isSelectedToday && <span className="ml-2 text-emerald-400">(Today)</span>}
          </span>
        </div>

        {/* Shift Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Tables Used', value: tablesUsedToday, icon: Table2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Total Sessions', value: dayReservations.length, icon: BarChart2, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
            { label: 'Revenue Collected', value: formatPHP(revenueCollected), icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Reservations Served', value: dayReservations.filter(r => r.status === 'checked-in' || r.status === 'completed').length, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Avg Session Duration', value: dayReservations.length ? `${(dayReservations.reduce((s, r) => s + r.durationHours, 0) / dayReservations.length).toFixed(1)}h` : '—', icon: Clock, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
            { label: 'Queue Served', value: isSelectedToday ? queue.filter((q: any) => q.status === 'called' || q.status === 'seated').length : '—', icon: Users, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`bg-neutral-950 border rounded-xl p-4 ${bg}`}>
              <div className="flex items-center gap-3 mb-2">
                <Icon size={15} className={color} />
                <p className="text-xs text-neutral-500 font-semibold">{label}</p>
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Reservations Table */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-200">
              Reservations for {format(new Date(selectedDate + 'T00:00:00'), 'MMM d, yyyy')}
            </h3>
            <span className="text-xs text-neutral-500">{dayReservations.length} total</span>
          </div>

          {dayReservations.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CalendarIcon size={28} className="mx-auto text-neutral-700 mb-2" />
              <p className="text-sm text-neutral-500">No reservations for this date.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/40">
                    {['Customer', 'Time', 'Duration', 'Party', 'Table', 'Status', 'Total', 'Paid'].map(h => (
                      <th key={h} className="text-left text-[10px] text-neutral-500 uppercase tracking-wider font-semibold px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {dayReservations.map((r: any) => {
                    const cfg = statusConfig[r.status] || statusConfig.pending;
                    const tableName = r.tableId ? tables.find(t => t.id === r.tableId)?.name || r.tableId : '—';
                    const amtPaid = (r.downPaymentPaid ? r.downPaymentAmount : 0) + (r.balancePaid ? r.totalAmount - r.downPaymentAmount : 0);
                    return (
                      <tr key={r.id} className="hover:bg-neutral-900/40 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-neutral-200">{r.customerName}</p>
                          <p className="text-xs text-neutral-500">{r.contactNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-400">{r.timeSlot}</td>
                        <td className="px-4 py-3 text-sm text-neutral-400">{r.durationHours}h</td>
                        <td className="px-4 py-3 text-sm text-neutral-400">{r.partySize} pax</td>
                        <td className="px-4 py-3 text-sm text-neutral-400">{tableName}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-200 font-semibold">{formatPHP(r.totalAmount)}</td>
                        <td className="px-4 py-3 text-sm text-emerald-400 font-semibold">{formatPHP(amtPaid)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-neutral-700 bg-neutral-900/30">
                    <td colSpan={6} className="px-4 py-3 text-xs text-neutral-500 font-semibold uppercase tracking-wider">Totals</td>
                    <td className="px-4 py-3 text-sm font-black text-white">
                      {formatPHP(dayReservations.filter((r: any) => r.status !== 'cancelled').reduce((s: number, r: any) => s + r.totalAmount, 0))}
                    </td>
                    <td className="px-4 py-3 text-sm font-black text-emerald-400">
                      {formatPHP(dayReservations.reduce((s: number, r: any) => {
                        let p = 0;
                        if (r.downPaymentPaid) p += r.downPaymentAmount;
                        if (r.balancePaid) p += r.totalAmount - r.downPaymentAmount;
                        return s + p;
                      }, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}