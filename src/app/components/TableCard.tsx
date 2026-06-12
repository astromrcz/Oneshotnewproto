import { useEffect, useState } from 'react';
import { Clock, Play, X, User, Zap, Calendar, Wrench } from 'lucide-react';
import { addMinutes, differenceInSeconds, differenceInMinutes, format, isToday, isTomorrow } from 'date-fns';
import { Table, HOURLY_RATE } from '../context/AppContext';
import clsx from 'clsx';

interface TableCardProps {
  table: Table;
  onAssign: () => void;
  onEnd?: () => void;
  onExtend?: () => void;
  onMaintenance?: () => void;
  onClearMaintenance?: () => void;
  nextReservation?: { date: Date; customerName: string; timeSlot: string } | null;
}

const formatPHP = (amount: number) => `₱${amount.toFixed(2)}`;

export function TableCard({ table, onAssign, onEnd, onExtend, onMaintenance, onClearMaintenance, nextReservation }: TableCardProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getTimerInfo = () => {
    if (!table.session) return null;
    const { startTime, durationMinutes } = table.session;
    const endTime = addMinutes(new Date(startTime), durationMinutes);
    const totalSecsLeft = differenceInSeconds(endTime, now);
    const isOvertime = totalSecsLeft < 0;
    const absSecs = Math.abs(totalSecsLeft);
    const mins = Math.floor(absSecs / 60);
    const secs = absSecs % 60;
    const isAlert = !isOvertime && totalSecsLeft <= 900;

    const overMins = isOvertime ? Math.ceil(absSecs / 60) : 0;
    const overtimeCharge = (overMins / 60) * HOURLY_RATE;

    return {
      formatted: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
      isAlert, isOvertime, overtimeCharge,
      elapsed: Math.floor(differenceInSeconds(now, new Date(startTime)) / 60),
      endTime,
    };
  };

  const timer = getTimerInfo();

  // Format next reservation display
  const getNextReservationLabel = () => {
    if (!nextReservation) return null;
    const resDate = new Date(nextReservation.date);
    const minsUntil = differenceInMinutes(resDate, now);
    if (minsUntil <= 0) return { label: 'Now', color: 'text-rose-400', urgent: true };
    if (minsUntil <= 30) return { label: `in ${minsUntil}m`, color: 'text-rose-400', urgent: true };
    if (minsUntil <= 60) return { label: `in ${minsUntil}m`, color: 'text-amber-400', urgent: false };
    if (isToday(resDate)) return { label: `Today ${nextReservation.timeSlot}`, color: 'text-amber-400', urgent: false };
    if (isTomorrow(resDate)) return { label: `Tomorrow ${nextReservation.timeSlot}`, color: 'text-neutral-400', urgent: false };
    return { label: format(resDate, 'MMM d, h:mm a'), color: 'text-neutral-400', urgent: false };
  };

  const nextResLabel = getNextReservationLabel();

  const getBorderColor = () => {
    if (table.status === 'maintenance') return 'border-orange-700/60';
    if (timer?.isOvertime) return 'border-rose-500/60';
    if (timer?.isAlert) return 'border-amber-500/60';
    if (table.status === 'occupied') return 'border-rose-800/40';
    if (table.status === 'reserved') return nextResLabel?.urgent ? 'border-rose-700/50' : 'border-amber-800/40';
    return 'border-neutral-800';
  };

  return (
    <div className={clsx(
      'relative rounded-xl border p-4 flex flex-col gap-3 h-52 transition-all shadow-md',
      'bg-neutral-950',
      getBorderColor(),
      timer?.isOvertime && 'shadow-rose-900/20',
      timer?.isAlert && 'shadow-amber-900/20',
    )}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-bold text-neutral-200">{table.name}</h3>
          {table.session && (
            <div className="flex items-center gap-1.5 text-neutral-500 mt-0.5">
              <User size={11} />
              <span className="text-xs truncate max-w-[120px]">{table.session.customerName}</span>
            </div>
          )}
          {table.status === 'reserved' && nextReservation && (
            <div className="flex items-center gap-1 mt-0.5">
              <User size={11} className="text-amber-500/70" />
              <span className="text-xs text-amber-500/80 truncate max-w-[110px]">{nextReservation.customerName}</span>
            </div>
          )}
        </div>
        <span className={clsx(
          'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1',
          table.status === 'available' && 'bg-emerald-500/15 text-emerald-400',
          table.status === 'occupied' && !timer?.isOvertime && !timer?.isAlert && 'bg-rose-500/15 text-rose-400',
          timer?.isAlert && !timer?.isOvertime && 'bg-amber-500/15 text-amber-400',
          timer?.isOvertime && 'bg-rose-500/20 text-rose-300',
          table.status === 'reserved' && 'bg-amber-500/15 text-amber-400',
          table.status === 'maintenance' && 'bg-orange-500/15 text-orange-400',
        )}>
          {table.status === 'maintenance' && <Wrench size={9} />}
          {timer?.isOvertime ? 'Overtime' : timer?.isAlert ? 'Ending Soon' : table.status}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-end gap-2">
        {table.status === 'maintenance' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-orange-950/20 rounded-lg border border-orange-800/30 p-3">
            <Wrench size={20} className="text-orange-400" />
            <p className="text-xs text-orange-300 font-semibold text-center">Under Maintenance</p>
            {table.maintenanceReason && (
              <p className="text-[10px] text-orange-500/80 text-center leading-snug">{table.maintenanceReason}</p>
            )}
            <button
              onClick={onClearMaintenance}
              className="mt-1 text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              Clear Maintenance
            </button>
          </div>
        ) : table.status === 'occupied' && table.session && timer ? (
          <>
            {/* Timer */}
            <div className="text-center py-1">
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider mb-0.5">
                {timer.isOvertime ? '⚠ Overtime' : timer.isAlert ? '⚡ Time Left' : 'Time Left'}
              </p>
              <p className={clsx(
                'font-mono text-2xl font-black tabular-nums tracking-tight',
                timer.isOvertime ? 'text-rose-400' : timer.isAlert ? 'text-amber-400' : 'text-emerald-400'
              )}>
                {timer.isOvertime && '+'}
                {timer.formatted}
              </p>
              {timer.isOvertime ? (
                <p className="text-[10px] text-rose-500 mt-0.5">+{formatPHP(timer.overtimeCharge)} overtime</p>
              ) : (
                <p className="text-[10px] text-neutral-600 mt-0.5">
                  ends {format(timer.endTime, 'h:mm a')}
                </p>
              )}
            </div>
            {/* Payment info */}
            <div className="flex justify-between text-[10px] text-neutral-600 border-t border-neutral-800/60 pt-2">
              <span>Paid: <span className="text-neutral-400">{formatPHP(table.session.amountPaid)}</span></span>
              <span>Rate: <span className="text-neutral-400">₱{HOURLY_RATE}/hr</span></span>
            </div>
            {/* Actions */}
            <div className="flex gap-1.5">
              <button
                onClick={onExtend}
                className="flex-1 flex items-center justify-center gap-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs py-1.5 rounded-lg transition-colors border border-neutral-700"
              >
                <Zap size={11} /> Extend
              </button>
              <button
                onClick={onEnd}
                className="flex-1 flex items-center justify-center gap-1 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 text-xs py-1.5 rounded-lg transition-colors border border-rose-900/40"
              >
                <X size={11} /> End
              </button>
              {onMaintenance && (
                <button
                  onClick={onMaintenance}
                  title="Mark as maintenance"
                  className="flex items-center justify-center px-2 bg-neutral-900 hover:bg-orange-950/30 border border-neutral-800 hover:border-orange-800/50 text-neutral-600 hover:text-orange-400 rounded-lg transition-colors"
                >
                  <Wrench size={11} />
                </button>
              )}
            </div>
          </>
        ) : table.status === 'available' ? (
          <div className="flex-1 flex flex-col gap-1.5">
            <button
              onClick={onAssign}
              className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-lg hover:border-emerald-600/50 hover:bg-emerald-950/10 transition-all group cursor-pointer"
            >
              <Play size={22} className="text-neutral-600 group-hover:text-emerald-500 transition-colors mb-1" />
              <span className="text-xs text-neutral-600 group-hover:text-emerald-500 font-medium transition-colors">Start Session</span>
            </button>
            {onMaintenance && (
              <button
                onClick={onMaintenance}
                className="w-full flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-orange-950/30 border border-neutral-800 hover:border-orange-800/50 text-neutral-600 hover:text-orange-400 text-[10px] py-1.5 rounded-lg transition-colors"
              >
                <Wrench size={10} /> Mark Maintenance
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
            <Clock size={18} className="text-amber-500/60" />
            <p className="text-xs text-amber-500/80 font-medium">Reserved</p>
            {/* Next reservation time */}
            {nextResLabel ? (
              <div className={clsx(
                'flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg',
                nextResLabel.urgent ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-amber-500/10 border border-amber-500/20'
              )}>
                <Calendar size={9} className={nextResLabel.color} />
                <span className={nextResLabel.color}>{nextResLabel.label}</span>
              </div>
            ) : (
              <p className="text-[10px] text-neutral-600">No reservation found</p>
            )}
            <button
              onClick={onAssign}
              className="text-[10px] text-neutral-500 hover:text-emerald-400 border border-neutral-800 hover:border-emerald-700 px-3 py-1 rounded-lg transition-colors mt-0.5"
            >
              Check In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}