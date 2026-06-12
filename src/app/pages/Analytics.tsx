import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useAppContext, HOURLY_RATE } from '../context/AppContext';
import { TrendingUp, TrendingDown, BarChart3, Clock, DollarSign, TableProperties } from 'lucide-react';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

// Mock historical data
const weeklyRevenue = [
  { day: 'Mon', revenue: 875, tables: 35 },
  { day: 'Tue', revenue: 750, tables: 30 },
  { day: 'Wed', revenue: 1125, tables: 45 },
  { day: 'Thu', revenue: 1000, tables: 40 },
  { day: 'Fri', revenue: 1625, tables: 65 },
  { day: 'Sat', revenue: 2000, tables: 80 },
  { day: 'Sun', revenue: 1750, tables: 70 },
];

const peakHours = [
  { hour: '10AM', occupancy: 20 },
  { hour: '11AM', occupancy: 35 },
  { hour: '12PM', occupancy: 55 },
  { hour: '1PM', occupancy: 70 },
  { hour: '2PM', occupancy: 80 },
  { hour: '3PM', occupancy: 85 },
  { hour: '4PM', occupancy: 90 },
  { hour: '5PM', occupancy: 95 },
  { hour: '6PM', occupancy: 88 },
  { hour: '7PM', occupancy: 82 },
  { hour: '8PM', occupancy: 75 },
  { hour: '9PM', occupancy: 65 },
  { hour: '10PM', occupancy: 50 },
  { hour: '11PM', occupancy: 35 },
  { hour: '12AM', occupancy: 25 },
  { hour: '1AM', occupancy: 10 },
];

const monthlyTrend = [
  { month: 'Jan', revenue: 24500, sessions: 980 },
  { month: 'Feb', revenue: 22000, sessions: 880 },
  { month: 'Mar', revenue: 27500, sessions: 1100 },
  { month: 'Apr', revenue: 31000, sessions: 1240 },
  { month: 'May', revenue: 29000, sessions: 1160 },
  { month: 'Jun', revenue: 33000, sessions: 1320 },
  { month: 'Jul', revenue: 35000, sessions: 1400 },
];

const tableUsage = [
  { name: 'Table 1', sessions: 145, revenue: 3625, usage: 92 },
  { name: 'Table 2', sessions: 138, revenue: 3450, usage: 87 },
  { name: 'Table 3', sessions: 130, revenue: 3250, usage: 82 },
  { name: 'Table 4', sessions: 125, revenue: 3125, usage: 79 },
  { name: 'Table 5', sessions: 118, revenue: 2950, usage: 75 },
  { name: 'Table 6', sessions: 112, revenue: 2800, usage: 71 },
  { name: 'Table 7', sessions: 105, revenue: 2625, usage: 66 },
  { name: 'Table 8', sessions: 98, revenue: 2450, usage: 62 },
  { name: 'Table 9', sessions: 88, revenue: 2200, usage: 56 },
  { name: 'Table 10', sessions: 75, revenue: 1875, usage: 47 },
];

const sessionDist = [
  { name: '1 Hour', value: 35 },
  { name: '2 Hours', value: 40 },
  { name: '3 Hours', value: 18 },
  { name: '4+ Hours', value: 7 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs text-neutral-400 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={`tooltip-${i}-${String(p.name ?? i)}-${String(p.dataKey ?? i)}`} className="text-xs font-semibold" style={{ color: p.color }}>
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
      {trend && (
        <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(trend)}% vs last week
        </div>
      )}
    </div>
  );
}

export function Analytics() {
  const { tables, reservations } = useAppContext();
  const totalRevenue = weeklyRevenue.reduce((s, d) => s + d.revenue, 0);
  const avgOccupancy = Math.round(peakHours.reduce((s, d) => s + d.occupancy, 0) / peakHours.length);
  const peakHour = peakHours.reduce((max, d) => d.occupancy > max.occupancy ? d : max, peakHours[0]);

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Weekly Revenue" value={`₱${totalRevenue.toLocaleString()}`} sub="Table rentals only" trend={12} icon={DollarSign} color="text-emerald-400" />
        <StatCard label="Avg Occupancy" value={`${avgOccupancy}%`} sub="Across operating hours" trend={5} icon={TableProperties} color="text-blue-400" />
        <StatCard label="Peak Hour" value={peakHour.hour} sub={`${peakHour.occupancy}% occupancy`} icon={Clock} color="text-amber-400" />
        <StatCard label="Avg Session" value="1.8 hrs" sub="Per table booking" trend={-3} icon={BarChart3} color="text-purple-400" />
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
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg">+12% WoW</span>
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
                  <Cell key={`pie-cell-${entry.name.replace(/\s+/g, '-')}-${i}`} fill={COLORS[i % COLORS.length]} />
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
              <p className="text-xs text-neutral-600 mt-0.5">Table occupancy by hour of day</p>
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
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-neutral-900 rounded-lg p-2 border border-neutral-800">
              <p className="text-xs font-black text-amber-400">11AM–6PM</p>
              <p className="text-[10px] text-neutral-600">Peak Window</p>
            </div>
            <div className="bg-neutral-900 rounded-lg p-2 border border-neutral-800">
              <p className="text-xs font-black text-emerald-400">{avgOccupancy}%</p>
              <p className="text-[10px] text-neutral-600">Avg Occupancy</p>
            </div>
            <div className="bg-neutral-900 rounded-lg p-2 border border-neutral-800">
              <p className="text-xs font-black text-blue-400">{peakHour.occupancy}%</p>
              <p className="text-[10px] text-neutral-600">Peak Rate</p>
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-300">Monthly Trend</h3>
              <p className="text-xs text-neutral-600 mt-0.5">Revenue growth over 7 months</p>
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
            <p className="text-xs text-neutral-600 mt-0.5">Historical usage and revenue per table — supports add/reduce decisions</p>
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
              {tableUsage.map((t, i) => (
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
        <div className="mt-4 p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg">
          <p className="text-xs text-blue-300">
            <strong>AI Insight:</strong> Tables 1–3 show consistently high demand (80%+ utilization). Consider adding 2–3 more tables to accommodate peak-hour overflow. Tables 9–10 underperform — consider repositioning or promotional pricing.
          </p>
        </div>
      </div>
    </div>
  );
}