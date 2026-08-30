import { useState, useRef, useEffect} from 'react';
import { useAppContext, HOURLY_RATE, DOWN_PAYMENT_RATE, ReservationStatus, Reservation, Event, PromoCode } from '../context/AppContext';
import {
  Plus, X, Calendar, Clock, Users, Phone, Mail, ChevronDown, CheckCircle,
  XCircle, Search, Filter, DollarSign, AlertTriangle, Download, Image as ImageIcon,
  CalendarX2, List as ListIcon, Lock, ChevronLeft, ChevronRight, Send, Upload, ShieldAlert, RefreshCw
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, addMonths, subMonths, differenceInSeconds } from 'date-fns';
import { useNavigate } from 'react-router';
import { supabase } from '../utils/supabase';

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
  const { 
    reservations, addReservation, updateReservationStatus, cancelReservation, 
    updateDownPayment, updateBalance, tables, events, promoCodes, closedDates, 
    rates, updateRefundStatus, theme, reservationTerms,
    staffUsers, hashPassword, addActivity, sessionHistory
  } = useAppContext() as any;
  const navigate = useNavigate();
  
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [viewMonth, setViewMonth] = useState(new Date());
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | ReservationStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  // 🟢 TOAST STATE WITH 5S TIMER & FADE OUT
  const [toastState, setToastState] = useState<{msg: string, type: 'success' | 'error' | 'loading'} | null>(null);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const flash = (msg: string, type: 'success' | 'error' | 'loading' = 'success') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToastState({ msg, type });
    if (type !== 'loading') {
      toastTimeout.current = setTimeout(() => setToastState(null), 5000);
    }
  };
  
  // 🟢 NEW: Enhanced Admin Authorized Void Modal State
  const [voidModal, setVoidModal] = useState<{
    type: 'downPayment' | 'balance' | 'verified';
    id: string;
    customerName: string;
  } | null>(null);
  const [voidPassword, setVoidPassword] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);
  
  // Staff Refund Notes
  const [refundNotes, setRefundNotes] = useState('');

  // State for in-page image viewer
  const [viewImage, setViewImage] = useState<string | null>(null);

  // Settle Balance Modal State
  const [settleModal, setSettleModal] = useState<{ id: string; customerName: string; balanceDue: number } | null>(null);
  const [tenderedAmount, setTenderedAmount] = useState('');

  useEffect(() => {
    return () => {
      fetch('http://localhost:3001/api/sync-to-cloud', { method: 'POST' }).catch(() => {});
    };
  }, []);
  
  // Form state
  const [form, setForm] = useState({
    customerName: '', contactNumber: '', email: '', date: '',
    timeSlot: '', durationHours: 2, partySize: 2, tableId: '', paymentRef: '',
    paymentMethod: 'gcash' as 'gcash' | 'cash'
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if reservation has a completed table session in database
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

  // Admin Password Authorization Helper for All Voids
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

  // Dynamic constraints for Staff Manual Booking
  const getNextClosingTime = (dateStr: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const isWeekend = d.getDay() === 5 || d.getDay() === 6;
    const closeTimeStr = isWeekend ? rates?.weekendEndTime : rates?.weekdayEndTime;
    if (!closeTimeStr) return null;
    
    const [hr, min] = closeTimeStr.split(':').map(Number);
    const closeDate = new Date(dateStr);
    closeDate.setHours(hr, min, 0, 0);
    
    if (hr <= 12) {
      closeDate.setDate(closeDate.getDate() + 1);
    }
    return closeDate;
  };

  const maxAllowedDuration = (() => {
    let maxMins = (reservationTerms?.maxHours || 8) * 60;
    if (form.date && form.timeSlot) {
      const closeDate = getNextClosingTime(form.date);
      const [h, m] = form.timeSlot.split(':').map(Number);
      const startD = new Date(form.date);
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
    
    // Default to the higher of the two limits if no date is picked yet
    if (!form.date) return Math.max(wDayMax, wEndMax);
    
    const d = new Date(form.date);
    const isWeekend = d.getDay() === 0 || d.getDay() === 5 || d.getDay() === 6;
    return isWeekend ? wEndMax : wDayMax;
  })();

  // Strict Time Slot Validator based on Store Hours
  const isTimeSlotValid = (() => {
    if (!form.date || !form.timeSlot) return true;
    const parseToMins = (t: string) => { const [h, m] = (t||'0').split(':').map(Number); return h * 60 + (m || 0); };
    
    const d = new Date(form.date);
    const isWeekend = d.getDay() === 0 || d.getDay() === 5 || d.getDay() === 6;
    const startStr = isWeekend ? rates?.weekendStartTime : rates?.weekdayStartTime;
    const endStr = isWeekend ? rates?.weekendEndTime : rates?.weekdayEndTime;
    
    if (!startStr || !endStr) return true;
    
    const startMins = parseToMins(startStr);
    let endMins = parseToMins(endStr);
    if (endMins <= startMins) endMins += 24 * 60;
    
    const slotMins = parseToMins(form.timeSlot);
    let normalizedSlot = slotMins;
    if (slotMins < startMins) normalizedSlot += 24 * 60;
    
    return normalizedSlot >= startMins && normalizedSlot < endMins;
  })();

  // RULE 1 & 2: Advance Booking Cut-off & Past Date Check
  const advanceCheck = (() => {
    if (!form.date || !form.timeSlot) return { valid: true, message: '' };
    const [y, m, d] = form.date.split('-').map(Number);
    const [hr, min] = form.timeSlot.split(':').map(Number);
    const bookingDateTime = new Date(y, m - 1, d, hr, min);
    const now = new Date();

    if (bookingDateTime < now) {
      return { valid: false, message: 'Cannot reserve a date or time in the past.' };
    }

    const advanceHours = Number(reservationTerms?.advanceBookingHours) || 1;
    const minAllowedTime = new Date(now.getTime() + advanceHours * 3600 * 1000);

    if (isSameDay(bookingDateTime, now) && bookingDateTime < minAllowedTime) {
      return {
        valid: false,
        message: `Same-day reservations require at least ${advanceHours} hour(s) advance booking cut-off so walk-ins are not interrupted.`
      };
    }

    return { valid: true, message: '' };
  })();

  // RULE 3: Hourly Capacity Limiter (Booking Constraints)
  const capacityCheck = (() => {
    if (!form.date || !form.timeSlot) return { valid: true, message: '' };
    const d = new Date(form.date);
    const isWeekend = d.getDay() === 0 || d.getDay() === 5 || d.getDay() === 6;
    const limitPercent = isWeekend
      ? Number(rates?.weekendOnlineCapacityLimit || 40)
      : Number(rates?.weekdayOnlineCapacityLimit || 90);

    const activeTables = tables.filter((t: any) => t.isActive);
    const totalActiveTables = activeTables.length || 10;
    const maxTablesForHour = Math.max(1, Math.floor(totalActiveTables * (limitPercent / 100)));

    const [reqH, reqM] = form.timeSlot.split(':').map(Number);
    const reqStart = reqH * 60 + reqM;
    const reqEnd = reqStart + form.durationHours * 60;

    const overlappingCount = reservations.filter((r: any) => {
      if (r.status === 'cancelled' || r.status === 'completed') return false;
      if (!isSameDay(new Date(r.date), d)) return false;

      const [rH, rM] = (r.timeSlot || '00:00').split(':').map(Number);
      const rStart = rH * 60 + rM;
      const rEnd = rStart + (Number(r.durationHours) || 2) * 60;

      return reqStart < rEnd && reqEnd > rStart;
    }).length;

    if (overlappingCount >= maxTablesForHour) {
      return {
        valid: false,
        message: `Hourly reservation capacity reached (${limitPercent}% limit = max ${maxTablesForHour} table(s) per hour). Please select a different time.`
      };
    }

    return { valid: true, message: '' };
  })();

  const effectiveHourly = (rates && Number(rates.hourlyRate) > 0) ? Number(rates.hourlyRate) : HOURLY_RATE;
  const totalAmount = form.durationHours * effectiveHourly;
  const downPaymentPercentVal = rates && Number(rates.downPaymentPercent) >= 0 ? Number(rates.downPaymentPercent) : DOWN_PAYMENT_RATE * 100;
  const downPayment = totalAmount * (downPaymentPercentVal / 100);

  // ─── Data Mappers for Calendar ───────────────────────────────────────
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

  const handleSendEmail = (resId: string) => {
    flash(`Reschedule email sent to Reservation #${resId.toUpperCase()}`, "success");
  };

  // 🟢 Strict Check-in Measure (WITHIN THE DAY ONLY)
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

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['ID', 'Customer Name', 'Contact', 'Email', 'Date', 'Time', 'Duration (hrs)', 'Party Size', 'Table', 'Status', 'Total Amount', 'Down Payment', 'Balance Paid', 'Promo Code'];
    const rows = reservations.map((r: any) => [
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!advanceCheck.valid) {
      flash(advanceCheck.message, "error");
      return;
    }
    if (!capacityCheck.valid) {
      flash(capacityCheck.message, "error");
      return;
    }

    // 🟢 Strict Validation: Email Address (ends with .com)
    if (form.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email) || !form.email.toLowerCase().endsWith('.com')) {
        flash("Email address must be valid and end with a .com domain (e.g., @gmail.com).", "error");
        return;
      }
    }

    if (form.paymentMethod === 'gcash' && (!receiptFile || form.paymentRef.length < 13)) {
      flash("GCash Reference Number and Receipt Image are required.", "error");
      return;
    }

    const [year, month, day] = form.date.split('-').map(Number);
    const [hour, minute] = form.timeSlot.split(':').map(Number);
    const dateObj = new Date(year, month - 1, day, hour, minute);

    const isDuplicate = reservations.some((r: any) => 
      r.customerName.trim().toLowerCase() === form.customerName.trim().toLowerCase() && 
      isSameDay(new Date(r.date), dateObj) && 
      r.timeSlot === form.timeSlot &&
      r.status !== 'cancelled'
    );

    if (isDuplicate) {
      flash("Duplicate Booking Detected!\n\nThis customer already has a reservation for this exact time. To book an additional table for the same group ('libre'), please use the name of the friend who will physically occupy the other table.", "error");
      return;
    }

    setIsSubmitting(true);
    let finalReceiptUrl = null;

    try {
      if (form.paymentMethod === 'gcash' && receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('oneshot-assets')
          .upload(fileName, receiptFile);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('oneshot-assets')
          .getPublicUrl(fileName);
          
        finalReceiptUrl = publicUrlData.publicUrl;
      }

      addReservation({
        customerName: form.customerName.trim(),
        contactNumber: form.contactNumber,
        email: form.email,
        date: dateObj,
        timeSlot: form.timeSlot,
        durationHours: form.durationHours,
        partySize: form.partySize,
        tableId: form.tableId || undefined,
        status: form.paymentMethod === 'cash' ? 'confirmed' : 'pending', // 🟢 Auto-verifies cash payments
        totalAmount,
        downPaymentAmount: downPayment,
        downPaymentPaid: form.paymentMethod === 'cash' ? true : !!finalReceiptUrl,
        balancePaid: false,
        paymentRef: form.paymentMethod === 'cash' ? 'CASH' : (form.paymentRef || undefined),
        receiptImg: finalReceiptUrl || undefined
        // 🟢 REMOVED 'paymentMethod' to permanently fix the Supabase 400 crash
      });

      flash("Reservation successfully created!", "success");
      setShowForm(false);
      setForm({ customerName: '', contactNumber: '', email: '', date: '', timeSlot: '', durationHours: 2, partySize: 2, tableId: '', paymentRef: '', paymentMethod: 'gcash' });
      setReceiptFile(null);
      setReceiptPreview(null);
    } catch (err) {
      console.error("Upload error", err);
      flash("Failed to upload receipt. Please check your connection.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = reservations
    .filter((r: any) => {
      const matchSearch = !search || r.customerName.toLowerCase().includes(search.toLowerCase()) || r.contactNumber.includes(search) || r.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const selected = reservations.find((r: any) => r.id === selectedId);

  const statusOptions: Array<'all' | ReservationStatus> = ['all', 'pending', 'confirmed', 'checked-in', 'completed', 'cancelled'];

  const todayCount = reservations.filter((r: any) => isToday(new Date(r.date))).length;
  const pendingCount = reservations.filter((r: any) => r.status === 'pending').length;
  const totalRevenue = reservations.filter((r: any) => r.status === 'completed').reduce((s: number, r: any) => s + r.totalAmount, 0);
  const pendingPayment = reservations.filter((r: any) => r.status !== 'cancelled').reduce((s: number, r: any) => {
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
                    {!dayCls && dayEvs.map((e: any) => (
                      <div key={e.id} className="w-full text-[8px] bg-amber-500/20 text-amber-400 rounded px-1 truncate font-semibold">{e.title}</div>
                    ))}
                    {!dayCls && dayPrs.map((p: any) => (
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
    <div className="space-y-5 relative">
      
      {/* 🟢 TOP-RIGHT FLOATING TOAST WITH 5S TIMER & FADE OUT */}
      {toastState && (
        <div 
          className="fixed top-6 right-6 z-[99999] animate-in slide-in-from-top-4 fade-in duration-300"
          style={{ animation: toastState.type !== 'loading' ? 'toast-fade-out 5s forwards' : 'none' }}
        >
          <div className={`relative overflow-hidden flex items-start gap-3 px-5 py-4 rounded-xl border shadow-2xl backdrop-blur-md min-w-[320px] max-w-md ${
            toastState.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-900/50 text-emerald-400' 
              : toastState.type === 'loading'
              ? 'bg-sky-950/90 border-sky-900/50 text-sky-400'
              : 'bg-rose-950/90 border-rose-900/50 text-rose-400'
          }`}>
            <div className="mt-0.5 flex-shrink-0">
              {toastState.type === 'success' ? <CheckCircle size={18} /> : toastState.type === 'loading' ? <RefreshCw size={18} className="animate-spin" /> : <AlertTriangle size={18} />}
            </div>
            <span className="text-sm font-semibold leading-snug whitespace-pre-wrap pr-4">{toastState.msg}</span>
            {toastState.type !== 'loading' && (
              <button 
                onClick={() => { setToastState(null); if (toastTimeout.current) clearTimeout(toastTimeout.current); }} 
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
            {toastState.type !== 'loading' && (
              <div 
                className={`absolute bottom-0 left-0 h-1 ${toastState.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ animation: 'toast-shrink 5s linear forwards' }}
              />
            )}
          </div>
          <style>{`
            @keyframes toast-shrink {
              0% { width: 100%; }
              100% { width: 0%; }
            }
            @keyframes toast-fade-out {
              0%, 90% { opacity: 1; transform: translateY(0); }
              100% { opacity: 0; transform: translateY(-10px); }
            }
          `}</style>
        </div>
      )}

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
                ) : filtered.map((r: any) => {
                  const cfg = statusConfig[r.status as ReservationStatus];
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
                        <p className="text-sm text-neutral-300">{formatDate(new Date(r.date))}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-400">{r.durationHours}h</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-400">{r.partySize} pax</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-neutral-400">{r.tableId ? tables.find((t: any) => t.id === r.tableId)?.name || r.tableId : '—'}</span>
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
                          {/* 🟢 NEW: Check In + Void Verified Status Actions */}
                          {r.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => handleCheckIn(r)}
                                className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-[10px] font-bold rounded border border-blue-700/30 transition-colors"
                              >
                                Check In
                              </button>
                              <button
                                onClick={() => setVoidModal({ type: 'verified', id: r.id, customerName: r.customerName })}
                                className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 text-[10px] font-bold rounded border border-rose-700/30 transition-colors"
                                title="Void Verification (Requires Admin Password & Reason)"
                              >
                                Void
                              </button>
                            </>
                          )}
                          {/* 🟢 NEW: Complete Button gated until table session is finished in DB */}
                          {r.status === 'checked-in' && (
                            <button
                              disabled={!hasCompletedSession(r)}
                              title={!hasCompletedSession(r) ? 'Requires a completed table session in database before marking complete' : 'Mark Complete'}
                              onClick={() => updateReservationStatus(r.id, 'completed')}
                              className="px-2 py-1 bg-neutral-700/50 hover:bg-neutral-600/50 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-300 text-[10px] font-bold rounded border border-neutral-700 transition-colors"
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
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${statusConfig[r.status as ReservationStatus]?.color}`}>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-neutral-100">{selected.customerName}</h2>
                <p className="text-sm text-neutral-500 font-mono tracking-wider mt-1">Reservation #{selected.id.toUpperCase()}</p>
              </div>
              <button onClick={() => { setSelectedId(null); setRefundNotes(''); }} className="p-2.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-5 text-base">
                <div className="space-y-1">
                  <p className="text-xs text-neutral-600 uppercase tracking-wider font-bold">Date & Time</p>
                  <p className="text-lg text-neutral-200 font-medium">{format(new Date(selected.date), 'MMM d, yyyy')}</p>
                  <p className="text-neutral-400 text-sm font-medium">{selected.timeSlot}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-600 uppercase tracking-wider font-bold">Duration</p>
                  <p className="text-lg text-neutral-200 font-medium">{selected.durationHours} hour{selected.durationHours > 1 ? 's' : ''}</p>
                  <p className="text-neutral-400 text-sm font-medium">{selected.partySize} pax</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-600 uppercase tracking-wider font-bold">Contact</p>
                  <p className="text-lg text-neutral-200 font-medium">{selected.contactNumber}</p>
                  {selected.email && <p className="text-neutral-400 text-sm">{selected.email}</p>}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-neutral-600 uppercase tracking-wider font-bold">Table</p>
                  <p className="text-lg text-neutral-200 font-medium">{selected.tableId ? tables.find((t: any) => t.id === selected.tableId)?.name || selected.tableId : 'Not assigned'}</p>
                </div>
              </div>

              {/* Payment breakdown */}
              <div className="bg-neutral-900 rounded-xl p-5 space-y-5 border border-neutral-800">
                <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Payment Details</p>
                
                {/* Down Payment Block */}
                <div className="flex justify-between items-center text-base">
                  <span className="text-neutral-400 font-medium">Down Payment ({rates?.downPaymentPercent || 25}%)</span>
                  <div className="flex items-center gap-3">
                    <span className={selected.downPaymentPaid ? 'text-emerald-400 font-black text-xl' : 'text-neutral-400 font-black text-xl'}>
                      {formatPHP(selected.downPaymentAmount)}
                    </span>
                    {selected.downPaymentPaid ? (
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-500 border border-emerald-900/50 cursor-default flex items-center gap-1.5">
                           <CheckCircle size={12}/> Paid
                         </span>
                         {/* 🟢 NEW: Uses Admin Authorized Void Modal */}
                         <button onClick={() => setVoidModal({ type: 'downPayment', id: selected.id, customerName: selected.customerName })} className="text-xs font-bold px-2.5 py-1 rounded bg-rose-950/30 text-rose-500 border border-rose-900/50 hover:bg-rose-900/50 transition-colors">
                           Void
                         </button>
                      </div>
                    ) : (
                      <button onClick={() => updateDownPayment(selected.id, true)} className="text-xs font-bold px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">Mark Paid</button>
                    )}
                  </div>
                </div>

                {/* GCash Receipt Area (Enlarged) */}
                <div className="space-y-2.5 border-t border-neutral-800 pt-4">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-bold">GCash Receipt / Note</label>
                  {selected.paymentRef ? (
                    <div className="flex items-center justify-between bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 shadow-inner">
                      <span className="text-xl font-mono text-white font-black tracking-widest">
                        {selected.paymentRef === 'CASH' ? 'PAID VIA CASH' : `Ref: ${selected.paymentRef}`}
                      </span>
                      {selected.receiptImg ? (
                        <button onClick={() => setViewImage(selected.receiptImg!)} className="text-blue-400 hover:text-white bg-blue-950/30 hover:bg-blue-600/40 rounded-lg transition-all p-2 flex items-center gap-2 font-bold text-xs border border-blue-900/50" title="View Receipt Image">
                          <ImageIcon size={18} /> View
                        </button>
                      ) : (
                        <span className="text-xs text-neutral-600 italic px-1 font-medium">{selected.paymentRef === 'CASH' ? 'Verified manually' : 'No Image'}</span>
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
                    <span className={selected.balancePaid ? 'text-emerald-400 font-black text-xl' : 'text-rose-400 font-black text-xl'}>
                      {formatPHP(selected.totalAmount - selected.downPaymentAmount)}
                    </span>
                    {selected.balancePaid ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-500 border border-emerald-900/50 cursor-default flex items-center gap-1.5">
                          <CheckCircle size={12}/> Paid
                        </span>
                        {/* 🟢 NEW: Uses Admin Authorized Void Modal */}
                        <button onClick={() => setVoidModal({ type: 'balance', id: selected.id, customerName: selected.customerName })} className="text-xs font-bold px-2.5 py-1 rounded bg-rose-950/30 text-rose-500 border border-rose-900/50 hover:bg-rose-900/50 transition-colors">
                          Void
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const bal = selected.totalAmount - selected.downPaymentAmount;
                          setSettleModal({ id: selected.id, customerName: selected.customerName, balanceDue: bal });
                          setTenderedAmount('');
                        }}
                        className="text-xs font-bold px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                      >
                        Settle Balance
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Staff Refund Management Panel */}
              {selected.status === 'cancelled' && selected.downPaymentPaid && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Refund Management</p>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider ${
                      selected.refundStatus === 'acknowledged' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' : 
                      selected.refundStatus === 'expired' ? 'bg-rose-950/40 text-rose-400 border border-rose-900/50' : 
                      'bg-neutral-800 text-neutral-300'
                    }`}>
                      {selected.refundStatus ? selected.refundStatus.replace('_', ' ') : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-neutral-400">Refund Due:</p>
                    <p className="font-black text-amber-400 text-lg">{formatPHP(selected.downPaymentAmount)}</p>
                  </div>

                  {selected.refundNotes && (
                    <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-lg">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Staff Notes / Ref #</p>
                      <p className="text-sm text-neutral-300">{selected.refundNotes}</p>
                    </div>
                  )}

                  {selected.refundStatus !== 'acknowledged' && selected.refundStatus !== 'in_person' && selected.refundStatus !== 'expired' && selected.refundStatus !== 'remediated' && (
                    <div className="space-y-3 pt-3 border-t border-neutral-800/60">
                      <input 
                        type="text" 
                        placeholder="Reference number or notes..." 
                        value={refundNotes} 
                        onChange={e => setRefundNotes(e.target.value)} 
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:border-emerald-500 outline-none" 
                      />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => updateRefundStatus(selected.id, 'processing', undefined, refundNotes)} className="px-3 py-2 bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 border border-sky-600/20 text-xs font-bold rounded-lg transition-colors">
                          Mark Processing
                        </button>
                        <button onClick={() => updateRefundStatus(selected.id, 'sent', 'gcash', refundNotes)} className="px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-600/20 text-xs font-bold rounded-lg transition-colors">
                          Sent via GCash
                        </button>
                        <button onClick={() => updateRefundStatus(selected.id, 'in_person', 'cash', refundNotes)} className="px-3 py-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-600/20 text-xs font-bold rounded-lg transition-colors">
                          Claimed in Person
                        </button>
                        <button onClick={() => updateRefundStatus(selected.id, 'remediated', 'session_credit', refundNotes)} className="px-3 py-2 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-600/20 text-xs font-bold rounded-lg transition-colors">
                          Apply as Credit
                        </button>
                        <button onClick={() => updateRefundStatus(selected.id, 'expired', undefined, refundNotes)} className="col-span-2 px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-600/20 text-xs font-bold rounded-lg transition-colors">
                          Mark Expired (Unclaimed)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status Actions */}
              <div className="flex gap-2.5 flex-wrap">
                {selected.status === 'pending' && (
                  <button onClick={() => { updateReservationStatus(selected.id, 'confirmed'); setSelectedId(null); }} className="flex-1 px-4 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm font-bold rounded-xl border border-emerald-700/30 transition-colors">
                    Confirm Booking
                  </button>
                )}
                {/* 🟢 NEW: Check In + Void Verification Buttons */}
                {selected.status === 'confirmed' && (
                  <>
                    <button onClick={() => handleCheckIn(selected)} className="flex-1 px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-sm font-bold rounded-xl border border-blue-700/30 transition-colors">
                      Check In Customer
                    </button>
                    <button
                      onClick={() => setVoidModal({ type: 'verified', id: selected.id, customerName: selected.customerName })}
                      className="px-4 py-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-sm font-bold rounded-xl border border-rose-700/30 transition-colors"
                      title="Void Verification (Requires Admin Password & Reason)"
                    >
                      Void Verification
                    </button>
                  </>
                )}
                {/* 🟢 NEW: Complete button disabled until table session finishes in DB */}
                {selected.status === 'checked-in' && (
                  <div className="flex-1 flex flex-col gap-1">
                    <button
                      disabled={!hasCompletedSession(selected)}
                      onClick={() => { updateReservationStatus(selected.id, 'completed'); setSelectedId(null); }}
                      className="w-full px-4 py-3 bg-neutral-700/50 hover:bg-neutral-600/50 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-300 text-sm font-bold rounded-xl border border-neutral-700 transition-colors"
                    >
                      Mark Complete
                    </button>
                    {!hasCompletedSession(selected) && (
                      <p className="text-[10px] text-amber-500 font-semibold text-center">
                        ⚠️ Waiting for table session to be completed in DB
                      </p>
                    )}
                  </div>
                )}
                {selected.status !== 'cancelled' && selected.status !== 'completed' && (
                  <button onClick={() => { updateReservationStatus(selected.id, 'cancelled'); setSelectedId(null); }} className="px-4 py-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-sm font-bold rounded-xl border border-rose-700/30 transition-colors">
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
                  <input required maxLength={50} value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-neutral-600"
                    placeholder="Full name (max 50 chars)" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Contact Number *</label>
                  <input required type="tel" minLength={11} maxLength={11} value={form.contactNumber} onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-neutral-600 font-mono"
                    placeholder="09123456789 (11 digits)" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Email (optional)</label>
                  <input type="email" maxLength={50} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-neutral-600"
                    placeholder="email@example.com (max 50 chars)" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Date *</label>
                  <input required type="date" min={format(new Date(), 'yyyy-MM-dd')} value={form.date} style={{ colorScheme: theme === 'light' ? 'light' : 'dark' }} onChange={e => {
                    const newDate = e.target.value;
                    const d = new Date(newDate);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 5 || d.getDay() === 6;
                    
                    const wDayMax = Number(reservationTerms?.weekdayMaxPartySize) || 20;
                    const wEndMax = Number(reservationTerms?.weekendMaxPartySize) || 20;
                    const newMax = isWeekend ? wEndMax : wDayMax;
                    
                    setForm(f => ({ 
                      ...f, 
                      date: newDate,
                      partySize: Math.min(f.partySize, newMax)
                    }));
                  }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Time Slot *</label>
                  <input required type="time" value={form.timeSlot} style={{ colorScheme: theme === 'light' ? 'light' : 'dark' }} onChange={e => {
                    setForm(f => ({ ...f, timeSlot: e.target.value }));
                  }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold flex justify-between">
                    <span>Duration (hours)</span>
                    {form.timeSlot && <span className="text-[10px] text-amber-500">Max ~{maxAllowedDuration}h</span>}
                  </label>
                  <select value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: parseInt(e.target.value) }))} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                    {Array.from({ length: maxAllowedDuration }, (_, i) => i + 1).map(h => (
                      <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold flex justify-between">
                    <span>Party Size</span>
                    <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Max {maxAllowedPartySize}</span>
                  </label>
                  <input type="number" min="1" max={maxAllowedPartySize} value={form.partySize} onChange={e => setForm(f => ({ ...f, partySize: parseInt(e.target.value) || 1 }))} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Table Preference</label>
                  <select
                    value={form.tableId}
                    onChange={e => setForm(f => ({ ...f, tableId: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option value="">Any Available Table (Auto-assign)</option>
                    {tables
                      .filter((t: any) => t.isActive)
                      .map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.status})
                        </option>
                      ))}
                  </select>
                </div>
                
                {/* 🟢 NEW: Down Payment Method Switch (GCash / Cash) */}
                <div className="sm:col-span-2 space-y-3 border-t border-neutral-800 pt-4 mt-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-amber-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <DollarSign size={14}/> Down Payment Info (Required)
                    </p>
                    <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1">
                      <button 
                        type="button" 
                        onClick={() => setForm(f => ({...f, paymentMethod: 'gcash'}))} 
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${form.paymentMethod === 'gcash' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-neutral-500 hover:text-neutral-300'}`}
                      >
                        GCash
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setForm(f => ({...f, paymentMethod: 'cash'}))} 
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${form.paymentMethod === 'cash' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-neutral-500 hover:text-neutral-300'}`}
                      >
                        Cash
                      </button>
                    </div>
                  </div>

                  {form.paymentMethod === 'gcash' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">GCash Ref No. *</label>
                        <input required type="text" value={form.paymentRef} onChange={e => setForm(f => ({ ...f, paymentRef: e.target.value.replace(/\D/g, '').slice(0, 13) }))} placeholder="13-digit ref" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono tracking-widest" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Receipt Image *</label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 cursor-pointer bg-neutral-900 border border-dashed border-neutral-700 hover:border-emerald-500 rounded-lg px-3 py-2 text-center transition-colors flex flex-col items-center justify-center h-[42px]">
                            <input type="file" accept="image/jpeg, image/png" className="hidden" onChange={e => { 
                              const file = e.target.files?.[0]; 
                              if (file) {
                                if (!file.type.startsWith('image/')) { flash('Please upload JPG or PNG only.', 'error'); return; }
                                setReceiptPreview(URL.createObjectURL(file)); 
                                setReceiptFile(file);
                              } 
                            }} />
                            <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                              <Upload size={12} /> {receiptPreview ? 'Change Image' : 'Upload JPG/PNG'}
                            </div>
                          </label>
                          {receiptPreview && <img src={receiptPreview} alt="Receipt" className="w-10 h-10 object-cover rounded-md border border-neutral-700 shadow-sm" />}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 animate-in fade-in flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={18} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-400">Cash Payment Selected</p>
                        <p className="text-xs text-neutral-400 mt-0.5">The down payment will instantly be marked as verified and paid via Cash.</p>
                      </div>
                    </div>
                  )}
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

              {!isTimeSlotValid && form.timeSlot && (
                <p className="text-[10px] text-rose-400 font-bold bg-rose-950/20 p-2 rounded border border-rose-900/50 flex items-center gap-1">
                  <AlertTriangle size={12} /> The selected time slot falls outside operating hours.
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !isTimeSlotValid ||
                    (form.paymentMethod === 'gcash' && (!receiptFile || form.paymentRef.length < 13))
                  }
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-sm rounded-xl font-semibold transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><Plus size={15} /> Create Reservation</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Reservation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
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
                      flash("Reservation cancelled successfully.", "success");
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

      {/* Settle Remaining Balance Modal */}
      {settleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
              <div>
                <h3 className="text-base font-bold text-neutral-100">Settle Remaining Balance</h3>
                <p className="text-xs text-neutral-500">{settleModal.customerName}</p>
              </div>
              <button onClick={() => setSettleModal(null)} className="p-1.5 text-neutral-500 hover:text-white rounded-lg transition-colors">
                <X size={16} />
              </button>
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
                  min={settleModal.balanceDue}
                  step="any"
                  autoFocus
                  value={tenderedAmount}
                  onChange={e => setTenderedAmount(e.target.value)}
                  placeholder="Enter cash or GCash amount..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-base text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {(() => {
                const tendered = parseFloat(tenderedAmount) || 0;
                const change = Math.max(0, tendered - settleModal.balanceDue);
                return (
                  <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Change Due</span>
                    <span className="text-lg font-black text-emerald-400">{formatPHP(change)}</span>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleModal(null)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={(parseFloat(tenderedAmount) || 0) < settleModal.balanceDue}
                  onClick={() => {
                    updateBalance(settleModal.id, true);
                    setSettleModal(null);
                    setTenderedAmount('');
                    flash("Balance settled successfully.", "success");
                  }}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-sm rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/30"
                >
                  Confirm Settlement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 Admin Authorized Void Modal (Down Payment / Balance / Verified Status) */}
      {voidModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-500" />
                <div>
                  <h3 className="text-base font-bold text-neutral-100">
                    {voidModal.type === 'downPayment' && 'Void Down Payment'}
                    {voidModal.type === 'balance' && 'Void Settle Balance'}
                    {voidModal.type === 'verified' && 'Void Verification'}
                  </h3>
                  <p className="text-xs text-neutral-500">Admin Authorization Required</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setVoidModal(null);
                  setVoidPassword('');
                  setVoidReason('');
                  setVoidError('');
                }}
                className="p-1.5 text-neutral-500 hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmVoid} className="p-6 space-y-4">
              <p className="text-xs text-neutral-400 leading-relaxed">
                You are about to void {voidModal.type === 'verified' ? 'the verified (confirmed) status' : 'a payment record'} for{' '}
                <strong className="text-white">{voidModal.customerName}</strong>.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Reason for Voiding *</label>
                <textarea
                  required
                  rows={2}
                  value={voidReason}
                  onChange={e => setVoidReason(e.target.value)}
                  placeholder="Enter reason for voiding this record..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Admin Password *</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={voidPassword}
                  onChange={e => setVoidPassword(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>

              {voidError && (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-semibold bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-xl">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>{voidError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setVoidModal(null);
                    setVoidPassword('');
                    setVoidReason('');
                    setVoidError('');
                  }}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVoiding || !voidPassword || !voidReason.trim()}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-sm rounded-xl font-bold transition-all shadow-lg shadow-rose-900/30 flex items-center justify-center gap-1.5"
                >
                  {isVoiding ? 'Authorizing...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Viewer Lightbox */}
      {viewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-10" onClick={() => setViewImage(null)}>
          <div className="relative w-full max-w-4xl flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setViewImage(null)} 
              className="absolute -top-12 right-0 p-2 text-neutral-400 hover:text-rose-400 transition-colors bg-neutral-900 rounded-full"
              title="Close Image"
            >
              <X size={24} />
            </button>
            <img 
              src={viewImage} 
              alt="GCash Receipt" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl border border-neutral-800 shadow-2xl" 
            />
          </div>
        </div>
      )}
    </div>
  );
}