import { useState, useMemo } from 'react';
import { useAppContext, ActivityType } from '../context/AppContext';
import { Clock, Filter, ShieldCheck, ShoppingCart, CalendarDays, Users, LayoutGrid, Calendar, User } from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export function ActivityLog() {
  const { activities } = useAppContext();
  
  // ── States ──
  const [categoryFilter, setCategoryFilter] = useState<ActivityType | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL_TIME');
  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // ── Category Mapping ──
  const categoryMap: Record<string, ActivityType[]> = {
    'Table Management': ['table_assigned', 'table_freed', 'table_reserved', 'session_extended'],
    'Point of Sale': ['pos_order', 'payment_received'],
    'Reservations': ['reservation_created', 'reservation_updated', 'reservation_cancelled'],
    'Queue System': ['queue_added', 'queue_removed', 'queue_called'],
    'Admin Actions': ['admin_action', 'tako_action', 'promo_created'],
  };

  // ── Actor Extraction Helper ──
  const getActor = (description: string) => {
    const match = description.match(/\(Action by:\s*(.*?)\)/);
    return match ? match[1] : 'System / Legacy';
  };

  // ── Get Unique Actors for Dropdown ──
  const uniqueActors = useMemo(() => {
    const actors = new Set(activities.map(a => getActor(a.description)));
    return Array.from(actors).sort();
  }, [activities]);

  // ── Filtering Logic ──
  const filteredActivities = activities.filter(a => {
    // 1. Category Filter Check
    let matchesCategory = true;
    if (categoryFilter !== 'ALL') {
      if (categoryFilter.startsWith('CAT_')) {
        const catName = categoryFilter.replace('CAT_', '');
        matchesCategory = categoryMap[catName]?.includes(a.type) || false;
      } else {
        matchesCategory = a.type === categoryFilter;
      }
    }
    if (!matchesCategory) return false;

    // 2. Date Filter Check
    const actDate = new Date(a.timestamp);
    if (dateFilter === 'TODAY') {
      if (!isToday(actDate)) return false;
    } else if (dateFilter === 'YESTERDAY') {
      if (!isYesterday(actDate)) return false;
    } else if (dateFilter === 'THIS_WEEK') {
      if (!isThisWeek(actDate)) return false;
    } else if (dateFilter === 'THIS_MONTH') {
      if (!isThisMonth(actDate)) return false;
    } else if (dateFilter === 'CUSTOM') {
      if (startDate && endDate) {
        const start = startOfDay(new Date(startDate));
        const end = endOfDay(new Date(endDate));
        if (!isWithinInterval(actDate, { start, end })) return false;
      } else if (startDate) {
        if (actDate < startOfDay(new Date(startDate))) return false;
      } else if (endDate) {
        if (actDate > endOfDay(new Date(endDate))) return false;
      }
    }

    // 3. Actor Filter Check
    if (actorFilter !== 'ALL') {
      if (getActor(a.description) !== actorFilter) return false;
    }

    return true;
  });

  // ── Clean Description (Removes the "(Action by: ...)" for cleaner UI) ──
  const cleanDescription = (desc: string) => {
    return desc.replace(/\s*\(Action by:.*?\)/, '');
  };

  // ── Icon Helper ──
  const getIcon = (type: string) => {
    if (categoryMap['Table Management'].includes(type as any)) return <LayoutGrid size={16} className="text-blue-400" />;
    if (categoryMap['Point of Sale'].includes(type as any)) return <ShoppingCart size={16} className="text-emerald-400" />;
    if (categoryMap['Reservations'].includes(type as any)) return <CalendarDays size={16} className="text-purple-400" />;
    if (categoryMap['Queue System'].includes(type as any)) return <Users size={16} className="text-amber-400" />;
    return <ShieldCheck size={16} className="text-rose-400" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Filters Header ── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-neutral-950 p-6 rounded-2xl border border-neutral-800">
        <div>
          <h2 className="text-2xl font-black text-white">Activity Log History</h2>
          <p className="text-sm text-neutral-500 mt-1">Audit log for all staff and system actions.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-end sm:items-center gap-3 w-full xl:w-auto justify-end">
          
          {/* Made By (Actor) Filter */}
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <User size={14} className="text-neutral-400" />
            </div>
            <select 
              value={actorFilter} 
              onChange={(e) => setActorFilter(e.target.value)}
              className="w-full sm:w-auto pl-9 pr-8 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
            >
              <option value="ALL">Made By: All Users</option>
              {uniqueActors.map(actor => (
                <option key={actor} value={actor}>{actor}</option>
              ))}
            </select>
          </div>

          {/* Date Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Calendar size={14} className="text-neutral-400" />
            </div>
            <select 
              value={dateFilter} 
              onChange={(e) => {
                setDateFilter(e.target.value);
                if (e.target.value !== 'CUSTOM') {
                  setStartDate('');
                  setEndDate('');
                }
              }}
              className="w-full sm:w-auto pl-9 pr-8 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
            >
              <option value="ALL_TIME">All Time</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Range...</option>
            </select>
          </div>

          {/* Category Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Filter size={14} className="text-neutral-400" />
            </div>
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full sm:w-auto pl-9 pr-8 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
            >
              <option value="ALL">All Categories</option>
              <optgroup label="Filter by Type">
                {Object.keys(categoryMap).map(cat => (
                  <option key={cat} value={`CAT_${cat}`}>{cat}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* ── Custom Date Range Inputs (Conditional) ── */}
      {dateFilter === 'CUSTOM' && (
        <div className="flex items-center gap-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex-1 sm:flex-none">
            <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">Start Date</label>
            <input 
              type="date" 
              style={{ colorScheme: 'dark' }}
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="flex-1 sm:flex-none">
            <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">End Date</label>
            <input 
              type="date" 
              style={{ colorScheme: 'dark' }}
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          {(startDate || endDate) && (
            <div className="pt-5 hidden sm:block">
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); setDateFilter('ALL_TIME'); }}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-2 rounded-lg hover:bg-rose-950/30 transition-colors"
              >
                Clear Range
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Activity List ── */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-2">
        {filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <Clock size={32} className="mx-auto mb-3 opacity-50" />
            <p className="font-semibold text-neutral-300">No activity found</p>
            <p className="text-xs mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/50">
            {filteredActivities.map((act) => {
              const actor = getActor(act.description);
              
              return (
                <div key={act.id} className="p-4 hover:bg-neutral-900/50 transition-colors flex items-start gap-4">
                  <div className="mt-1 p-2 bg-neutral-900 rounded-lg border border-neutral-800 flex-shrink-0">
                    {getIcon(act.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-200 leading-relaxed font-medium">
                      {cleanDescription(act.description)}
                    </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                        {act.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/50">
                        <User size={10} /> {actor}
                      </span>
                      <span className="text-[10px] text-neutral-600 flex items-center gap-1">
                        <CalendarDays size={10} /> 
                        {new Date(act.timestamp).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-neutral-600 flex items-center gap-1">
                        <Clock size={10} /> 
                        {new Date(act.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })} ({formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}