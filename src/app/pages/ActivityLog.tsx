import { useState, useMemo } from 'react';
import { useAppContext, ActivityType } from '../context/AppContext';
import { 
  PlusCircle, XCircle, RefreshCw, Info, FileText, 
  LayoutGrid, ShoppingCart, CalendarDays, Users, ShieldCheck, Tag
} from 'lucide-react';
import { isToday, isYesterday, isThisWeek, isThisMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export function ActivityLog() {
  const { activities } = useAppContext();
  
  // ── Filters matching the reference image ──
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // ── Category / Module Mapping ──
  const categoryMap: Record<string, ActivityType[]> = {
    'Table Management': ['table_assigned', 'table_freed', 'table_reserved', 'session_extended'],
    'Point of Sale': ['pos_order', 'payment_received'],
    'Reservations': ['reservation_created', 'reservation_updated', 'reservation_cancelled'],
    'Queue System': ['queue_added', 'queue_removed', 'queue_called'],
    'System Actions': ['admin_action', 'tako_action', 'promo_created'],
  };

  // ── Helpers ──
  const getActor = (description: string) => {
    const match = description.match(/\(Action by:\s*(.*?)\)/);
    return match ? match[1] : 'System';
  };

  const cleanDescription = (desc: string) => desc.replace(/\s*\(Action by:.*?\)/, '');

  const getModule = (type: string) => {
    for (const [cat, types] of Object.entries(categoryMap)) {
      if (types.includes(type as any)) return cat;
    }
    return 'System Actions';
  };

  const getModuleIcon = (moduleName: string) => {
    switch (moduleName) {
      case 'Table Management': return <LayoutGrid size={12} className="text-blue-400" />;
      case 'Point of Sale': return <ShoppingCart size={12} className="text-emerald-400" />;
      case 'Reservations': return <CalendarDays size={12} className="text-purple-400" />;
      case 'Queue System': return <Users size={12} className="text-amber-400" />;
      default: return <ShieldCheck size={12} className="text-rose-400" />;
    }
  };

  const getEventUI = (type: string) => {
    const formattedText = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    if (type.includes('created') || type.includes('added') || type === 'pos_order' || type.includes('received')) {
      return { icon: <PlusCircle size={14} className="text-emerald-500" />, text: formattedText };
    }
    if (type.includes('removed') || type.includes('freed') || type.includes('cancelled') || type.includes('deleted')) {
      return { icon: <XCircle size={14} className="text-rose-500" />, text: formattedText };
    }
    if (type.includes('updated') || type.includes('extended') || type.includes('changed') || type.includes('toggled') || type.includes('called') || type.includes('assigned')) {
      return { icon: <RefreshCw size={14} className="text-blue-500" />, text: formattedText };
    }
    return { icon: <Info size={14} className="text-amber-500" />, text: formattedText };
  };

  // ── Unique Lists for Dropdowns ──
  const uniqueActors = useMemo(() => Array.from(new Set(activities.map(a => getActor(a.description)))).sort(), [activities]);
  const uniqueEvents = useMemo(() => Array.from(new Set(activities.map(a => a.type))).sort(), [activities]);

  // ── Filtering Logic ──
  const filteredActivities = activities.filter(a => {
    const actDate = new Date(a.timestamp);
    
    // Date Filter
    if (dateFilter === 'TODAY' && !isToday(actDate)) return false;
    if (dateFilter === 'YESTERDAY' && !isYesterday(actDate)) return false;
    if (dateFilter === 'THIS_WEEK' && !isThisWeek(actDate)) return false;
    if (dateFilter === 'THIS_MONTH' && !isThisMonth(actDate)) return false;
    if (dateFilter === 'CUSTOM') {
      if (startDate && endDate && !isWithinInterval(actDate, { start: startOfDay(new Date(startDate)), end: endOfDay(new Date(endDate)) })) return false;
    }

    // Module, Actor, Event Filters
    if (moduleFilter !== 'ALL' && getModule(a.type) !== moduleFilter) return false;
    if (actorFilter !== 'ALL' && getActor(a.description) !== actorFilter) return false;
    if (eventFilter !== 'ALL' && a.type !== eventFilter) return false;

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* ── Header ── */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Activity log</h2>
        <p className="text-sm text-neutral-500 mt-1">List of all events in the system account.</p>
      </div>

      {/* ── Filter Bar (Matches Image Layout) ── */}
      <div className="flex flex-col xl:flex-row items-end xl:items-center justify-between gap-4 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full xl:w-auto flex-1">
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-500 tracking-wider">Period</label>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-800 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-emerald-500 transition-colors">
              <option value="ALL">All time</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Range...</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-500 tracking-wider">Module</label>
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-800 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-emerald-500 transition-colors">
              <option value="ALL">All modules</option>
              {Object.keys(categoryMap).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-500 tracking-wider">Employee</label>
            <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-800 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-emerald-500 transition-colors">
              <option value="ALL">All employees</option>
              {uniqueActors.map(actor => <option key={actor} value={actor}>{actor}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral-500 tracking-wider">Events</label>
            <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-800 rounded-lg text-sm text-neutral-200 focus:outline-none focus:border-emerald-500 transition-colors">
              <option value="ALL">All events</option>
              {uniqueEvents.map(evt => <option key={evt} value={evt}>{evt.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>

        {/* Create Report Button */}
        <button className="flex items-center gap-2 bg-[#2a75d3] hover:bg-[#2060b3] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors h-[42px] whitespace-nowrap">
          <FileText size={16} /> Create report
        </button>
      </div>

      {/* ── Custom Date Range Inputs (Conditional) ── */}
      {dateFilter === 'CUSTOM' && (
        <div className="flex items-center gap-3 bg-neutral-900/30 p-3 rounded-lg border border-neutral-800 animate-in fade-in">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ colorScheme: 'dark' }} className="bg-neutral-900 border border-neutral-800 rounded flex-1 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" />
          <span className="text-neutral-500 text-sm">—</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ colorScheme: 'dark' }} className="bg-neutral-900 border border-neutral-800 rounded flex-1 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" />
        </div>
      )}

      {/* ── Activity Data Table ── */}
      <div className="bg-[#121212] border border-neutral-800 rounded-lg overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#1e1e1e] text-neutral-400 font-semibold border-b border-neutral-800">
            <tr>
              <th className="px-5 py-3.5 font-medium min-w-[160px]">Date and time</th>
              <th className="px-5 py-3.5 font-medium min-w-[180px]">Module</th>
              <th className="px-5 py-3.5 font-medium min-w-[140px]">Employee</th>
              <th className="px-5 py-3.5 font-medium min-w-[200px]">Event</th>
              <th className="px-5 py-3.5 font-medium w-full">Additional Details</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-neutral-800/50">
            {filteredActivities.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-neutral-500">
                  <p className="font-semibold">No activity found for this period.</p>
                </td>
              </tr>
            ) : (
              filteredActivities.map((act) => {
                const dateObj = new Date(act.timestamp);
                const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')} ${dateObj.toLocaleString('default', { month: 'short' })} ${dateObj.getFullYear()} ${dateObj.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}`;
                
                const moduleName = getModule(act.type);
                const eventUI = getEventUI(act.type);
                const cleanDesc = cleanDescription(act.description);

                return (
                  <tr key={act.id} className="hover:bg-neutral-900/30 transition-colors group">
                    {/* Date and Time */}
                    <td className="px-5 py-3.5 text-neutral-300">
                      {formattedDate}
                    </td>

                    {/* Module (Location equivalent) */}
                    <td className="px-5 py-3.5 text-neutral-400">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-neutral-900 border border-neutral-800">
                           {getModuleIcon(moduleName)}
                        </div>
                        {moduleName}
                      </div>
                    </td>

                    {/* Employee */}
                    <td className="px-5 py-3.5 text-neutral-300">
                      {getActor(act.description)}
                    </td>

                    {/* Event */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 text-neutral-300 font-medium">
                        {eventUI.icon}
                        {eventUI.text}
                      </div>
                    </td>

                    {/* Additional Details */}
                    <td className="px-5 py-3.5 text-neutral-400 whitespace-normal min-w-[300px]">
                      {cleanDesc}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {/* Footer Total */}
        <div className="px-5 py-4 border-t border-neutral-800 bg-[#1e1e1e]/50 text-xs font-semibold text-neutral-400">
          Total — {filteredActivities.length}
        </div>
      </div>
    </div>
  );
}