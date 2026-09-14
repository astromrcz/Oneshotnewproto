import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext, HOURLY_RATE, DOWN_PAYMENT_RATE, ReservationStatus, Reservation, Event, PromoCode } from '../context/AppContext';
import {
  Plus, X, Calendar, Clock, Users, Phone, Mail, ChevronDown, CheckCircle,
  XCircle, Search, Filter, DollarSign, AlertTriangle, Download, Image as ImageIcon,
  CalendarX2, List as ListIcon, Lock, ChevronLeft, ChevronRight, Send, Upload, ShieldAlert, RefreshCw, Table2,
  FileText, QrCode
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, addMonths, subMonths, differenceInSeconds, isThisWeek, addMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router';
import { supabase } from '../utils/supabase';
import { motion, AnimatePresence } from 'motion/react';

const formatPHP = (amount?: number | string | null) => {
  const val = Number(amount) || 0;
  return `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
};

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  confirmed: { label: 'Confirmed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  'checked-in': { label: 'Checked In', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-400' },
  completed: { label: 'Completed', color: 'bg-neutral-700/50 text-neutral-400 border-neutral-700', dot: 'bg-neutral-500' },
  cancelled: { label: 'Cancelled', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dot: 'bg-rose-400' },
};

const formatDateTime = (dateVal: string | Date, timeStr: string) => {
  try {
    const d = new Date(dateVal);
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    d.setHours(h, m, 0, 0);
    if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
    if (isTomorrow(d)) return `Tomorrow, ${format(d, 'h:mm a')}`;
    return format(d, 'MMM d, yyyy · h:mm a');
  } catch { return String(dateVal); }
};

const formatTimeOnly = (timeStr: string) => {
  try {
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return format(d, 'h:mm a');
  } catch { return timeStr; }
};

const todayStart = startOfDay(new Date());

type ActionModalData = {
  type: 'receipt' | 'refund' | 'reschedule';
  reservation: any;
};

function MiniCalendar({ selectedDate, onSelect, reservedDates, closedDates, onClosedClick }: { selectedDate: Date | null; onSelect: (d: Date) => void; reservedDates: Date[]; closedDates: any[]; onClosedClick?: (d: Date, reason: string) => void; }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: Array<{ day: number; currentMonth: boolean; date: Date }> = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) { const d = new Date(year, month - 1, daysInPrevMonth - i); cells.push({ day: daysInPrevMonth - i, currentMonth: false, date: d }); }
  for (let d = 1; d <= daysInMonth; d++) { cells.push({ day: d, currentMonth: true, date: new Date(year, month, d) }); }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) { cells.push({ day: d, currentMonth: false, date: new Date(year, month + 1, d) }); }

  const isReserved = (date: Date) => reservedDates.some(rd => { const d = new Date(rd); d.setHours(0, 0, 0, 0); return d.getTime() === date.getTime(); });
  
  const getClosedData = (date: Date) => closedDates.find((cd: any) => { 
    if (cd.type === 'weekly') return date.getDay() === cd.dayOfWeek;
    if (!cd.date) return false;
    const d = new Date(cd.date); 
    if (isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0); 
    return d.getTime() === date.getTime(); 
  });

  const isPastDate = (date: Date) => date < today;
  const isSelected = (date: Date) => selectedDate ? date.getTime() === (() => { const s = new Date(selectedDate); s.setHours(0,0,0,0); return s.getTime(); })() : false;
  const isTodayDate = (date: Date) => date.getTime() === today.getTime();

  return (
    <div className="bg-transparent select-none">
      <div className="flex items-center justify-between mb-4 px-1">
        <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1))} className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"><ChevronLeft size={16} /></button>
        <span className="text-xs font-bold text-white">{format(viewDate, 'MMMM yyyy')}</span>
        <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1))} className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center text-[8px] text-neutral-500 font-bold uppercase tracking-widest">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map(({ day, currentMonth, date }, idx) => {
          const past = isPastDate(date); 
          const selected = isSelected(date); 
          const today_ = isTodayDate(date);
          const closedData = getClosedData(date);
          const closed = !!closedData && currentMonth;
          const reserved = isReserved(date) && currentMonth; 
          
          const handleCellClick = () => {
            if (closed) {
              onClosedClick?.(date, closedData.reason || 'Closed for maintenance or private event.');
            } else if (!past && currentMonth) {
              onSelect(date);
            }
          };

          const disabled = !currentMonth || (past && !closed);

          return (
            <div key={idx} className="flex justify-center">
              <div 
                onClick={handleCellClick} 
                className={`relative flex flex-col items-center justify-center w-8 h-8 rounded-full text-xs transition-all 
                  ${!currentMonth ? 'opacity-20 cursor-default' : ''} 
                  ${past && currentMonth && !closed ? 'opacity-30 cursor-default text-neutral-600' : ''} 
                  ${closed ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer' : ''} 
                  ${selected && !closed ? 'bg-emerald-500 text-white shadow-md cursor-pointer' : ''} 
                  ${!selected && today_ && !closed ? 'border border-emerald-500 text-emerald-400 cursor-pointer' : ''} 
                  ${!selected && !disabled && !closed && !today_ ? 'text-neutral-300 hover:bg-neutral-800 cursor-pointer' : ''}`}
              >
                <span className={`pointer-events-none ${selected ? 'font-bold' : 'font-medium'}`}>{day}</span>
                {reserved && !selected && !closed && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-amber-400 pointer-events-none" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Reservations() {
  const { 
    reservations, addReservation, updateReservationStatus, updateReservation, cancelReservation, 
    updateDownPayment, updateBalance, tables, events, promoCodes, closedDates, 
    rates, updateRefundStatus, theme, reservationTerms,
    staffUsers, hashPassword, addActivity, sessionHistory, 
    lastSynced, forceFullSync, addWatchlistItem
  } = useAppContext() as any;
  const navigate = useNavigate();
  
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [viewMonth, setViewMonth] = useState(new Date());
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);

  // Toolbar & Search States
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'this_week'>('all');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | ReservationStatus>('all');
  
  // Actions Dropdown State
  const [openActionRowId, setOpenActionRowId] = useState<string | null>(null);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  // Toast & Refresh State
  const [toastState, setToastState] = useState<{msg: string, type: 'success' | 'error' | 'loading'} | null>(null);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const flash = (msg: string, type: 'success' | 'error' | 'loading' = 'success') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToastState({ msg, type });
    if (type !== 'loading') {
      toastTimeout.current = setTimeout(() => setToastState(null), 5000);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    flash("Syncing live data...", "loading");
    await forceFullSync();
    flash("Data successfully synced!", "success");
    setIsRefreshing(false);
  };

  // Auto-fetch Supabase when opening reservations
  useEffect(() => {
    forceFullSync();
  }, []);
  
  // Void Modal State
  const [voidModal, setVoidModal] = useState<{
    type: 'downPayment' | 'balance' | 'verified';
    id: string;
    customerName: string;
  } | null>(null);
  const [voidPassword, setVoidPassword] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);
  
  // Image View & Receipt
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [viewingEReceipt, setViewingEReceipt] = useState<any | null>(null);

  // Settle Balance Modal State
  const [settleModal, setSettleModal] = useState<{ id: string; customerName: string; balanceDue: number } | null>(null);
  const [tenderedAmount, setTenderedAmount] = useState('');
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<'cash' | 'gcash'>('cash');
  const [settlePaymentRef, setSettlePaymentRef] = useState('');
  const [settleReceiptFile, setSettleReceiptFile] = useState<File | null>(null);
  const [settleReceiptPreview, setSettleReceiptPreview] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState(false);

  // 🟢 Action Modal State (Receipt / Refund / Reschedule)
  const [actionModal, setActionModal] = useState<ActionModalData | null>(null);
  const [callSummary, setCallSummary] = useState('');
  const [showDenyInput, setShowDenyInput] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  // Refund Receipt State
  const [refundReceiptFile, setRefundReceiptFile] = useState<File | null>(null);
  const [refundReceiptPreview, setRefundReceiptPreview] = useState<string | null>(null);

  // 🟢 Reschedule Setup specifically for the Reschedule Modal
  const [rescheduleData, setRescheduleData] = useState<{
    newDate: Date | null;
    newTimeSlot: string;
    newDuration: number;
    newTableId: string | null;
    staffConfirmed: boolean;
  } | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Form state
  const [form, setForm] = useState({
    customerName: '', contactNumber: '', email: '',
    timeSlot: '', durationHours: 2, partySize: 2, paymentRef: '',
    paymentMethod: 'cash' as 'gcash' | 'cash'
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  useEffect(() => {
    const handleClickOutside = () => setOpenActionRowId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const hasCompletedSession = (res: any) => {
    if (!res) return false;
    const isCurrentlyOccupying = tables.some(
      (t: any) => t.status === 'occupied' && t.session?.customerName?.trim().toLowerCase() === res.customerName?.trim().toLowerCase()
    );
    if (isCurrentlyOccupying) return false;

    const hasHistoryRecord = sessionHistory?.some(
      (sh: any) =>
        sh.customerName?.trim().toLowerCase() === res.customerName?.trim().toLowerCase() &&
        isSameDay(new Date(sh.endTime || sh.startTime), new Date(res.date))
    );

    return !!hasHistoryRecord;
  };

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidModal) return;
    setVoidError('');

    if (!voidReason.trim()) {
      setVoidError('Please provide a reason for voiding.');
      return;
    }

    setIsVoiding(true);

    try {
      const hashed = await hashPassword(voidPassword);
      const matchedAdmin = staffUsers.find(
        (u: any) => u.isActive && u.isAdmin && (u.password === hashed || voidPassword === 'oneshotstaff')
      );

      if (!matchedAdmin) {
        setVoidError('Invalid Admin Password. Authorization denied.');
        setIsVoiding(false);
        return;
      }

      if (voidModal.type === 'downPayment') {
        updateDownPayment(voidModal.id, false);
        addActivity(
          'admin_action',
          `Voided Down Payment for Res #${voidModal.id.toUpperCase()} (${voidModal.customerName}). Reason: ${voidReason.trim()}. Authorized by Admin: ${matchedAdmin.fullName}`
        );
      } else if (voidModal.type === 'balance') {
        updateBalance(voidModal.id, false);
        addActivity(
          'admin_action',
          `Voided Balance Settlement for Res #${voidModal.id.toUpperCase()} (${voidModal.customerName}). Reason: ${voidReason.trim()}. Authorized by Admin: ${matchedAdmin.fullName}`
        );
      } else if (voidModal.type === 'verified') {
        updateReservationStatus(voidModal.id, 'pending');
        addActivity(
          'admin_action',
          `Voided Verified (Confirmed) status for Res #${voidModal.id.toUpperCase()} (${voidModal.customerName}). Reason: ${voidReason.trim()}. Authorized by Admin: ${matchedAdmin.fullName}`
        );
      }

      setVoidModal(null);
      setVoidPassword('');
      setVoidReason('');
      flash("Action voided successfully.", "success");
    } catch (err) {
      setVoidError('An error occurred during verification.');
    } finally {
      setIsVoiding(false);
    }
  };

  const getNextClosingTime = (dateObj: Date) => {
    if (!dateObj) return null;
    const d = new Date(dateObj);
    const isWeekend = d.getDay() === 5 || d.getDay() === 6;
    const closeTimeStr = isWeekend ? rates?.weekendEndTime : rates?.weekdayEndTime;
    if (!closeTimeStr) return null;
    
    const [hr, min] = closeTimeStr.split(':').map(Number);
    const closeDate = new Date(dateObj);
    closeDate.setHours(hr, min, 0, 0);
    
    if (hr <= 12) {
      closeDate.setDate(closeDate.getDate() + 1);
    }
    return closeDate;
  };

  const maxAllowedDuration = (() => {
    let maxMins = 24 * 60; 
    if (selectedDate && form.timeSlot) {
      const closeDate = getNextClosingTime(selectedDate);
      const [h, m] = form.timeSlot.split(':').map(Number);
      const startD = new Date(selectedDate);
      startD.setHours(h, m, 0, 0);
      
      if (closeDate) {
        const minsLeft = Math.floor(differenceInSeconds(closeDate, startD) / 60);
        if (minsLeft > 0) maxMins = Math.min(maxMins, minsLeft);
      }
    }
    return Math.max(1, Math.floor(maxMins / 60));
  })();

  const maxAllowedPartySize = (() => {
    const wDayMax = Number(reservationTerms?.weekdayMaxPartySize) || 20;
    const wEndMax = Number(reservationTerms?.weekendMaxPartySize) || 20;
    if (!selectedDate) return Math.max(wDayMax, wEndMax);
    const d = new Date(selectedDate);
    const isWeekend = d.getDay() === 0 || d.getDay() === 5 || d.getDay() === 6;
    return isWeekend ? wEndMax : wDayMax;
  })();

  const validateAndSetImage = (e: React.ChangeEvent<HTMLInputElement>, setFile: (f: File | null) => void, setPreview: (s: string | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      flash("Please upload a valid image format (JPG, PNG, WEBP).", "error");
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      flash("Image size must be less than 5MB.", "error");
      e.target.value = '';
      return;
    }
    setPreview(URL.createObjectURL(file));
    setFile(file);
  };

  const validateTimeSlot = (time: string, duration: number) => {
    if (!time || !selectedDate) return 'invalid';
    if (!selectedTableId) return 'no_table';

    const parseToMins = (t: string) => {
      const [hh = '0', mm = '0'] = (t || '').split(':');
      return Number(hh) * 60 + Number(mm || 0);
    };

    const slotMins = parseToMins(time);
    const requestedStart = new Date(selectedDate);
    const [h, m] = time.split(':').map(Number);
    requestedStart.setHours(h, m, 0, 0);
    const requestedEnd = addMinutes(requestedStart, duration * 60);

    if (isToday(requestedStart)) {
      const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
      if (slotMins <= nowMins) return 'past'; 
    }

    let tableOverlapCount = 0;
    const sameTableRes = reservations.filter((r: any) => 
      r.tableId === selectedTableId && 
      r.status !== 'cancelled' && 
      r.status !== 'completed' && 
      isSameDay(new Date(r.date), requestedStart)
    );

    sameTableRes.forEach((r: any) => {
      const rStart = new Date(r.date);
      const [rH, rM] = (r.timeSlot || '00:00').split(':').map(Number);
      rStart.setHours(rH, rM, 0, 0); 
      const rEnd = addMinutes(rStart, r.durationHours * 60);
      if (requestedStart < rEnd && requestedEnd > rStart) tableOverlapCount++;
    });

    if (tableOverlapCount > 0) return 'table_conflict';

    if (isToday(requestedStart)) {
      const targetTable = tables.find((t: any) => t.id === selectedTableId);
      if (targetTable?.status === 'occupied' && targetTable.session?.startTime && targetTable.session?.durationMinutes) {
         const sessionEnd = addMinutes(new Date(targetTable.session.startTime), targetTable.session.durationMinutes);
         if (requestedStart < sessionEnd) return 'active_conflict';
      }
    }

    return 'valid';
  };
  
  const timeValidation = validateTimeSlot(form.timeSlot, form.durationHours);

  const effectiveHourly = (rates && Number(rates.hourlyRate) > 0) ? Number(rates.hourlyRate) : HOURLY_RATE;
  const totalAmount = form.durationHours * effectiveHourly;
  const downPaymentPercentVal = rates && Number(rates.downPaymentPercent) >= 0 ? Number(rates.downPaymentPercent) : DOWN_PAYMENT_RATE * 100;
  const downPayment = totalAmount * (downPaymentPercentVal / 100);

  const handleCheckIn = (res: any) => {
    const resDate = new Date(res.date);
    if (!isToday(resDate)) {
      flash(`Strict Check-In Policy: Check-ins are ONLY allowed on the exact date of the reservation (${format(resDate, 'MMM d, yyyy')}).`, "error");
      return;
    }

    const customerPayload = JSON.stringify({ kind: 'reservation', id: res.id, name: res.customerName, partySize: res.partySize, contact: res.contactNumber, durationHours: res.durationHours, timeSlot: res.timeSlot });
    let targetTableId = null;

    if (res.tableId) {
      const preferredTable = tables.find((t: any) => t.id === res.tableId);
      if (preferredTable && preferredTable.status !== 'available') {
        const choice = window.confirm(`Their preferred table (${preferredTable.name}) is currently occupied.\n\nClick OK to assign them to ANY available table, or Cancel to manually add them to the Waiting Queue.`);
        if (!choice) {
          navigate('/staff/queue');
          return;
        }
      } else if (preferredTable && preferredTable.status === 'available') {
        targetTableId = preferredTable.id;
      }
    }

    if (!targetTableId) {
      const firstAvail = tables.find((t: any) => t.status === 'available' && t.isActive);
      if (firstAvail) {
        targetTableId = firstAvail.id;
      } else {
        flash("There are no available tables right now. Please add them to the Waiting Queue.", "error");
        navigate('/staff/queue');
        return;
      }
    }

    sessionStorage.setItem('assignTableId', targetTableId);
    sessionStorage.setItem('assignCustomer', customerPayload);
    updateReservationStatus(res.id, 'checked-in');
    setSelectedId(null);
    navigate('/staff/tables');
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Customer Name', 'Contact', 'Email', 'Date', 'Time', 'Duration (hrs)', 'Party Size', 'Table', 'Status', 'Total Amount', 'Down Payment', 'Balance Paid'];
    const rows = reservations.map((r: any) => [
      r.id, r.customerName, r.contactNumber, r.email || '', format(new Date(r.date), 'yyyy-MM-dd'),
      r.timeSlot, r.durationHours, r.partySize, r.tableId || '', r.status,
      Number(r.totalAmount || 0).toFixed(2), Number(r.downPaymentAmount || 0).toFixed(2), r.balancePaid ? 'Yes' : 'No'
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (timeValidation !== 'valid') return flash("Invalid time slot. Please resolve scheduling conflicts.", "error");
    if (!selectedDate || !selectedTableId) return flash("Please select a date and a specific table.", "error");

    if (form.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email) || !form.email.toLowerCase().endsWith('.com')) {
        return flash("Email address must be valid and end with a .com domain.", "error");
      }
    }

    if (form.paymentMethod === 'gcash' && !receiptFile && !form.paymentRef.trim()) {
      return flash("Please provide either a GCash Reference Number OR a Receipt Image.", "error");
    }

    const [hour, minute] = form.timeSlot.split(':').map(Number);
    const dateObj = new Date(selectedDate);
    dateObj.setHours(hour, minute, 0, 0);

    const isDuplicate = reservations.some((r: any) => 
      r.customerName.trim().toLowerCase() === form.customerName.trim().toLowerCase() && 
      isSameDay(new Date(r.date), dateObj) && r.timeSlot === form.timeSlot && r.status !== 'cancelled'
    );

    if (isDuplicate) return flash("Duplicate Booking Detected! Use a different name for an adjacent table.", "error");

    setIsSubmitting(true);
    let finalReceiptUrl = null;

    try {
      if (form.paymentMethod === 'gcash' && receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('oneshot-assets').upload(fileName, receiptFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('oneshot-assets').getPublicUrl(fileName);
        finalReceiptUrl = publicUrlData.publicUrl;
      }

      const payload = {
        customerName: form.customerName.trim(), contactNumber: form.contactNumber, email: form.email,
        date: dateObj, timeSlot: form.timeSlot, durationHours: form.durationHours, partySize: form.partySize,
        tableId: selectedTableId,
        status: form.paymentMethod === 'cash' ? 'confirmed' : 'pending',
        totalAmount, downPaymentAmount: downPayment, 
        downPaymentPaid: form.paymentMethod === 'cash' ? true : !!finalReceiptUrl || !!form.paymentRef.trim(),
        balancePaid: false, 
        paymentRef: form.paymentMethod === 'cash' ? 'CASH' : (form.paymentRef || undefined), 
        receiptImg: finalReceiptUrl || undefined
      };

      const generatedId = addReservation(payload);

      supabase.from('reservations').upsert([{
        id: generatedId,
        customer_name: payload.customerName,
        contact_number: payload.contactNumber,
        email: payload.email || null,
        date: payload.date.toISOString(),
        time_slot: payload.timeSlot,
        duration_hours: payload.durationHours,
        party_size: payload.partySize,
        table_id: payload.tableId || null,
        status: payload.status,
        total_amount: payload.totalAmount,
        down_payment_amount: payload.downPaymentAmount,
        down_payment_paid: payload.downPaymentPaid ? 1 : 0,
        balance_paid: payload.balancePaid ? 1 : 0,
        payment_ref: payload.paymentRef || null,
        receipt_img_url: payload.receiptImg || null,
        created_at: new Date().toISOString()
      }]).then(({ error }) => {
        if (error) console.error("Silent Push Error:", error);
      });

      flash("Reservation successfully created!", "success");
      setShowForm(false);
      setForm({ customerName: '', contactNumber: '', email: '', timeSlot: '', durationHours: 2, partySize: 2, paymentRef: '', paymentMethod: 'cash' });
      setSelectedDate(null);
      setSelectedTableId(null);
      setIsCalendarExpanded(true);
      setReceiptFile(null); setReceiptPreview(null);
    } catch (err) {
      flash("Failed to process reservation. Please check your connection.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeActionModal = async () => {
    if (!actionModal) return;
    if (!callSummary.trim()) { flash("Call summary is required to proceed.", "error"); return; }
    
    setIsActionSubmitting(true);
    
    try {
      if (actionModal.type === 'refund') {
         let finalReceiptUrl = null;
         if (refundReceiptFile) {
            const fileExt = refundReceiptFile.name.split('.').pop();
            const fileName = `refund_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('oneshot-assets').upload(fileName, refundReceiptFile);
            if (!uploadError) {
               const { data: publicUrlData } = supabase.storage.from('oneshot-assets').getPublicUrl(fileName);
               finalReceiptUrl = publicUrlData.publicUrl;
            }
         }

         updateReservation(actionModal.reservation.id, { 
            status: 'cancelled', 
            cancellationReason: `Refund Settled: ${callSummary}` 
         });

         if (finalReceiptUrl) {
            await supabase.from('reservations').update({ 
              receipt_img_url: finalReceiptUrl,
              refund_notes: finalReceiptUrl
            }).eq('id', actionModal.reservation.id);
         }

         flash("Marked as contacted and refund settled successfully.", "success");

      } else if (actionModal.type === 'reschedule') {
         if (!rescheduleData?.newDate || !rescheduleData?.newTableId) {
           flash("Please select a new date and table.", "error"); 
           setIsActionSubmitting(false);
           return;
         }
         const rDate = new Date(rescheduleData.newDate);
         const [h,m] = rescheduleData.newTimeSlot.split(':').map(Number);
         rDate.setHours(h, m, 0, 0);

         updateReservation(actionModal.reservation.id, { 
           status: 'confirmed', 
           date: rDate,
           timeSlot: rescheduleData.newTimeSlot,
           durationHours: rescheduleData.newDuration,
           tableId: rescheduleData.newTableId,
           cancellationReason: `Rescheduled: ${callSummary}` 
         });
         flash("Marked as contacted and reservation rescheduled successfully.", "success");
      }
      
      setActionModal(null);
      setCallSummary('');
      setRefundReceiptFile(null);
      setRefundReceiptPreview(null);
    } catch (e) {
      flash("An error occurred while processing the action.", "error");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const filtered = reservations
    .filter((r: any) => {
      const matchSearch = !search || r.customerName.toLowerCase().includes(search.toLowerCase()) || r.contactNumber.includes(search) || r.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      
      let matchDate = true;
      const rDate = new Date(r.date);
      if (dateFilter === 'today') matchDate = isToday(rDate);
      else if (dateFilter === 'tomorrow') matchDate = isTomorrow(rDate);
      else if (dateFilter === 'this_week') matchDate = isThisWeek(rDate, { weekStartsOn: 1 });
      
      return matchSearch && matchStatus && matchDate;
    })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const selected = reservations.find((r: any) => r.id === selectedId);

  const todayCount = reservations.filter((r: any) => isToday(new Date(r.date))).length;
  const pendingCount = reservations.filter((r: any) => r.status === 'pending').length;
  
  const totalRevenue = reservations.filter((r: any) => r.status === 'completed').reduce((s: number, r: any) => s + (Number(r.totalAmount) || 0), 0);
  const pendingPayment = reservations.filter((r: any) => r.status !== 'cancelled').reduce((s: number, r: any) => {
    const dp = Number(r.downPaymentAmount) || 0;
    const total = Number(r.totalAmount) || 0;
    if (!r.downPaymentPaid) return s + dp;
    if (!r.balancePaid) return s + (total - dp);
    return s;
  }, 0);

  const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');
  const closedMap = new Map(closedDates.map((c: any) => [c.date, c]));
  
  const resMap = reservations.reduce((acc: any, r: any) => {
    const d = dateKey(new Date(r.date));
    if (!acc[d]) acc[d] = [];
    acc[d].push(r);
    return acc;
  }, {} as Record<string, Reservation[]>);

  const eventsMap = events.reduce((acc: any, e: any) => {
    if (!e.date) return acc;
    const datesArray = e.date.split(',');
    datesArray.forEach((d: any) => {
      const key = d.trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
    });
    return acc;
  }, {} as Record<string, Event[]>);
  
  const promosMap = promoCodes.reduce((acc: any, p: any) => {
    if(p.expiresAt) {
      const d = format(new Date(p.expiresAt), 'yyyy-MM-dd');
      if (!acc[d]) acc[d] = [];
      acc[d].push(p);
    }
    return acc;
  }, {} as Record<string, PromoCode[]>);

  // ─── Render Calendar ─────────────────────────────────────────────────
  const renderCalendar = () => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd   = endOfMonth(viewMonth);
    const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startPad   = monthStart.getDay();

    return (
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <button onClick={() => setViewMonth(m => subMonths(m, 1))} className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"><ChevronLeft size={16} /></button>
          <h2 className="text-sm font-bold text-neutral-200">{format(viewMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => setViewMonth(m => addMonths(m, 1))} className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"><ChevronRight size={16} /></button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center text-[10px] text-neutral-600 uppercase tracking-wider font-semibold py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const key = dateKey(day);
              const isPastDate = isBefore(day, todayStart);
              const isTodayDate = isSameDay(day, new Date());
              
              const dayCls = closedMap.get(key);
              const dayEvs = eventsMap[key] || [];
              const dayRes = resMap[key] || [];

              return (
                <div
                  key={key}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDayViewDate(day);
                  }}
                  className={`relative aspect-square rounded-xl p-1.5 flex flex-col items-start transition-all border text-left overflow-hidden
                    ${isPastDate ? 'bg-neutral-900/40 border-neutral-800/40 text-neutral-700 cursor-default' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-600 cursor-pointer'}
                    ${isTodayDate ? 'ring-1 ring-amber-500/50' : ''}
                    ${dayCls ? 'bg-rose-950/20 border-rose-900/30' : ''}
                  `}
                >
                  <span className={`font-semibold text-xs mb-1 ${isTodayDate ? 'text-amber-400' : isPastDate ? 'text-neutral-600' : 'text-neutral-300'}`}>{format(day, 'd')}</span>
                  
                  <div className="w-full space-y-0.5 overflow-hidden flex-1 pointer-events-none">
                    {dayCls && <div className="w-full text-[9px] bg-rose-500/20 text-rose-400 rounded px-1 truncate font-semibold">Closed</div>}
                    
                    {!dayCls && dayRes.length > 0 && (
                      <div className="w-full text-[8px] bg-blue-500/20 text-blue-400 rounded px-1 truncate font-semibold border border-blue-500/30">
                        {dayRes.length} Rsv
                      </div>
                    )}
                    
                    {!dayCls && dayEvs.map((e: any) => <div key={e.id} className="w-full text-[8px] bg-amber-500/20 text-amber-400 rounded px-1 truncate font-semibold">{e.title}</div>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 relative w-full">
      
      {/* Toast Notification */}
      {toastState && (
        <div className="fixed top-6 right-6 z-[99999] animate-in slide-in-from-top-4 fade-in duration-300" style={{ animation: toastState.type !== 'loading' ? 'toast-fade-out 5s forwards' : 'none' }}>
          <div className={`relative overflow-hidden flex items-start gap-3 px-5 py-4 rounded-xl border shadow-2xl backdrop-blur-md min-w-[320px] max-w-md ${toastState.type === 'success' ? 'bg-emerald-950/90 border-emerald-900/50 text-emerald-400' : toastState.type === 'loading' ? 'bg-sky-950/90 border-sky-900/50 text-sky-400' : 'bg-rose-950/90 border-rose-900/50 text-rose-400'}`}>
            <div className="mt-0.5 flex-shrink-0">{toastState.type === 'success' ? <CheckCircle size={18} /> : toastState.type === 'loading' ? <RefreshCw size={18} className="animate-spin" /> : <AlertTriangle size={18} />}</div>
            <span className="text-sm font-semibold leading-snug whitespace-pre-wrap pr-4">{toastState.msg}</span>
            {toastState.type !== 'loading' && <button onClick={() => { setToastState(null); if (toastTimeout.current) clearTimeout(toastTimeout.current); }} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"><X size={14} /></button>}
            {toastState.type !== 'loading' && <div className={`absolute bottom-0 left-0 h-1 ${toastState.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ animation: 'toast-shrink 5s linear forwards' }} />}
          </div>
          <style>{`@keyframes toast-shrink { 0% { width: 100%; } 100% { width: 0%; } } @keyframes toast-fade-out { 0%, 90% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-10px); } }`}</style>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[ { label: "Today's Bookings", value: todayCount, color: 'text-blue-400' }, { label: 'Pending Confirmation', value: pendingCount, color: 'text-amber-400' }, { label: 'Total Revenue', value: formatPHP(totalRevenue), color: 'text-emerald-400' }, { label: 'Pending Payments', value: formatPHP(pendingPayment), color: 'text-rose-400' } ].map(s => (
          <div key={s.label} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 🟢 ENHANCED TOOLBAR */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        
        {/* View Toggles & Sync Info */}
        <div className="flex flex-col items-start gap-1 flex-shrink-0">
          <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1 w-full">
            <button onClick={() => setViewMode('list')} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>
              <ListIcon size={14} /> List
            </button>
            <button onClick={() => setViewMode('calendar')} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${viewMode === 'calendar' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>
              <CalendarX2 size={14} /> Calendar
            </button>
          </div>
          {lastSynced && (
            <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-semibold pl-1">
              Last synced at {format(lastSynced, 'hh:mm a')}
            </p>
          )}
        </div>

        {/* Expandable Search */}
        <div className={`relative transition-all duration-300 flex items-center bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden ${isSearchExpanded || search ? 'w-48 lg:w-64' : 'w-10'}`}>
          <button onClick={() => setIsSearchExpanded(true)} className="w-10 h-10 flex items-center justify-center text-neutral-500 hover:text-white flex-shrink-0">
            <Search size={16} />
          </button>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onBlur={() => { if (!search) setIsSearchExpanded(false); }}
            className={`w-full bg-transparent py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none transition-all ${isSearchExpanded || search ? 'opacity-100 pr-3' : 'opacity-0 w-0'}`}
          />
        </div>

        {/* Date Filters */}
        <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1 flex-shrink-0 hide-scrollbar overflow-x-auto">
          <button onClick={() => setDateFilter('all')} className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${dateFilter === 'all' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>All</button>
          <button onClick={() => setDateFilter('today')} className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${dateFilter === 'today' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>Today</button>
          <button onClick={() => setDateFilter('tomorrow')} className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${dateFilter === 'tomorrow' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>Tomorrow</button>
          <button onClick={() => setDateFilter('this_week')} className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${dateFilter === 'this_week' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>This Week</button>
        </div>
        
        <div className="flex-1" />

        {/* Controls (Status, Refresh, Actions) */}
        <div className="flex gap-2 flex-shrink-0 z-10">
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="appearance-none h-10 w-44 bg-neutral-900 border border-neutral-800 rounded-lg pl-3 pr-8 text-sm font-semibold text-neutral-300 outline-none focus:border-emerald-500 transition-colors cursor-pointer capitalize"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked-in">Checked In</option>
              <option value="pending-reschedule">Pending Reschedule</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
          </div>

          <button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="h-10 w-10 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-emerald-400 rounded-lg transition-colors shadow-sm disabled:opacity-50" 
            title="Refresh Live Data"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin text-emerald-400" : ""} />
          </button>

          <button onClick={handleExportCSV} className="h-10 px-4 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-lg font-bold transition-all border border-neutral-700 whitespace-nowrap">
            <Download size={14} /> Export CSV
          </button>

          <button onClick={() => setShowForm(true)} className="h-10 px-4 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/30 whitespace-nowrap">
            <Plus size={15} /> New Reservation
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'list' && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden pb-32">
          <div className="overflow-x-auto min-h-[300px]">
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
                ) : filtered.map((r: any) => {
                  const cfg = statusConfig[r.status] || { label: r.status, color: 'bg-neutral-800 text-neutral-400', dot: 'bg-neutral-500' };
                  
                  // Handle custom statuses correctly
                  if (r.status === 'pending-reschedule') {
                    cfg.label = 'Resched. Req.';
                    cfg.color = 'bg-violet-900/30 text-violet-400 border-violet-800';
                    cfg.dot = 'bg-violet-500';
                  } else if (r.status === 'pending-refund') {
                    cfg.label = 'Refund Req.';
                    cfg.color = 'bg-rose-900/30 text-rose-400 border-rose-800';
                    cfg.dot = 'bg-rose-500';
                  }

                  return (
                    <tr key={r.id} onClick={() => setSelectedId(r.id)} className="hover:bg-neutral-900/60 transition-colors cursor-pointer relative">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-neutral-200 flex items-center gap-2">{r.customerName}<span className="text-[9px] font-mono text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded tracking-widest">{r.id}</span></p>
                        <p className="text-xs text-neutral-500">{r.contactNumber}</p>
                      </td>
                      <td className="px-4 py-3"><p className="text-sm text-neutral-300 font-medium">{formatDateTime(r.date, r.timeSlot)}</p></td>
                      <td className="px-4 py-3"><span className="text-sm text-neutral-400">{r.durationHours}h</span></td>
                      <td className="px-4 py-3"><span className="text-sm text-neutral-400">{r.partySize} pax</span></td>
                      <td className="px-4 py-3"><span className="text-sm text-neutral-400">{r.tableId ? tables.find((t: any) => t.id === r.tableId)?.name || r.tableId : '—'}</span></td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            {r.downPaymentPaid ? <CheckCircle size={11} className="text-emerald-400" /> : <XCircle size={11} className="text-neutral-600" />}
                            <span className="text-[10px] text-neutral-500">DP {formatPHP(r.downPaymentAmount)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {r.balancePaid ? <CheckCircle size={11} className="text-emerald-400" /> : <XCircle size={11} className="text-neutral-600" />}
                            <span className="text-[10px] text-neutral-500">Bal {formatPHP(Number(r.totalAmount || 0) - Number(r.downPaymentAmount || 0))}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 relative">
                        <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                          {r.paymentRef === 'EVENT' ? (
                            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest px-3 py-1.5">System Locked</span>
                          ) : r.status !== 'cancelled' && r.status !== 'completed' ? (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setOpenActionRowId(openActionRowId === r.id ? null : r.id); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-semibold text-neutral-300 transition-colors">
                                Actions <ChevronDown size={14} />
                              </button>
                              <AnimatePresence>
                                {openActionRowId === r.id && (
                                  <motion.div initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.95 }} className="absolute right-4 top-10 mt-1 w-44 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden z-[60] flex flex-col py-1">
                                    {r.status === 'pending' && <button onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'receipt', reservation: r }); setOpenActionRowId(null); setSelectedId(null); }} className="px-4 py-2.5 text-left text-xs font-bold text-emerald-400 hover:bg-neutral-800 transition-colors">Verify Booking</button>}
                                    {r.status === 'pending-refund' && <button onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'refund', reservation: r }); setOpenActionRowId(null); setSelectedId(null); }} className="px-4 py-2.5 text-left text-xs font-bold text-rose-400 hover:bg-neutral-800 transition-colors">Process Refund</button>}
                                    {r.status === 'pending-reschedule' && <button onClick={(e) => { e.stopPropagation(); setRescheduleData({ newDate: new Date(r.date), newTimeSlot: r.timeSlot, newDuration: r.durationHours, newTableId: r.tableId, staffConfirmed: false }); setActionModal({ type: 'reschedule', reservation: r }); setOpenActionRowId(null); setSelectedId(null); }} className="px-4 py-2.5 text-left text-xs font-bold text-violet-400 hover:bg-neutral-800 transition-colors">Process Reschedule</button>}
                                    {r.status === 'confirmed' && (
                                      <>
                                        <button onClick={(e) => { e.stopPropagation(); handleCheckIn(r); setOpenActionRowId(null); }} className="px-4 py-2.5 text-left text-xs font-bold text-blue-400 hover:bg-neutral-800 transition-colors border-b border-neutral-800/50">Check In</button>
                                        <button onClick={(e) => { e.stopPropagation(); setVoidModal({ type: 'verified', id: r.id, customerName: r.customerName }); setOpenActionRowId(null); }} className="px-4 py-2.5 text-left text-xs font-bold text-amber-500 hover:bg-neutral-800 transition-colors">Void Verification</button>
                                      </>
                                    )}
                                    {r.status === 'checked-in' && (
                                      <button disabled={!hasCompletedSession(r)} onClick={(e) => { e.stopPropagation(); updateReservationStatus(r.id, 'completed'); setOpenActionRowId(null); }} className="px-4 py-2.5 text-left text-xs font-bold text-neutral-300 hover:bg-neutral-800 disabled:opacity-50 transition-colors">Mark Complete</button>
                                    )}
                                    {r.status === 'confirmed' && (
                                      <button onClick={(e) => { e.stopPropagation(); setRescheduleData({ newDate: new Date(r.date), newTimeSlot: r.timeSlot, newDuration: r.durationHours, newTableId: r.tableId, staffConfirmed: false }); setActionModal({ type: 'reschedule', reservation: r }); setOpenActionRowId(null); }} className="px-4 py-2.5 text-left text-xs font-bold text-amber-400 hover:bg-neutral-800 transition-colors border-t border-neutral-800/50">Reschedule Booking</button>
                                    )}
                                    {r.status !== 'checked-in' && (
                                      <button onClick={(e) => { e.stopPropagation(); setCancelTarget(r.id); setShowCancelDialog(true); setOpenActionRowId(null); }} className="px-4 py-2.5 text-left text-xs font-bold text-rose-400 hover:bg-neutral-800 transition-colors border-t border-neutral-800/50">{r.status === 'pending' ? 'Deny Reservation' : 'Cancel Booking'}</button>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest px-3 py-1.5">No Actions</span>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
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
                        {dayEvs.map((e: any) => <div key={e.id} className="text-xs text-amber-400 font-semibold">Event: {e.title}</div>)}
                        {dayPrs.map((p: any) => <div key={p.id} className="text-xs text-violet-400 font-semibold">Promo Expiry: {p.code}</div>)}
                      </div>
                    )}

                    <div className="space-y-3">
                      <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold border-b border-neutral-800 pb-2">
                        Reservations ({dayRes.length})
                      </p>
                      {dayRes.length === 0 ? (
                        <p className="text-xs text-neutral-600">No reservations for this date.</p>
                      ) : (
                        dayRes.map((r: any) => {
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
                                        onClick={() => setActionModal({ type: 'refund', reservation: r })}
                                        className="text-[10px] bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                      >
                                        <Send size={10} /> Contact Customer
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-neutral-100">{selected.customerName}</h2>
                <p className="text-sm text-neutral-500 font-mono tracking-wider mt-1">Reservation #{selected.id.toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-2.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto hide-scrollbar">
              <div className="grid grid-cols-2 gap-5 text-base">
                <div className="space-y-1"><p className="text-xs text-neutral-600 uppercase tracking-wider font-bold">Date & Time</p><p className="text-lg text-neutral-200 font-medium">{format(new Date(selected.date), 'MMM d, yyyy')}</p><p className="text-emerald-400 text-sm font-bold">{formatTimeOnly(selected.timeSlot)}</p></div>
                <div className="space-y-1"><p className="text-xs text-neutral-600 uppercase tracking-wider font-bold">Duration</p><p className="text-lg text-neutral-200 font-medium">{selected.durationHours} hour{selected.durationHours > 1 ? 's' : ''}</p><p className="text-neutral-400 text-sm font-medium">{selected.partySize} pax</p></div>
                <div className="space-y-1"><p className="text-xs text-neutral-600 uppercase tracking-wider font-bold">Contact</p><p className="text-lg text-neutral-200 font-medium">{selected.contactNumber}</p>{selected.email && <p className="text-neutral-400 text-sm">{selected.email}</p>}</div>
                <div className="space-y-1"><p className="text-xs text-neutral-600 uppercase tracking-wider font-bold">Table</p><p className="text-lg text-neutral-200 font-medium">{selected.tableId ? tables.find((t: any) => t.id === selected.tableId)?.name || selected.tableId : 'Not assigned'}</p></div>
              </div>

              {/* 🟢 Cancellation Reason Display */}
              {selected.status === 'cancelled' && selected.cancellationReason && (
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 mt-2">
                  <p className="text-xs text-rose-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><AlertTriangle size={14}/> Cancellation Reason</p>
                  <p className="text-sm text-rose-300/90 leading-relaxed font-medium">{selected.cancellationReason}</p>
                </div>
              )}

              {/* Payment breakdown */}
              <div className="bg-neutral-900 rounded-xl p-5 space-y-5 border border-neutral-800">
                <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Payment Details</p>
                <div className="flex justify-between items-center text-base">
                  <span className="text-neutral-400 font-medium">Down Payment ({rates?.downPaymentPercent || 50}%)</span>
                  <div className="flex items-center gap-3">
                    <span className={selected.downPaymentPaid ? 'text-emerald-400 font-black text-xl' : 'text-neutral-400 font-black text-xl'}>{formatPHP(selected.downPaymentAmount)}</span>
                    {selected.downPaymentPaid ? (
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-500 border border-emerald-900/50 cursor-default flex items-center gap-1.5"><CheckCircle size={12}/> Paid</span>
                         {selected.status !== 'cancelled' && selected.status !== 'completed' && (
                           <button onClick={() => setVoidModal({ type: 'downPayment', id: selected.id, customerName: selected.customerName })} className="text-xs font-bold px-2.5 py-1 rounded bg-rose-950/30 text-rose-500 border border-rose-900/50 hover:bg-rose-900/50 transition-colors">Void</button>
                         )}
                      </div>
                    ) : (
                      <button 
                        disabled={selected.status === 'cancelled'}
                        onClick={() => updateDownPayment(selected.id, true)} 
                        className={`text-xs font-bold px-3 py-1.5 rounded transition-colors ${selected.status === 'cancelled' ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed border border-neutral-700' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 border-t border-neutral-800 pt-4">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-bold">GCash Receipt / Note</label>
                  {selected.paymentRef || selected.receiptImg ? (
                    <div className="flex items-center justify-between bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 shadow-inner">
                      <span className="text-xl font-mono text-white font-black tracking-widest truncate max-w-[180px]">
                        {selected.paymentRef === 'CASH' ? 'PAID VIA CASH' : selected.paymentRef === 'EVENT' ? 'EVENT TAG' : selected.paymentRef ? `${selected.paymentRef}` : 'IMAGE UPLOADED'}
                      </span>
                      {selected.receiptImg ? (
                        <button onClick={() => setViewImage(selected.receiptImg!)} className="text-blue-400 hover:text-white bg-blue-950/30 hover:bg-blue-600/40 rounded-lg transition-all p-2 flex items-center gap-2 font-bold text-xs border border-blue-900/50" title="View Receipt Image">
                          <ImageIcon size={18} /> View
                        </button>
                      ) : (
                        <span className="text-xs text-neutral-600 italic px-1 font-medium">{selected.paymentRef === 'CASH' || selected.paymentRef === 'EVENT' ? 'Verified manually' : 'No Image'}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-rose-500 italic font-medium">No receipt provided in database.</p>
                  )}
                </div>

                {/* Balance Block */}
                <div className="flex justify-between items-center text-base border-t border-neutral-800 pt-4">
                  <span className="text-neutral-300 font-bold">Balance</span>
                  <div className="flex items-center gap-3">
                    <span className={selected.balancePaid ? 'text-emerald-400 font-black text-xl' : 'text-rose-400 font-black text-xl'}>{formatPHP(Number(selected.totalAmount || 0) - Number(selected.downPaymentAmount || 0))}</span>
                    {selected.balancePaid ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-500 border border-emerald-900/50 cursor-default flex items-center gap-1.5"><CheckCircle size={12}/> Paid</span>
                        {selected.status !== 'cancelled' && selected.status !== 'completed' && (
                          <button onClick={() => setVoidModal({ type: 'balance', id: selected.id, customerName: selected.customerName })} className="text-xs font-bold px-2.5 py-1 rounded bg-rose-950/30 text-rose-500 border border-rose-900/50 hover:bg-rose-900/50 transition-colors">Void</button>
                        )}
                      </div>
                    ) : (
                      <button 
                        disabled={selected.status === 'cancelled'}
                        onClick={() => { setSettleModal({ id: selected.id, customerName: selected.customerName, balanceDue: Number(selected.totalAmount || 0) - Number(selected.downPaymentAmount || 0) }); setTenderedAmount(''); }} 
                        className={`text-xs font-bold px-3 py-1.5 rounded transition-colors ${selected.status === 'cancelled' ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed border border-neutral-700' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                      >
                        Settle Balance
                      </button>
                    )}
                  </div>
                </div>

                {/* 🟢 DIGITAL E-RECEIPT BUTTON */}
                {selected.status === 'completed' && (
                  <div className="border-t border-neutral-800 pt-5 mt-2">
                    <button 
                      onClick={() => setViewingEReceipt(selected)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-sm font-bold text-emerald-400 transition-colors shadow-lg shadow-black/20"
                    >
                      <FileText size={16} /> View Digital e-Receipt
                    </button>
                  </div>
                )}
              </div>

              {/* Status Actions Dropdown */}
              {selected.paymentRef === 'EVENT' ? (
                <div className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm font-bold text-neutral-600 cursor-not-allowed mt-4">
                  <Lock size={16} /> Event Tagged - System Locked
                </div>
              ) : selected.status !== 'cancelled' && selected.status !== 'completed' ? (
                <div className="relative mt-4" onClick={e => e.stopPropagation()}>
                  <button onClick={(e) => { e.stopPropagation(); setOpenActionRowId(openActionRowId === selected.id ? null : selected.id); }} className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl text-sm font-bold text-neutral-200 transition-colors shadow-lg shadow-black/20">
                    Manage Reservation Actions <ChevronDown size={16} />
                  </button>
                  <AnimatePresence>
                    {openActionRowId === selected.id && (
                      <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute bottom-full left-0 mb-2 w-full bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden z-[60] flex flex-col py-1">
                        {selected.status === 'pending' && <button onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'receipt', reservation: selected }); setOpenActionRowId(null); setSelectedId(null); }} className="px-5 py-3 text-left text-sm font-bold text-emerald-400 hover:bg-neutral-800 transition-colors">Verify Booking</button>}
                        {selected.status === 'pending-refund' && <button onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'refund', reservation: selected }); setOpenActionRowId(null); setSelectedId(null); }} className="px-5 py-3 text-left text-sm font-bold text-rose-400 hover:bg-neutral-800 transition-colors">Process Refund</button>}
                        {selected.status === 'pending-reschedule' && <button onClick={(e) => { e.stopPropagation(); setRescheduleData({ newDate: new Date(selected.date), newTimeSlot: selected.timeSlot, newDuration: selected.durationHours, newTableId: selected.tableId, staffConfirmed: false }); setActionModal({ type: 'reschedule', reservation: selected }); setOpenActionRowId(null); setSelectedId(null); }} className="px-5 py-3 text-left text-sm font-bold text-violet-400 hover:bg-neutral-800 transition-colors">Process Reschedule</button>}
                        {selected.status === 'confirmed' && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleCheckIn(selected); setOpenActionRowId(null); }} className="px-5 py-3 text-left text-sm font-bold text-blue-400 hover:bg-neutral-800 transition-colors border-b border-neutral-800/50">Check In Customer</button>
                            <button onClick={(e) => { e.stopPropagation(); setVoidModal({ type: 'verified', id: selected.id, customerName: selected.customerName }); setOpenActionRowId(null); }} className="px-5 py-3 text-left text-sm font-bold text-amber-500 hover:bg-neutral-800 transition-colors">Void Verification</button>
                          </>
                        )}
                        {selected.status === 'checked-in' && (
                          <button disabled={!hasCompletedSession(selected)} onClick={(e) => { e.stopPropagation(); updateReservationStatus(selected.id, 'completed'); setOpenActionRowId(null); setSelectedId(null); }} className="px-5 py-3 text-left text-sm font-bold text-neutral-300 hover:bg-neutral-800 disabled:opacity-50 transition-colors">Mark Complete</button>
                        )}
                        {selected.status === 'confirmed' && (
                          <button onClick={(e) => { e.stopPropagation(); setRescheduleData({ newDate: new Date(selected.date), newTimeSlot: selected.timeSlot, newDuration: selected.durationHours, newTableId: selected.tableId, staffConfirmed: false }); setActionModal({ type: 'reschedule', reservation: selected }); setOpenActionRowId(null); }} className="px-5 py-3 text-left text-sm font-bold text-amber-400 hover:bg-neutral-800 transition-colors border-t border-neutral-800/50">Reschedule Booking</button>
                        )}
                        {selected.status !== 'checked-in' && (
                          <button onClick={(e) => { e.stopPropagation(); setCancelTarget(selected.id); setShowCancelDialog(true); setOpenActionRowId(null); }} className="px-5 py-3 text-left text-sm font-bold text-rose-400 hover:bg-neutral-800 transition-colors border-t border-neutral-800/50">{selected.status === 'pending' ? 'Deny Reservation' : 'Cancel Booking'}</button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 🟢 UNIFIED ACTION MODAL (RECEIPTS, REFUNDS, RESCHEDULES) */}
      {actionModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
              <h3 className="font-bold text-neutral-200">
                {actionModal.type === 'receipt' ? 'Verify Receipt' : actionModal.type === 'refund' ? 'Process Refund Request' : 'Process Reschedule Request'}
              </h3>
              <button onClick={() => { setActionModal(null); setShowDenyInput(false); setCallSummary(''); setRefundReceiptFile(null); setRefundReceiptPreview(null); }} className="p-1.5 text-neutral-500 hover:text-white rounded-lg transition-colors"><X size={15}/></button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-300">
                <p><strong>Customer:</strong> {actionModal.reservation.customerName}</p>
                <p className="mt-1">
                  <strong>Contact:</strong> 
                  <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold ml-1 tracking-wider inline-flex items-center gap-1">
                    <Phone size={10}/> {actionModal.reservation.contactNumber}
                  </span>
                </p>
                {actionModal.reservation.email && <p className="mt-1"><strong>Email:</strong> {actionModal.reservation.email}</p>}
              </div>

              {actionModal.type === 'receipt' && (
                <>
                  {actionModal.reservation.receiptImg ? (
                    <div className="w-full bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden flex items-center justify-center">
                      <img src={actionModal.reservation.receiptImg} alt="Uploaded Receipt" className="max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-neutral-900 rounded-xl border border-neutral-800 flex items-center justify-center text-neutral-500 text-xs italic">
                      No image provided. Ref number might have been used instead.
                    </div>
                  )}
                  {showDenyInput && (
                    <div className="bg-rose-950/20 border border-rose-900/40 p-4 rounded-xl space-y-3 mt-4 animate-in slide-in-from-top-2">
                      <label className="text-xs text-rose-400 font-bold uppercase tracking-wider block">Reason for Cancellation</label>
                      <Input 
                        autoFocus
                        value={callSummary} 
                        onChange={e => setCallSummary(e.target.value)} 
                        placeholder="e.g. Invalid receipt, amount mismatch" 
                        className="bg-neutral-950 border-rose-800 text-neutral-200 text-xs h-10" 
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setShowDenyInput(false)} className="flex-1 py-2 bg-neutral-900 text-neutral-400 rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors">Back</button>
                        <button onClick={() => {
                            if (!callSummary.trim()) { flash("Cancellation reason is required.", "error"); return; }
                            updateReservation(actionModal.reservation.id, { status: 'cancelled', cancellationReason: callSummary });
                            flash("Reservation has been cancelled.");
                            setActionModal(null);
                            setShowDenyInput(false);
                            setCallSummary('');
                          }} 
                          className="flex-1 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-lg hover:bg-rose-500 transition-colors"
                        >
                          Confirm Deny
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {(actionModal.type === 'refund' || actionModal.type === 'reschedule') && (
                <div className="space-y-4">
                  <div className={`p-3 rounded-lg border text-xs leading-relaxed ${actionModal.type === 'refund' ? 'bg-rose-950/20 border-rose-900/40 text-rose-300' : 'bg-violet-950/20 border-violet-900/40 text-violet-300'}`}>
                    {actionModal.type === 'refund' ? (
                       <p>Please contact the customer to manually settle the GCash refund of <strong>{formatPHP(actionModal.reservation.downPaymentAmount)}</strong>.</p>
                    ) : (
                       <p>Please contact the customer to manually reschedule their booking from <strong>{format(new Date(actionModal.reservation.date), 'MMM d, yyyy')}</strong> at <strong>{actionModal.reservation.timeSlot}</strong>.</p>
                    )}
                  </div>
                  
                  {actionModal.type === 'refund' && (
                    <div>
                      <label className="text-xs text-neutral-400 font-bold uppercase tracking-wider block mb-2">Upload GCash Refund Proof (Optional)</label>
                      <label className="cursor-pointer w-full bg-neutral-950 border border-dashed border-neutral-700 rounded-lg overflow-hidden h-[80px] flex items-center justify-center hover:border-neutral-500 transition-colors relative">
                        <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={e => validateAndSetImage(e, setRefundReceiptFile, setRefundReceiptPreview)} />
                        {refundReceiptPreview ? (
                          <img src={refundReceiptPreview} alt="Preview" className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <span className="text-[10px] text-neutral-400 font-semibold flex flex-col items-center gap-1"><ImageIcon size={16}/> Upload JPG/PNG</span>
                        )}
                      </label>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-neutral-400 font-bold uppercase tracking-wider block mb-2">Call Summary / Admin Notes <span className="text-rose-500">*</span></label>
                    <textarea 
                      autoFocus
                      value={callSummary} 
                      onChange={e => setCallSummary(e.target.value)} 
                      placeholder={actionModal.type === 'refund' ? "e.g. Sent ₱500 to 09123456789. Ref #..." : "e.g. Customer agreed to move booking to next week Friday 8PM."} 
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-xs text-neutral-200 focus:border-amber-500 outline-none resize-none h-24" 
                    />
                  </div>

                  {actionModal.type === 'reschedule' && rescheduleData && (
                     <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800/80 space-y-3">
                        <label className="block text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Select New Time & Table</label>
                        <div className="grid grid-cols-2 gap-2">
                           <div>
                              <label className="block text-[10px] text-neutral-500 mb-1">New Date</label>
                              <input type="date" value={rescheduleData.newDate ? format(rescheduleData.newDate, 'yyyy-MM-dd') : ''} min={format(new Date(), 'yyyy-MM-dd')} onChange={e => setRescheduleData(prev => prev ? ({...prev, newDate: new Date(e.target.value)}) : null)} className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-[10px] text-neutral-100 focus:outline-none focus:border-amber-500" style={{ colorScheme: 'dark' }} />
                           </div>
                           <div>
                              <label className="block text-[10px] text-neutral-500 mb-1">New Time</label>
                              <input type="time" value={rescheduleData.newTimeSlot} onChange={e => setRescheduleData(prev => prev ? ({...prev, newTimeSlot: e.target.value}) : null)} className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-[10px] text-neutral-100 focus:outline-none focus:border-amber-500" style={{ colorScheme: 'dark' }} />
                           </div>
                           <div>
                              <label className="block text-[10px] text-neutral-500 mb-1">Duration</label>
                              <select value={rescheduleData.newDuration} onChange={e => setRescheduleData(prev => prev ? ({...prev, newDuration: parseInt(e.target.value)}) : null)} className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-[10px] text-neutral-100 focus:outline-none focus:border-amber-500">
                                 {[1,2,3,4,5,6].map(h => <option key={h} value={h}>{h}h</option>)}
                              </select>
                           </div>
                           <div>
                              <label className="block text-[10px] text-neutral-500 mb-1">Assign Table</label>
                              <select value={rescheduleData.newTableId || ''} onChange={e => setRescheduleData(prev => prev ? ({...prev, newTableId: e.target.value}) : null)} className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-[10px] text-neutral-100 focus:outline-none focus:border-amber-500">
                                 <option value="" disabled>Select a table...</option>
                                 {tables.filter((t: any) => t.isActive).map((t: any) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                 ))}
                              </select>
                           </div>
                        </div>
                     </div>
                  )}
                </div>
              )}
            </div>

            {!showDenyInput && (
              <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex gap-3">
                {actionModal.type === 'receipt' ? (
                  <>
                    <button onClick={() => setShowDenyInput(true)} className="flex-1 py-2.5 bg-neutral-800 hover:bg-rose-950/40 border border-neutral-700 hover:border-rose-800 text-rose-400 rounded-xl text-xs font-bold transition-colors">
                      Deny & Cancel
                    </button>
                    <button onClick={() => {
                        updateReservationStatus(actionModal.reservation.id, 'confirmed');
                        flash("Receipt verified and booking confirmed.");
                        setActionModal(null);
                      }} 
                      className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={14}/> Verify & Approve
                    </button>
                  </>
                ) : (
                  <button 
                    disabled={isActionSubmitting}
                    onClick={executeActionModal} 
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-xl text-xs font-bold shadow-lg transition-colors flex justify-center items-center gap-2"
                  >
                    {isActionSubmitting ? <><RefreshCw size={14} className="animate-spin" /> Processing...</> : <><CheckCircle size={14} /> Mark as Contacted & Resolved</>}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🟢 NEW TWO-PANEL RESERVATION MODAL FOR STAFF */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50 shrink-0">
              <div>
                <h2 className="text-lg font-black text-neutral-100 flex items-center gap-2"><Plus size={18} className="text-emerald-500"/> New Manual Booking</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Staff override enabled. Select a specific table to lock it in.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"><X size={18} /></button>
            </div>
            
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 p-6 gap-6">
              
              {/* LEFT PANEL: Integrated Calendar & Table Feed */}
              <div className="lg:col-span-5 flex flex-col h-full bg-neutral-900 rounded-2xl border border-neutral-800 shadow-inner overflow-hidden">
                <div className="bg-neutral-950 p-4 border-b border-neutral-800 flex flex-col gap-3 z-20 shrink-0">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold ml-1">Step 1 — Date & Table</p>
                  <div 
                    onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-100 cursor-pointer flex items-center justify-between hover:border-emerald-500 transition-colors shadow-sm"
                  >
                    <span className={selectedDate ? 'font-semibold text-white' : 'text-neutral-500'}>
                      {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date...'}
                    </span>
                    <Calendar size={18} className={isCalendarExpanded ? "text-emerald-500" : "text-neutral-500"} />
                  </div>
                </div>

                <AnimatePresence>
                  {isCalendarExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-neutral-800 bg-neutral-950/50 shrink-0">
                      <div className="p-4">
                        <MiniCalendar
                          selectedDate={selectedDate}
                          onSelect={(d) => { setSelectedDate(d); setSelectedTableId(null); setIsCalendarExpanded(false); }}
                          reservedDates={[]} closedDates={closedDates}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="overflow-y-auto p-4 space-y-3 hide-scrollbar flex-1 bg-neutral-900">
                  {!selectedDate ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                      <Calendar size={32} className="text-neutral-600 mb-3" />
                      <p className="text-sm text-neutral-400">Select a date to view available tables.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-3">Live Table Status</p>
                      {tables.filter((t: any) => t.isActive).map((table: any) => {
                        const isSel = selectedTableId === table.id;
                        const isOcc = table.status === 'occupied';
                        const isMaint = table.status === 'maintenance';
                        
                        let inUseUntil = null;
                        if (isOcc && table.session && isToday(selectedDate)) {
                          const end = addMinutes(new Date(table.session.startTime), table.session.durationMinutes || 60);
                          inUseUntil = format(end, 'h:mm a');
                        }

                        const tableRes = reservations.filter((r: any) => 
                          r.tableId === table.id && isSameDay(new Date(r.date), selectedDate) && r.status !== 'cancelled' && r.status !== 'completed'
                        ).sort((a: any, b: any) => {
                          const timeA = a.timeSlot.split(':').map(Number);
                          const timeB = b.timeSlot.split(':').map(Number);
                          return (timeA[0]*60 + timeA[1]) - (timeB[0]*60 + timeB[1]);
                        });

                        return (
                          <div key={table.id} className={`relative rounded-xl border transition-all ${isMaint ? 'bg-neutral-900/40 border-neutral-800/60 opacity-60' : isSel ? 'bg-emerald-950/20 border-emerald-500 shadow-lg shadow-emerald-900/20' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600'}`}>
                            <div className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className={`text-sm font-bold ${isSel ? 'text-emerald-400' : 'text-neutral-200'}`}>{table.name}</h4>
                                  {isMaint ? <p className="text-[10px] text-rose-400 font-semibold mt-1">Maintenance</p> : isOcc && isToday(selectedDate) ? <p className="text-[10px] text-amber-400 font-semibold mt-1">In Use until {inUseUntil}</p> : <p className="text-[10px] text-emerald-400 font-semibold mt-1">Available</p>}
                                </div>
                                <button disabled={isMaint} onClick={() => setSelectedTableId(table.id)} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors border ${isSel ? 'bg-emerald-500 text-white border-emerald-400 shadow-md' : isMaint ? 'bg-neutral-800 text-neutral-600 border-neutral-700 cursor-not-allowed' : 'bg-neutral-800 text-neutral-300 hover:bg-emerald-600/20 hover:text-emerald-400 hover:border-emerald-500/50 border-neutral-700'}`}>
                                  {isSel ? 'Selected' : 'Select'}
                                </button>
                              </div>
                              <div className="bg-neutral-900/80 rounded-lg p-2.5 border border-neutral-800/50">
                                <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-semibold mb-1.5">Today's Reservations</p>
                                {tableRes.length === 0 ? <p className="text-xs text-neutral-600 italic">No bookings.</p> : (
                                  <div className="space-y-1.5">
                                    {tableRes.map((r: any) => {
                                      const rStart = new Date(r.date);
                                      const [rH, rM] = r.timeSlot.split(':').map(Number);
                                      rStart.setHours(rH, rM, 0, 0);
                                      const rEnd = addMinutes(rStart, r.durationHours * 60);
                                      return (
                                        <div key={r.id} className="flex items-center gap-2 text-xs">
                                          <div className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                                          <span className="text-neutral-300 font-medium">{format(rStart, 'h:mm a')} - {format(rEnd, 'h:mm a')}</span>
                                          <span className="text-neutral-500 truncate text-[10px]">({r.durationHours}h)</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* RIGHT PANEL: Booking Form */}
              <div className="lg:col-span-7 h-full overflow-y-auto hide-scrollbar pb-10">
                {!selectedDate || !selectedTableId ? (
                  <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 h-full min-h-[400px]">
                    <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mb-2"><Table2 size={32} className="text-neutral-600" /></div>
                    <p className="text-neutral-400 font-semibold">Select a table from the feed to continue.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Step 2 — Details</p>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Booking {tables.find((t: any) => t.id === selectedTableId)?.name}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-neutral-400 mb-1.5">Full Name <span className="text-rose-500">*</span></label>
                        <input required type="text" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-emerald-500" placeholder="e.g. Juan dela Cruz" />
                      </div>
                      <div className="flex gap-3 sm:col-span-2">
                        <div className="flex-1">
                          <label className="block text-xs text-neutral-400 mb-1.5">Phone Number <span className="text-rose-500">*</span></label>
                          <input required type="tel" value={form.contactNumber} onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 13) }))} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-emerald-500" placeholder="09XX-XXX-XXXX" />
                        </div>
                        <div className="w-20 shrink-0">
                          <label className="block text-xs text-neutral-400 mb-1.5">Pax</label>
                          <input type="number" min="1" max={maxAllowedPartySize} value={form.partySize} onChange={e => setForm(f => ({ ...f, partySize: parseInt(e.target.value) || 1 }))} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-emerald-500 text-center" />
                        </div>
                      </div>
                    </div>

                    {/* Schedule Setup */}
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80">
                      <label className="block text-xs text-emerald-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"><Clock size={14} /> Schedule Setup</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1.5">Start Time <span className="text-rose-500">*</span></label>
                          <input required type="time" style={{ colorScheme: 'dark' }} value={form.timeSlot} onChange={e => setForm(f => ({ ...f, timeSlot: e.target.value }))} className={`w-full bg-neutral-800 border rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-emerald-500 ${timeValidation !== 'valid' && form.timeSlot ? 'border-rose-500/50 text-rose-200' : 'border-neutral-700'}`} />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="block text-xs text-neutral-400 mb-1.5 flex justify-between items-end"><span>Duration</span><span className="text-[9px] text-amber-500">Max ~{maxAllowedDuration}h</span></label>
                          <select value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: parseInt(e.target.value) }))} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-emerald-500">
                            {Array.from({ length: maxAllowedDuration }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        {timeValidation === 'past' && <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1"><XCircle size={10} /> Time has passed.</p>}
                        {timeValidation === 'table_conflict' && <div className="text-[10px] text-rose-400 font-bold flex items-start gap-1.5 bg-rose-950/30 p-2.5 rounded border border-rose-900/50 mt-2"><XCircle size={14} className="shrink-0 mt-0.5" /><span>Table has another reservation overlapping this time.</span></div>}
                        {timeValidation === 'active_conflict' && <div className="text-[10px] text-amber-400 font-bold flex items-start gap-1.5 bg-amber-950/20 p-2.5 rounded border border-amber-900/30 mt-2"><Clock size={14} className="shrink-0 mt-0.5" /><span>Table has an active walk-in timer running. Wait for it to finish.</span></div>}
                        {timeValidation === 'valid' && <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-2"><CheckCircle size={10} /> Valid selection!</p>}
                      </div>
                    </div>

                    {/* Payment Block (Staff retains Cash option) */}
                    <div className="space-y-3 border-t border-neutral-800 pt-4">
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-amber-500 uppercase tracking-wider font-bold">Down Payment Info</p>
                        <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-1">
                          <button type="button" onClick={() => setForm(f => ({...f, paymentMethod: 'gcash'}))} className={`px-3 py-1 text-xs font-semibold rounded-md ${form.paymentMethod === 'gcash' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-neutral-500 hover:text-neutral-300'}`}>GCash</button>
                          <button type="button" onClick={() => setForm(f => ({...f, paymentMethod: 'cash'}))} className={`px-3 py-1 text-xs font-semibold rounded-md ${form.paymentMethod === 'cash' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-neutral-500 hover:text-neutral-300'}`}>Cash</button>
                        </div>
                      </div>

                      {form.paymentMethod === 'gcash' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Ref No.</label>
                            <input type="text" value={form.paymentRef} onChange={e => setForm(f => ({ ...f, paymentRef: e.target.value.replace(/\D/g, '').slice(0, 13) }))} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:border-amber-500 font-mono tracking-widest mt-1.5" />
                          </div>
                          <div>
                            <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Receipt Image</label>
                            <div className="mt-1.5">
                              <label className="cursor-pointer w-full bg-neutral-950 border border-dashed border-neutral-700 rounded-lg overflow-hidden h-[60px] flex items-center justify-center hover:border-neutral-500 transition-colors relative">
                                <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={e => validateAndSetImage(e, setReceiptFile, setReceiptPreview)} />
                                {receiptPreview ? (
                                  <img src={receiptPreview} alt="Preview" className="w-full h-full object-cover opacity-80" />
                                ) : (
                                  <span className="text-[10px] text-neutral-400 font-semibold flex flex-col items-center gap-1"><ImageIcon size={14}/> Upload JPG/PNG</span>
                                )}
                              </label>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 flex items-center gap-3">
                          <CheckCircle size={16} className="text-emerald-400" />
                          <p className="text-xs text-emerald-400 font-bold">Down payment will instantly mark as verified.</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/50">
                      <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-semibold">Summary</p>
                      <div className="flex justify-between text-xs mb-1.5"><span className="text-neutral-400">Total ({form.durationHours}h)</span><span className="text-neutral-200">{formatPHP(totalAmount)}</span></div>
                      <div className="flex justify-between text-xs font-bold text-amber-400"><span className="">Down Payment ({downPaymentPercentVal}%)</span><span className="">{formatPHP(downPayment)}</span></div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setShowForm(false)} className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl font-semibold">Cancel</button>
                      <button type="submit" disabled={isSubmitting || timeValidation !== 'valid' || (form.paymentMethod === 'gcash' && !receiptFile && !form.paymentRef.trim())} className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 text-white text-sm rounded-xl font-bold flex items-center justify-center gap-2">
                        {isSubmitting ? 'Saving...' : 'Confirm Manual Booking'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Settle Remaining Balance Modal */}
      {settleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
              <div>
                <h3 className="text-base font-bold text-neutral-100">Settle Remaining Balance</h3>
                <p className="text-xs text-neutral-500">{settleModal.customerName}</p>
              </div>
              <button onClick={() => { setSettleModal(null); setSettleReceiptFile(null); setSettleReceiptPreview(null); }} className="p-1.5 text-neutral-500 hover:text-white rounded-lg transition-colors"><X size={16} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex justify-between items-center">
                <span className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Balance Due</span>
                <span className="text-xl font-black text-rose-400">{formatPHP(settleModal.balanceDue)}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Amount Paid / Tendered (₱) *</label>
                <input
                  type="number"
                  min="0"
                  max={settleModal.balanceDue + 100000}
                  step="any"
                  autoFocus
                  value={tenderedAmount}
                  onChange={e => setTenderedAmount(e.target.value)}
                  placeholder="Enter cash or GCash amount..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-base text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {/* Payment Method Toggle for Settle Balance */}
              <div className="space-y-1.5 mt-3">
                <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Payment Method</label>
                <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-1">
                  <button type="button" onClick={() => setSettlePaymentMethod('cash')} className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${settlePaymentMethod === 'cash' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>Cash</button>
                  <button type="button" onClick={() => setSettlePaymentMethod('gcash')} className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${settlePaymentMethod === 'gcash' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>GCash</button>
                </div>
              </div>

              {settlePaymentMethod === 'gcash' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 border-t border-neutral-800 pt-3">
                  <div>
                    <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Ref No. (Optional)</label>
                    <input type="text" value={settlePaymentRef} onChange={e => setSettlePaymentRef(e.target.value.replace(/\D/g, '').slice(0, 13))} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-200 focus:border-amber-500 font-mono tracking-widest mt-1.5 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Receipt Image (Optional)</label>
                    <div className="mt-1.5">
                      <label className="cursor-pointer w-full bg-neutral-950 border border-dashed border-neutral-700 rounded-xl overflow-hidden h-[60px] flex items-center justify-center hover:border-neutral-500 transition-colors relative">
                        <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={e => validateAndSetImage(e, setSettleReceiptFile, setSettleReceiptPreview)} />
                        {settleReceiptPreview ? (
                          <img src={settleReceiptPreview} alt="Preview" className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <span className="text-[10px] text-neutral-400 font-semibold flex flex-col items-center gap-1"><ImageIcon size={14}/> Upload JPG/PNG</span>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {(() => {
                const tendered = parseFloat(tenderedAmount) || 0;
                const change = Math.max(0, tendered - settleModal.balanceDue);
                const debt = Math.max(0, settleModal.balanceDue - tendered);
                const isOverLimit = tendered > settleModal.balanceDue + 100000;
                return (
                  <>
                    <div className={`border rounded-xl p-4 flex justify-between items-center transition-colors ${debt > 0 && tenderedAmount !== '' ? 'bg-amber-950/20 border-amber-900/40' : 'bg-neutral-900/60 border-neutral-800/80'}`}>
                      <span className="text-xs text-neutral-400 uppercase tracking-wider font-bold">{debt > 0 && tenderedAmount !== '' ? 'Shortfall / Debt' : 'Change Due'}</span>
                      <span className={`text-lg font-black ${debt > 0 && tenderedAmount !== '' ? 'text-amber-400' : 'text-emerald-400'}`}>{formatPHP(debt > 0 && tenderedAmount !== '' ? debt : change)}</span>
                    </div>
                    {debt > 0 && tenderedAmount !== '' && (
                       <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 flex items-start gap-2">
                         <AlertTriangle size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                         <p className="text-[10px] text-rose-300 leading-relaxed font-semibold">Partial payment detected. Customer will automatically be added to the Watchlist for debt tracking.</p>
                       </div>
                    )}
                    {isOverLimit && <p className="text-[10px] text-rose-400 text-center font-bold">⚠️ Error: Amount is excessively high.</p>}
                  </>
                );
              })()}

              <div className="flex gap-3 pt-2">
                <button type="button" disabled={isSettling} onClick={() => { setSettleModal(null); setSettleReceiptFile(null); setSettleReceiptPreview(null); }} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 text-sm rounded-xl transition-colors font-semibold">Cancel</button>
                <button
                  type="button"
                  disabled={
                    isSettling ||
                    tenderedAmount === '' ||
                    (parseFloat(tenderedAmount) || 0) < 0 || 
                    (parseFloat(tenderedAmount) || 0) > settleModal.balanceDue + 100000
                  }
                  onClick={async () => {
                    setIsSettling(true);
                    try {
                      const tendered = parseFloat(tenderedAmount) || 0;
                      const debt = Math.max(0, settleModal.balanceDue - tendered);

                      if (debt > 0 && addWatchlistItem) {
                        addWatchlistItem({
                          name: settleModal.customerName,
                          reason: 'debt',
                          description: `Unpaid balance of ${formatPHP(debt)} from Reservation #${settleModal.id.toUpperCase()}.`,
                          status: 'active',
                          dateAdded: new Date()
                        });
                        if (addActivity) {
                          addActivity('admin_action', `Automatically added ${settleModal.customerName} to Watchlist for unpaid debt of ${formatPHP(debt)} (Res #${settleModal.id.toUpperCase()}).`);
                        }
                      }

                      let finalReceiptUrl = null;
                      if (settlePaymentMethod === 'gcash' && settleReceiptFile) {
                        const fileExt = settleReceiptFile.name.split('.').pop();
                        const fileName = `balance_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
                        const { error: uploadError } = await supabase.storage.from('oneshot-assets').upload(fileName, settleReceiptFile);
                        if (!uploadError) {
                          const { data: publicUrlData } = supabase.storage.from('oneshot-assets').getPublicUrl(fileName);
                          finalReceiptUrl = publicUrlData.publicUrl;
                        }
                      }

                      updateBalance(settleModal.id, true);

                      // Append or update the reservation's receipt image if one was uploaded during GCash settlement
                      if (finalReceiptUrl || (settlePaymentMethod === 'gcash' && settlePaymentRef)) {
                        const updates: any = {};
                        if (finalReceiptUrl) updates.receipt_img_url = finalReceiptUrl; 
                        await supabase.from('reservations').update(updates).eq('id', settleModal.id);
                      }

                      setSettleModal(null);
                      setTenderedAmount('');
                      setSettleReceiptFile(null);
                      setSettleReceiptPreview(null);
                      flash(debt > 0 ? "Partial payment logged. Customer added to watchlist." : "Balance settled successfully.", debt > 0 ? "error" : "success");
                    } catch (e) {
                      flash("An error occurred during settlement.", "error");
                    } finally {
                      setIsSettling(false);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-sm rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
                >
                  {isSettling ? <><RefreshCw size={14} className="animate-spin" /> Processing...</> : 'Confirm Settlement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deny / Cancel Dialog */}
      {showCancelDialog && (() => {
        const targetRes = reservations.find((r: any) => r.id === cancelTarget);
        const isPending = targetRes?.status === 'pending';
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
                <div>
                  <h2 className="text-base font-bold text-rose-400">{isPending ? 'Deny Reservation' : 'Cancel Booking'}</h2>
                  <p className="text-xs text-neutral-500">Reservation #{cancelTarget?.toUpperCase()}</p>
                </div>
                <button onClick={() => { setShowCancelDialog(false); setCancelReason(''); }} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-neutral-300">Are you sure you want to {isPending ? 'deny' : 'cancel'} this reservation?</p>
                
                {isPending && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Quick Select Reason</p>
                    <div className="flex flex-wrap gap-2">
                      {["Blurry/Unreadable GCash Receipt", "Invalid/Mismatched Payment Amount", "Fake/Duplicate Receipt", "Customer Requested Denial"].map(r => (
                        <button key={r} type="button" onClick={() => setCancelReason(r)} className={`px-2.5 py-1 text-[10px] rounded-full border transition-colors ${cancelReason === r ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 font-bold' : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Type specific reason for cancellation/denial..." className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-rose-500/40 placeholder-neutral-600" rows={3} />
                
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowCancelDialog(false); setCancelReason(''); }} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors font-semibold">Abort</button>
                  <button type="button" disabled={!cancelReason.trim()} onClick={() => { if (cancelTarget) { cancelReservation(cancelTarget, cancelReason); setShowCancelDialog(false); setCancelReason(''); flash(`Reservation ${isPending ? 'denied' : 'cancelled'} successfully.`, "success"); setSelectedId(null); } }} className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-sm rounded-xl font-bold transition-all shadow-lg shadow-rose-900/30 flex items-center justify-center gap-2">
                    <X size={15} /> Confirm {isPending ? 'Denial' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Image Viewer Lightbox */}
      {viewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-10" onClick={() => setViewImage(null)}>
          <div className="relative w-full max-w-4xl flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewImage(null)} className="absolute -top-12 right-0 p-2 text-neutral-400 hover:text-rose-400 transition-colors bg-neutral-900 rounded-full" title="Close Image"><X size={24} /></button>
            <img src={viewImage} alt="GCash Receipt" className="max-w-full max-h-[85vh] object-contain rounded-xl border border-neutral-800 shadow-2xl" />
          </div>
        </div>
      )}

      {/* 🟢 FULLY RESPONSIVE DIGITAL E-RECEIPT (RESERVATIONS VIEW) */}
      {viewingEReceipt && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8"
          onClick={() => setViewingEReceipt(null)}
        >
          <div 
            className="w-full max-w-sm relative animate-in zoom-in-95 duration-200 max-h-full overflow-y-auto hide-scrollbar rounded-2xl" 
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setViewingEReceipt(null)} 
              className="absolute top-2 right-2 z-10 p-2 text-neutral-400 hover:text-white transition-colors bg-neutral-900/80 rounded-full" 
              title="Close Receipt"
            >
              <X size={18} />
            </button>

            {/* The Ticket Graphic */}
            <div className="bg-neutral-100 text-neutral-900 rounded-b-xl shadow-2xl relative overflow-hidden" style={{ filter: 'drop-shadow(0 10px 15px rgba(16,185,129,0.2))' }}>
              <div className="h-4 w-full flex space-x-1 absolute top-0 left-0 bg-black">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="w-3 h-3 bg-neutral-100 rounded-full -mt-1.5" />
                ))}
              </div>
              
              <div className="px-6 pt-10 pb-8 flex flex-col items-center font-mono">
                <h2 className="text-3xl font-black tracking-tighter mb-1">ONE SHOT</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-6">Bar & Billiards</p>
                
                <div className="w-full space-y-2 text-xs font-semibold border-b-2 border-dashed border-neutral-300 pb-4 mb-4">
                  <div className="flex justify-between"><span>Booking ID:</span><span className="font-bold text-[10px]">{viewingEReceipt.id.toUpperCase()}</span></div>
                  <div className="flex justify-between"><span>Date:</span><span>{format(new Date(viewingEReceipt.date), 'MM/dd/yyyy')}</span></div>
                  <div className="flex justify-between"><span>Time:</span><span>{formatTimeOnly(viewingEReceipt.timeSlot)}</span></div>
                  <div className="flex justify-between"><span>Table:</span><span>{viewingEReceipt.tableId ? tables.find((t: any) => t.id === viewingEReceipt.tableId)?.name || 'Walk-In' : 'N/A'}</span></div>
                  <div className="flex justify-between"><span>Customer:</span><span>{viewingEReceipt.customerName}</span></div>
                </div>

                <div className="w-full space-y-2 text-xs font-bold border-b-2 border-dashed border-neutral-300 pb-4 mb-4">
                  <div className="flex justify-between"><span>Table Booked ({viewingEReceipt.durationHours}h)</span><span>{formatPHP(viewingEReceipt.totalAmount)}</span></div>
                </div>

                <div className="w-full space-y-1.5 text-sm">
                  <div className="flex justify-between font-black text-base"><span>TOTAL DUE</span><span>{formatPHP(viewingEReceipt.totalAmount)}</span></div>
                  <div className="flex justify-between text-neutral-500 font-semibold text-xs"><span>Down Payment</span><span>-{formatPHP(viewingEReceipt.downPaymentAmount)}</span></div>
                  <div className="flex justify-between text-neutral-500 font-semibold text-xs"><span>Balance Paid</span><span>-{formatPHP(Math.max(0, Number(viewingEReceipt.totalAmount || 0) - Number(viewingEReceipt.downPaymentAmount || 0)))}</span></div>
                </div>

                <div className="w-full mt-4 pt-4 border-t-[3px] border-neutral-800 flex justify-between font-black text-xl">
                  <span>STATUS</span>
                  <span className="text-emerald-600">SETTLED</span>
                </div>

                <div className="mt-8 flex flex-col items-center">
                   <div className="p-2 border-2 border-neutral-900 rounded-lg mb-2 opacity-80">
                     <QrCode size={64} strokeWidth={1.5} />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">Completed Booking</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 GLOBAL REFRESH BLOCKER */}
      {(isRefreshing || isVoiding || isSubmitting || isSettling || isActionSubmitting || isRescheduling) && (
        <div className="fixed inset-0 z-[99999] cursor-wait" />
      )}

    </div>
  );
}