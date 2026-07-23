import { useState, useEffect } from 'react';
import { useAppContext, HOURLY_RATE, SessionOrder } from '../context/AppContext';
import { TableCard } from '../components/TableCard';
import {
  Search, Play, Zap, X, UserPlus, Clock,
  Calendar, Users, CheckCircle, ChevronRight,
  CreditCard, Banknote, AlertTriangle, CircleCheck,
  ShoppingCart, Plus, Minus, Trash2, Lock, Edit2, History
} from 'lucide-react';
import { isToday, differenceInSeconds, addMinutes } from 'date-fns';

type FilterStatus = 'all' | 'available' | 'occupied' | 'reserved' | 'maintenance';
type PaymentMethod = 'gcash' | 'cash';
type PaymentStatus = 'paid' | 'partial' | 'unpaid';

const formatPHP = (amount: number) => `₱${amount.toFixed(2)}`;

type CustomerSource =
  | { kind: 'queue'; id: string; name: string; partySize: number; contact: string; notes?: string }
  | { kind: 'reservation'; id: string; name: string; partySize: number; contact: string; durationHours: number; timeSlot: string };

export function Tables() {
 const { 
    tables, queue, reservations, assignTable, extendSession, freeTable, 
    inventory, submitTableOrders, voidTableOrder, addInventoryItem, updateInventoryItem, staffProfile, rates, reservationTerms,
    addSessionHistory, addActivity, addWatchlistItem // 🟢 Added these
  } = useAppContext() as any;
  
  const [filter, setFilter]       = useState<FilterStatus>('all');
  const [search, setSearch]       = useState('');
  const [assigningTableId, setAssigningTableId] = useState<string | null>(null);
  const [extendingTableId, setExtendingTableId] = useState<string | null>(null);
  const [endingTableId,    setEndingTableId]    = useState<string | null>(null);
  
  const [posTableId,       setPosTableId]       = useState<string | null>(null);
  const [posCart,          setPosCart]          = useState<SessionOrder[]>([]);
  const [voidItem,         setVoidItem]         = useState<{ index: number, order: SessionOrder } | null>(null);
  const [voidPassword,     setVoidPassword]     = useState('');
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [dismissedNearEnd, setDismissedNearEnd] = useState<Set<string>>(new Set());

  // Menu Editing States
  const isAdmin = staffProfile?.role?.toLowerCase() === 'manager' || staffProfile?.username === 'admin';
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [newItemForm, setNewItemForm] = useState({ name: '', category: 'Drinks', price: 0, stock: 0 });

  // Assign form state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSource | null>(null);
  const [customerName,     setCustomerName]      = useState('');
  const [durationMinutes,  setDurationMinutes]   = useState<number | 'open'>(60);
  const [amountPaid,       setAmountPaid]        = useState('');
  const [paymentOption,    setPaymentOption]     = useState<'payNow' | 'payLater'>('payNow');

  // Extend form state
  const [extendMinutes,       setExtendMinutes]       = useState(60);
  const [extendPayStatus,     setExtendPayStatus]     = useState<PaymentStatus>('paid');
  const [extendPayMethod,     setExtendPayMethod]     = useState<PaymentMethod>('cash');
  const [extendPartialAmount, setExtendPartialAmount] = useState('');
  const [extendCashTendered,  setExtendCashTendered]  = useState('');
  const [extendGcashRef,      setExtendGcashRef]      = useState('');

  // End session payment state
  const [endPayStatus,     setEndPayStatus]     = useState<PaymentStatus>('paid');
  const [endPayMethod,     setEndPayMethod]     = useState<PaymentMethod>('cash');
  const [endPartialAmount, setEndPartialAmount] = useState('');
  const [endCashTendered,  setEndCashTendered]  = useState('');
  const [endGcashRef,      setEndGcashRef]      = useState('');
  const [debtName,         setDebtName]         = useState('');
  const [debtContact,      setDebtContact]      = useState('');

  const [showArchivedMenu, setShowArchivedMenu] = useState(false);
  const displayTables = tables.map((t: any) => 
    !t.isActive ? { ...t, status: 'maintenance', maintenanceReason: t.maintenanceReason || 'Deactivated (Admin)' } : t
  );
  const activeTables = tables.filter((t: any) => t.isActive);
  const available    = activeTables.filter((t: any) => t.status === 'available').length;
  const occupied     = activeTables.filter((t: any) => t.status === 'occupied').length;
  const reserved     = activeTables.filter((t: any) => t.status === 'reserved').length;
  const maintenance  = activeTables.filter((t: any) => t.status === 'maintenance').length;

  const filtered = displayTables.filter((t: any) => {
    const matchFilter = filter === 'all' || t.status === filter;
    const matchSearch = !search
      || t.name.toLowerCase().includes(search.toLowerCase())
      || (t.session?.customerName?.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  const nearEndTables = displayTables.filter((t: any) => {
    if (t.status !== 'occupied' || !t.session || t.session.isOpenTime) return false;
    const endTime = addMinutes(new Date(t.session.startTime), t.session.durationMinutes);
    const secsLeft = differenceInSeconds(endTime, new Date());
    return secsLeft > 0 && secsLeft <= 10 * 60;
  });

  const waitingCustomers: CustomerSource[] = queue
    .filter((q: any) => q.status === 'waiting' || q.status === 'called')
    .map((q: any) => ({ kind: 'queue', id: q.id, name: q.customerName, partySize: q.partySize, contact: q.contactNumber, notes: q.notes }));

  const todayReservations: CustomerSource[] = reservations
    .filter((r: any) => (r.status === 'confirmed' || r.status === 'pending') && isToday(new Date(r.date)))
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((r: any) => ({ kind: 'reservation', id: r.id, name: r.customerName, partySize: r.partySize, contact: r.contactNumber, durationHours: r.durationHours, timeSlot: r.timeSlot }));

  const allCustomers: CustomerSource[] = [...waitingCustomers, ...todayReservations];

  const endingTable = tables.find((t: any) => t.id === endingTableId);
  const getEndSessionInfo = () => {
    if (!endingTable?.session) return null;
    const { startTime, durationMinutes: bookedMins, amountPaid: alreadyPaid, hourlyRate, orders = [], isOpenTime } = endingTable.session;
    const now = new Date();
    const elapsedSecs = differenceInSeconds(now, new Date(startTime));
    const elapsedMins = Math.ceil(elapsedSecs / 60);
    
    let bookedCharge = 0;
    let overtimeCharge = 0;
    let isOvertime = false;
    let overtimeMins = 0;

    if (isOpenTime || bookedMins === null) {
      const fullHours = Math.floor(elapsedMins / 60);
      const remainingMins = elapsedMins % 60;
      
      let extraCharge = 0;
      if (remainingMins > 0 && remainingMins <= 30) {
        extraCharge = hourlyRate / 2;
      } else if (remainingMins > 30) {
        extraCharge = hourlyRate;
      }

      bookedCharge = (fullHours * hourlyRate) + extraCharge;
    } else {
      const endTime = addMinutes(new Date(startTime), bookedMins);
      isOvertime = now > endTime;
      overtimeMins = isOvertime ? Math.ceil(differenceInSeconds(now, endTime) / 60) : 0;
      bookedCharge = (bookedMins / 60) * hourlyRate;
      overtimeCharge = (overtimeMins / 60) * hourlyRate;
    }
    
    const posOrdersTotal = orders.reduce((sum: number, o: any) => sum + (o.price * o.qty), 0);
    const totalDue = bookedCharge + overtimeCharge + posOrdersTotal;
    const balance = Math.max(0, totalDue - alreadyPaid);
    
    return { elapsedMins, alreadyPaid, bookedCharge, overtimeCharge, posOrdersTotal, totalDue, balance, isOvertime, overtimeMins, isOpenTime };
  };
  const endInfo = getEndSessionInfo();

  const extendingTable = tables.find((t: any) => t.id === extendingTableId);
  const effectiveHourly = (rates && Number(rates.hourlyRate) > 0) ? Number(rates.hourlyRate) : HOURLY_RATE;
  const extendCharge = (extendMinutes / 60) * effectiveHourly;

  const posTable = tables.find((t: any) => t.id === posTableId);
  const confirmedOrders = posTable?.session?.orders || [];
  const confirmedTotal = confirmedOrders.reduce((sum: number, o: any) => sum + (o.price * o.qty), 0);
  const cartTotal = posCart.reduce((sum: number, o: any) => sum + (o.price * o.qty), 0);

  const getPosSessionInfo = () => {
    if (!posTable?.session) return null;
    const { startTime, durationMinutes: bookedMins, hourlyRate, isOpenTime } = posTable.session;
    const now = new Date();
    
    if (isOpenTime || bookedMins === null) {
      const elapsedMins = Math.ceil(differenceInSeconds(now, new Date(startTime)) / 60);
      const fullHours = Math.floor(elapsedMins / 60);
      const remainingMins = elapsedMins % 60;
      let extraCharge = 0;
      if (remainingMins > 0 && remainingMins <= 30) extraCharge = hourlyRate / 2;
      else if (remainingMins > 30) extraCharge = hourlyRate;
      return { bookedCharge: (fullHours * hourlyRate) + extraCharge, overtimeCharge: 0, isOvertime: false };
    }
    
    const endTime = addMinutes(new Date(startTime), bookedMins);
    const isOvertime = now > endTime;
    const overtimeMins = isOvertime ? Math.ceil(differenceInSeconds(now, endTime) / 60) : 0;
    const bookedCharge = (bookedMins / 60) * hourlyRate;
    const overtimeCharge = (overtimeMins / 60) * hourlyRate;
    return { bookedCharge, overtimeCharge, isOvertime };
  };
  const posInfo = getPosSessionInfo();

  const openAssign = (tableId: string) => {
    setAssigningTableId(tableId);
    setSelectedCustomer(null);
    setCustomerName('');
    setDurationMinutes(60);
    setAmountPaid('');
    setPaymentOption('payNow');
  };

  const openEnd = (tableId: string) => {
    const table = tables.find((t: any) => t.id === tableId);
    setEndingTableId(tableId);
    setEndPayStatus('paid'); setEndPayMethod('cash'); setEndPartialAmount(''); setEndCashTendered(''); setEndGcashRef('');
    setDebtName(table?.session?.customerName || ''); setDebtContact('');
  };

  const openExtend = (tableId: string) => {
    const table = tables.find((t: any) => t.id === tableId);
    setExtendingTableId(tableId);
    setExtendMinutes(60); setExtendPayStatus('paid'); setExtendPayMethod('cash'); setExtendPartialAmount(''); setExtendCashTendered(''); setExtendGcashRef('');
    setDebtName(table?.session?.customerName || ''); setDebtContact('');
  };

  const pickCustomer = (c: CustomerSource) => {
    setSelectedCustomer(c); setCustomerName(c.name);
    if (c.kind === 'reservation') {
      const mins = c.durationHours * 60;
      setDurationMinutes(mins); setAmountPaid(((mins / 60) * effectiveHourly).toFixed(2));
    } else {
      setDurationMinutes(60); setAmountPaid(((60 / 60) * effectiveHourly).toFixed(2));
    }
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTableId || !customerName) return;
    
    const isOpenTime = durationMinutes === 'open';
    const autoPayment = isOpenTime ? 0 : ((durationMinutes as number) / 60) * effectiveHourly;
    
    assignTable(assigningTableId, {
      customerName,
      durationMinutes: isOpenTime ? null : (durationMinutes as number),
      isOpenTime: isOpenTime,
      startTime: new Date(),
      isPaid: paymentOption === 'payNow',
      hourlyRate: effectiveHourly,
      amountPaid: paymentOption === 'payNow' ? parseFloat(amountPaid) || autoPayment : 0,
      orders: [],
      paymentStatus: paymentOption,
    });
    
    setAssigningTableId(null);
    setSelectedCustomer(null);
    setCustomerName('');
    setDurationMinutes(60);
    setAmountPaid('');
    setPaymentOption('payNow');
  };

const handleConfirmEnd = () => {
    if (!endingTableId || !endInfo || !endingTable?.session) return;
    
    // Calculate exact payments for this checkout
    const partialPaid = parseFloat(endPartialAmount) || 0;
    const totalPaidNow = endPayStatus === 'paid' ? endInfo.balance : endPayStatus === 'partial' ? partialPaid : 0;
    const remainingBalance = endInfo.balance - totalPaidNow;

    // 🟢 NEW: Auto-add to watchlist if there is an unpaid debt
    if (remainingBalance > 0 && addWatchlistItem) {
      const targetName = debtName || endingTable.session.customerName;
      addWatchlistItem({
        name: targetName,
        reason: 'debt',
        description: `Unpaid balance of ${formatPHP(remainingBalance)} from table session (${endingTable.name}). ${debtContact ? `Contact details provided: ${debtContact}` : ''}`,
        status: 'active',
        dateAdded: new Date()
      });
      if (addActivity) {
        addActivity('admin_action', `Automatically added ${targetName} to Watchlist for unpaid debt of ${formatPHP(remainingBalance)}.`);
      }
    }

    // Log the session to history before freeing the table
    addSessionHistory({
      customerName: endingTable.session.customerName,
      tableId: endingTable.id,
      tableName: endingTable.name,
      startTime: endingTable.session.startTime,
      endTime: new Date(),
      durationMinutes: endInfo.elapsedMins,
      totalAmount: endInfo.totalDue,
      amountPaid: endInfo.alreadyPaid + totalPaidNow,
      orders: endingTable.session.orders || []
    });

    freeTable(endingTableId);
    setEndingTableId(null);
  };

  // 🟢 NEW: Walkout / Absconded Handler
  const handleWalkout = () => {
    if (!endingTableId || !endInfo || !endingTable?.session) return;
    const customer = endingTable.session.customerName;
    
    // Log session history as unpaid
    addSessionHistory({
      customerName: customer,
      tableId: endingTable.id,
      tableName: endingTable.name,
      startTime: endingTable.session.startTime,
      endTime: new Date(),
      durationMinutes: endInfo.elapsedMins,
      totalAmount: endInfo.totalDue,
      amountPaid: endInfo.alreadyPaid, // 0 new payment
      orders: endingTable.session.orders || []
    });

    // Automatically push to Security Watchlist
    if (addWatchlistItem) {
      addWatchlistItem({
        name: customer,
        reason: 'theft',
        description: `Customer walked out without paying balance of ${formatPHP(endInfo.balance)} at ${endingTable.name}.`,
        status: 'active',
        dateAdded: new Date()
      });
    }

    if (addActivity) {
      addActivity('admin_action', `ALERT: Customer ${customer} walked out without paying ${formatPHP(endInfo.balance)} at ${endingTable.name}. Added to Watchlist.`);
    }

    freeTable(endingTableId);
    setEndingTableId(null);
  };

  const handleConfirmExtend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingTableId) return;
    const charge = extendPayStatus === 'paid' ? extendCharge : extendPayStatus === 'partial' ? parseFloat(extendPartialAmount) || 0 : 0;
    extendSession(extendingTableId, extendMinutes, charge);
    setExtendingTableId(null);
  };

  const handleAddToCart = (item: any) => {
    const inCartQty = posCart.find(c => c.id === item.id)?.qty || 0;
    if (item.stock - inCartQty <= 0) return; 
    setPosCart(prev => {
      const existing = prev.find(p => p.id === item.id);
      if (existing) return prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setPosCart(prev => prev.map(p => {
      if (p.id === id) {
        const itemStock = inventory.find((i: any) => i.id === id)?.stock || 0;
        const newQty = p.qty + delta;
        if (newQty > itemStock || newQty < 0) return p;
        return { ...p, qty: newQty };
      }
      return p;
    }).filter(p => p.qty > 0));
  };

  const handleConfirmOrders = () => {
    if (!posTableId || posCart.length === 0) return;
    submitTableOrders(posTableId, posCart);
    setPosCart([]);
  };

  const handleVoidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!posTableId || !voidItem) return;
    if (voidPassword === '123') {
      voidTableOrder(posTableId, voidItem.index, voidItem.order);
      setVoidItem(null);
      setVoidPassword('');
    } else {
      alert("Incorrect Admin Password.");
      setVoidPassword('');
    }
  };

  // ── Inline Menu Handlers ──
  const handleSaveMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name || newItemForm.price <= 0) return;

    if (editingItem) {
      updateInventoryItem(editingItem.id, newItemForm);
    } else {
      addInventoryItem({ ...newItemForm, isActive: true });
    }
    
    setEditingItem(null);
    setNewItemForm({ name: '', category: 'Drinks', price: 0, stock: 0 });
    setIsEditingMenu(false);
  };

  const startEditItem = (item: any) => {
    setEditingItem(item);
    setNewItemForm({ name: item.name, category: item.category, price: item.price, stock: item.stock });
    setIsEditingMenu(true);
  };

  const getNextReservation = (tableId: string) => {
    const now = new Date();
    const upcoming = reservations
      .filter((r: any) => r.tableId === tableId && (r.status === 'pending' || r.status === 'confirmed') && new Date(r.date) > now)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (!upcoming.length) return null;
    const r = upcoming[0];
    return { date: new Date(r.date), customerName: r.customerName, timeSlot: r.timeSlot };
  };

  const filterBtns: { key: FilterStatus; label: string; count: number; color: string }[] = [
    { key: 'all',         label: 'All',         count: activeTables.length, color: 'bg-neutral-800 text-neutral-200 border-neutral-700' },
    { key: 'available',   label: 'Available',   count: available,           color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    { key: 'occupied',    label: 'Occupied',    count: occupied,            color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    { key: 'reserved',    label: 'Reserved',    count: reserved,            color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    { key: 'maintenance', label: 'Maintenance', count: maintenance,         color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  ];

 // 🟢 NEW: Dynamic Hour Calculator based on closing time
  const getAvailableDurations = () => {
    const now = new Date();
    // Friday (5) and Saturday (6) are treated as Weekend nights
    const isWeekend = now.getDay() === 5 || now.getDay() === 6; 
    const closeTimeStr = isWeekend ? rates?.weekendEndTime : rates?.weekdayEndTime;
    
    // Default fallback to maxHours if no closing time is set
    let maxMins = (reservationTerms?.maxHours || 8) * 60;

    if (closeTimeStr) {
      const [hr, min] = closeTimeStr.split(':').map(Number);
      const closeDate = new Date(now);
      closeDate.setHours(hr, min, 0, 0);
      
      // If closing time is early AM (e.g., 03:00) and we are currently in PM, push it to tomorrow
      if (hr <= 12 && now.getHours() >= 12) {
         closeDate.setDate(closeDate.getDate() + 1);
      }
      
      const minsLeft = Math.floor(differenceInSeconds(closeDate, now) / 60);
      if (minsLeft > 0) {
         maxMins = Math.min(maxMins, minsLeft);
      }
    }

    const opts = [];
    // Generate options in 60-minute blocks only
    for (let m = 60; m <= maxMins; m += 60) {
      opts.push(m);
    }
    // Always provide at least 1 hour, even if right at closing
    return opts.length > 0 ? opts : [60]; 
  };

  const availableDurations = getAvailableDurations();

  const isOpenTimeDisabled = (() => {
    const now = new Date();
    const isWeekend = now.getDay() === 5 || now.getDay() === 6; 
    const closeTimeStr = isWeekend ? rates?.weekendEndTime : rates?.weekdayEndTime;
    if (!closeTimeStr) return false;
    
    const [hr, min] = closeTimeStr.split(':').map(Number);
    const closeDate = new Date(now);
    closeDate.setHours(hr, min, 0, 0);
    if (hr <= 12 && now.getHours() >= 12) closeDate.setDate(closeDate.getDate() + 1);
    
    const minsLeft = Math.floor(differenceInSeconds(closeDate, now) / 60);
    const cutoff = rates?.bookingCutoffMinutes || 60;
    return minsLeft <= cutoff;
  })();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const assignCustomer = sessionStorage.getItem('assignCustomer');
      const assignTableId = sessionStorage.getItem('assignTableId');
      if (assignCustomer && assignTableId) {
        const customer = JSON.parse(assignCustomer);
        setAssigningTableId(assignTableId);
        setSelectedCustomer(customer as any);
        setCustomerName(customer.name);
        setPaymentOption('payNow');
        
        if (customer.kind === 'reservation') {
          const mins = (customer as any).durationHours * 60;
          setDurationMinutes(mins);
          setAmountPaid(((mins / 60) * effectiveHourly).toFixed(2));
        } else {
          setDurationMinutes(60);
          setAmountPaid(((60 / 60) * effectiveHourly).toFixed(2));
        }
        
        sessionStorage.removeItem('assignCustomer');
        sessionStorage.removeItem('assignTableId');
      }
    }
  }, []);

  const PayStatusBtn = ({ value, current, label, onChange }: { value: PaymentStatus; current: PaymentStatus; label: string; onChange: (v: PaymentStatus) => void }) => (
    <button type="button" onClick={() => onChange(value)} className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${current === value ? value === 'paid' ? 'bg-emerald-600/15 border-emerald-600 text-emerald-400' : value === 'partial' ? 'bg-amber-600/15 border-amber-600 text-amber-400' : 'bg-rose-600/15 border-rose-600 text-rose-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}>
      {label}
    </button>
  );

  const PayMethodBtn = ({ value, current, icon: Icon, label, onChange }: { value: PaymentMethod; current: PaymentMethod; icon: any; label: string; onChange: (v: PaymentMethod) => void }) => (
    <button type="button" onClick={() => onChange(value)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all ${current === value ? 'bg-emerald-600/15 border-emerald-600 text-emerald-400' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}>
      <Icon size={13} /> {label}
    </button>
  );

  return (
    <div className="space-y-5 flex h-[calc(100vh-140px)] relative overflow-hidden">
      
      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 space-y-5 overflow-y-auto pr-2 transition-all duration-300 ${posTableId ? 'mr-[380px]' : ''}`}>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Available',   value: available,   color: 'text-emerald-400' },
            { label: 'Occupied',    value: occupied,    color: 'text-rose-400' },
            { label: 'Reserved',    value: reserved,    color: 'text-amber-400' },
            { label: 'Maintenance', value: maintenance, color: 'text-orange-400' },
          ].map(s => (
            <div key={s.label} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {nearEndTables.filter((t: any) => !dismissedNearEnd.has(t.id)).length > 0 && (
          <div className="space-y-2">
            {nearEndTables.filter((t: any) => !dismissedNearEnd.has(t.id)).map((t: any) => {
              const endTime = addMinutes(new Date(t.session!.startTime), t.session!.durationMinutes);
              const minsLeft = Math.ceil(differenceInSeconds(endTime, new Date()) / 60);
              return (
                <div key={t.id} className="flex items-center gap-3 bg-amber-950/40 border border-amber-700/50 rounded-xl px-4 py-3">
                  <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />
                  <p className="flex-1 text-xs text-amber-300">
                    <strong>{t.name}</strong> — session ends in <strong>{minsLeft} minute{minsLeft !== 1 ? 's' : ''}</strong>.{' '}
                    <span className="text-amber-400/70">{t.session!.customerName} · Consider extending.</span>
                  </p>
                  <button onClick={() => setDismissedNearEnd(prev => new Set([...prev, t.id]))} className="p-1 text-amber-600 hover:text-amber-300 transition-colors flex-shrink-0">
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input type="text" placeholder="Search tables or customers..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {filterBtns.map(b => (
              <button key={b.key} onClick={() => setFilter(b.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${filter === b.key ? b.color : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:border-neutral-700'}`}>
                {b.label} <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${filter === b.key ? '' : 'bg-neutral-800'}`}>{b.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filtered.map((table: any) => (
            <TableCard
              key={table.id} table={table}
              onAssign={() => openAssign(table.id)}
              onExtend={() => openExtend(table.id)}
              onEnd={() => openEnd(table.id)}
              onOrder={() => {
                setPosTableId(table.id);
                setPosCart([]);
                setVoidItem(null);
                setVoidPassword('');
              }}
              nextReservation={table.status === 'reserved' ? getNextReservation(table.id) : null}
            />
          ))}
        </div>
      </div>

      {/* POS SIDEBAR */}
      {posTableId && posTable && (
        <div className="absolute right-0 top-0 bottom-0 w-[380px] bg-neutral-950 border-l border-neutral-800 flex flex-col shadow-2xl z-40 animate-in slide-in-from-right-10 duration-300">
          <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50 flex-none">
            <div>
              <h3 className="font-bold text-neutral-100 flex items-center gap-2"><ShoppingCart size={15} className="text-emerald-400"/> Table Billing & Extras</h3>
              <p className="text-xs text-neutral-500">{posTable.name} · {posTable.session?.customerName || 'No Session'}</p>
            </div>
            <button onClick={() => setPosTableId(null)} className="p-1.5 text-neutral-500 hover:text-white rounded-lg transition-colors"><X size={16}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {posTable.session && posInfo && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-2">Live Bill Summary</p>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Table Booked {posTable.session.isOpenTime ? '(Open Time)' : `(${(posTable.session.durationMinutes as number) < 60 ? `${posTable.session.durationMinutes}m` : `${(posTable.session.durationMinutes as number) / 60}h`})`}</span>
                  <span className="text-neutral-200">{formatPHP(posInfo.bookedCharge)}</span>
                </div>
                {posInfo.isOvertime && (
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-400 flex items-center gap-1"><AlertTriangle size={10} /> Overtime</span>
                    <span className="text-amber-400">+{formatPHP(posInfo.overtimeCharge)}</span>
                  </div>
                )}
                {confirmedTotal > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-400 flex items-center gap-1"><ShoppingCart size={10} /> F&B Orders</span>
                    <span className="text-emerald-400">+{formatPHP(confirmedTotal)}</span>
                  </div>
                )}
                <div className="border-t border-neutral-800 pt-1.5 flex justify-between text-sm">
                  <span className="text-neutral-300 font-bold">Current Total</span>
                  <span className="text-white font-black">{formatPHP(posInfo.bookedCharge + posInfo.overtimeCharge + confirmedTotal)}</span>
                </div>
              </div>
            )}

            {confirmedOrders.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold flex items-center gap-1"><CheckCircle size={10}/> Confirmed F&B Items</p>
                </div>
                <div className="space-y-2">
                  {confirmedOrders.map((o: any, i: number) => (
                    <div key={i} className={`flex flex-col text-sm bg-neutral-900/50 border rounded-lg overflow-hidden transition-all ${voidItem?.index === i ? 'border-rose-900/50' : 'border-neutral-800'}`}>
                      <div className="flex justify-between items-center px-3 py-2">
                        <div>
                          <p className="text-neutral-200 font-semibold">{o.name}</p>
                          <p className="text-[11px] text-neutral-500">{o.qty}x @ {formatPHP(o.price)} = <span className="text-emerald-400 font-bold">{formatPHP(o.qty * o.price)}</span></p>
                        </div>
                        <button onClick={() => setVoidItem({ index: i, order: o })} className="text-[10px] bg-rose-950/30 text-rose-400 hover:bg-rose-900/40 border border-rose-800/30 px-2 py-1 rounded transition-colors font-semibold flex items-center gap-1">
                          <Trash2 size={10} /> Void
                        </button>
                      </div>
                      
                      {voidItem?.index === i && (
                        <form onSubmit={handleVoidSubmit} className="bg-rose-950/20 px-3 py-2 border-t border-rose-900/30 flex gap-2">
                          <div className="relative flex-1">
                            <Lock size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-500/50" />
                            <input type="password" value={voidPassword} onChange={e => setVoidPassword(e.target.value)} placeholder="Admin Pass..." autoFocus required
                              className="w-full pl-7 pr-2 py-1.5 text-xs bg-rose-950/40 border border-rose-800/50 rounded-md text-rose-200 placeholder-rose-700/50 outline-none focus:border-rose-500" />
                          </div>
                          <button type="submit" className="text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white px-3 rounded-md transition-colors">Confirm</button>
                          <button type="button" onClick={() => { setVoidItem(null); setVoidPassword(''); }} className="text-[10px] text-neutral-400 hover:text-white px-2">Cancel</button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {posCart.length > 0 && (
              <div>
                <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold mb-2 flex items-center gap-1"><ShoppingCart size={10}/> New Order (Pending)</p>
                <div className="space-y-2">
                  {posCart.map((cartItem) => (
                    <div key={cartItem.id} className="flex justify-between items-center text-sm bg-neutral-900 border border-amber-900/30 px-3 py-2 rounded-lg">
                      <div className="flex-1">
                        <p className="text-neutral-200 font-semibold">{cartItem.name}</p>
                        <p className="text-[11px] font-black text-amber-400">{formatPHP(cartItem.qty * cartItem.price)}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-md p-0.5">
                        <button onClick={() => updateCartQty(cartItem.id, -1)} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"><Minus size={12}/></button>
                        <span className="text-xs font-bold text-white w-4 text-center">{cartItem.qty}</span>
                        <button onClick={() => updateCartQty(cartItem.id, 1)} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"><Plus size={12}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. MENU / INLINE INVENTORY */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold flex items-center gap-1.5"><ShoppingCart size={11} /> Available Menu</p>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    {isEditingMenu && (
                      <button onClick={() => setShowArchivedMenu(!showArchivedMenu)} className={`p-1.5 rounded transition-colors ${showArchivedMenu ? 'bg-neutral-700 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'}`} title="View Archive History">
                        <History size={12} />
                      </button>
                    )}
                    <button 
                      onClick={() => { setIsEditingMenu(!isEditingMenu); setEditingItem(null); setShowArchivedMenu(false); setNewItemForm({ name: '', category: 'Drinks', price: 0, stock: 0 }); }} 
                      className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${isEditingMenu ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'}`}
                    >
                      {isEditingMenu ? 'Done Editing' : 'Edit Menu'}
                    </button>
                  </div>
                )}
              </div>

              {isEditingMenu ? (
                <div className="space-y-4">
                  {!showArchivedMenu && (
                    <form onSubmit={handleSaveMenuItem} className="bg-neutral-900 border border-amber-900/40 rounded-xl p-4 space-y-3">
                      <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold mb-2">{editingItem ? 'Edit Item' : 'Add New Item'}</p>
                      <input type="text" value={newItemForm.name} onChange={e => setNewItemForm(f => ({ ...f, name: e.target.value }))} placeholder="Item Name" required className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-500" />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={newItemForm.category} onChange={e => setNewItemForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-500 appearance-none">
                          <option value="Drinks">Drinks</option>
                          <option value="Food">Food</option>
                          <option value="Extras">Extras</option>
                        </select>
                        <input type="number" value={newItemForm.price || ''} onChange={e => setNewItemForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} placeholder="Price ₱" required min="1" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold block mb-1">Add Stock</label>
                        <input type="number" value={newItemForm.stock === 0 ? '' : newItemForm.stock} onChange={e => setNewItemForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} placeholder="Current Stock" min="0" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-500" />
                      </div>
                      <div className="flex gap-2 pt-2">
                        {editingItem && <button type="button" onClick={() => { setEditingItem(null); setNewItemForm({ name: '', category: 'Drinks', price: 0, stock: 0 }); }} className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg transition-colors">Cancel</button>}
                        <button type="submit" className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors">{editingItem ? 'Save Changes' : 'Add Item'}</button>
                      </div>
                    </form>
                  )}
                  
                  {/* Menu List & Archive View */}
                  <div className="space-y-2">
                    {showArchivedMenu && <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2">Archived Items (Hidden from POS)</p>}
                    
                    {inventory.filter((i: any) => showArchivedMenu ? !i.isActive : i.isActive).map((item: any) => (
                      <div key={item.id} className={`w-full flex items-center justify-between p-3 rounded-xl border ${showArchivedMenu ? 'bg-neutral-950 border-neutral-800/50 opacity-70' : 'bg-neutral-900 border-neutral-800'}`}>
                        <div>
                          <p className={`text-sm font-semibold ${showArchivedMenu ? 'text-neutral-400 line-through' : 'text-neutral-200'}`}>{item.name}</p>
                          <p className="text-[10px] text-neutral-500">{item.category} · Stock: {item.stock}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-black mr-2 ${showArchivedMenu ? 'text-neutral-600' : 'text-amber-400'}`}>{formatPHP(item.price)}</p>
                          
                          {showArchivedMenu ? (
                            <button onClick={() => updateInventoryItem(item.id, { isActive: true })} className="p-1.5 text-emerald-500 hover:text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 rounded-md transition-colors title='Restore Item'"><History size={12} /></button>
                          ) : (
                            <>
                              <button onClick={() => startEditItem(item)} className="p-1.5 text-neutral-500 hover:text-white bg-neutral-800 rounded-md transition-colors"><Edit2 size={12} /></button>
                              {confirmArchiveId === item.id ? (
                            <button 
                              onClick={() => {
                                updateInventoryItem(item.id, { isActive: false });
                                setConfirmArchiveId(null);
                              }} 
                              // 🟢 FIX: Removed the onMouseLeave that caused it to disappear
                              className="px-2 py-1.5 text-white bg-rose-600 hover:bg-rose-500 rounded-md transition-colors text-[10px] font-bold" 
                              title="Confirm Archive"
                            >
                              Sure?
                            </button>
                          ) : (
                            <button 
                              onClick={() => setConfirmArchiveId(item.id)} 
                              className="p-1.5 text-neutral-500 hover:text-rose-400 bg-neutral-800 hover:bg-rose-950/30 rounded-md transition-colors" 
                              title="Archive Item"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {showArchivedMenu && inventory.filter((i: any) => !i.isActive).length === 0 && (
                      <p className="text-xs text-neutral-600 text-center py-4">No archived items found.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Standard POS View mapping active items */}
                  {inventory.filter((i: any) => i.isActive).map((item: any) => {
                    const inCartQty = posCart.find(c => c.id === item.id)?.qty || 0;
                    const stockRemaining = item.stock - inCartQty;
                    const outOfStock = stockRemaining <= 0;
                    
                    return (
                      <button key={item.id} disabled={outOfStock || !posTable.session} onClick={() => handleAddToCart(item)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${outOfStock ? 'bg-neutral-900/50 border-neutral-800/50 opacity-60 cursor-not-allowed' : 'bg-neutral-900 border-neutral-800 hover:border-emerald-600/40'}`}>
                        <div>
                          <p className={`text-sm font-semibold ${outOfStock ? 'text-neutral-500' : 'text-neutral-200'}`}>{item.name}</p>
                          <p className="text-[10px] text-neutral-500">{item.category} · Available: {stockRemaining}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black ${outOfStock ? 'text-neutral-500' : 'text-emerald-400'}`}>{formatPHP(item.price)}</p>
                          {outOfStock && <p className="text-[9px] text-rose-500 font-bold uppercase">Out of stock</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex-none">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-neutral-400">Add to Bill:</span>
              <span className="text-lg font-black text-amber-400">{formatPHP(cartTotal)}</span>
            </div>
            {posTable.session ? (
              <button 
                disabled={posCart.length === 0} 
                onClick={handleConfirmOrders}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${posCart.length > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}`}>
                <CheckCircle size={15} /> Confirm Order
              </button>
            ) : (
              <p className="text-xs text-rose-400 text-center italic">Start a table session to add orders.</p>
            )}
          </div>
        </div>
      )}

      {/* START SESSION MODAL */}
      {assigningTableId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]">
            <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center flex-none">
              <div>
                <h2 className="text-base font-bold text-neutral-100">Start Session</h2>
                <p className="text-xs text-neutral-500">{tables.find((t: any) => t.id === assigningTableId)?.name} · ₱{effectiveHourly}/hour</p>
              </div>
              <button onClick={() => setAssigningTableId(null)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {allCustomers.length > 0 && (
                <div className="px-6 pt-5 pb-4 border-b border-neutral-800/60">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5">
                    <Users size={11} /> Assign to Waiting Customer
                  </p>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {waitingCustomers.length > 0 && (
                      <>
                        <p className="text-[10px] text-amber-500/80 uppercase tracking-wider font-semibold flex items-center gap-1.5 mt-1">
                          <UserPlus size={10} /> Walk-in Queue ({waitingCustomers.length})
                        </p>
                        {waitingCustomers.map((c, i) => (
                          <button key={`queue-${c.id}`} type="button" onClick={() => pickCustomer(c)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                              selectedCustomer?.id === c.id && selectedCustomer.kind === 'queue'
                                ? 'bg-emerald-600/15 border-emerald-600/50'
                                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                              i === 0 ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' : 'bg-neutral-800 border border-neutral-700 text-neutral-400'
                            }`}>{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-neutral-200 truncate">{c.name}</p>
                              <p className="text-[11px] text-neutral-500">{c.partySize} {c.partySize === 1 ? 'person' : 'people'}{c.notes ? ` · ${c.notes}` : ''}</p>
                            </div>
                            {selectedCustomer?.id === c.id && selectedCustomer.kind === 'queue'
                              ? <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
                              : <ChevronRight size={14} className="text-neutral-600 flex-shrink-0" />}
                          </button>
                        ))}
                      </>
                    )}
                    {todayReservations.length > 0 && (
                      <>
                        <p className="text-[10px] text-blue-400/80 uppercase tracking-wider font-semibold flex items-center gap-1.5 mt-2">
                          <Calendar size={10} /> Today's Reservations ({todayReservations.length})
                        </p>
                        {todayReservations.map(c => (
                          <button key={`res-${c.id}`} type="button" onClick={() => pickCustomer(c)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                              selectedCustomer?.id === c.id && selectedCustomer.kind === 'reservation'
                                ? 'bg-emerald-600/15 border-emerald-600/50'
                                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                              <Calendar size={11} className="text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-neutral-200 truncate">{c.name}</p>
                              <p className="text-[11px] text-neutral-500">{c.timeSlot} · {c.durationHours}h · {c.partySize} {c.partySize === 1 ? 'person' : 'people'}</p>
                            </div>
                            {selectedCustomer?.id === c.id && selectedCustomer.kind === 'reservation'
                              ? <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
                              : <ChevronRight size={14} className="text-neutral-600 flex-shrink-0" />}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1 h-px bg-neutral-800" />
                    <span className="text-[10px] text-neutral-600 uppercase tracking-wider">or walk-in</span>
                    <div className="flex-1 h-px bg-neutral-800" />
                  </div>
                </div>
              )}

              <form onSubmit={handleAssign} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <UserPlus size={11} />{selectedCustomer ? 'Selected Customer' : 'Customer Name'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => { setCustomerName(e.target.value); if (selectedCustomer) setSelectedCustomer(null); }}
                      className={`w-full bg-neutral-900 border rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder-neutral-600 transition-colors ${
                        selectedCustomer ? 'border-emerald-600/40 bg-emerald-950/20' : 'border-neutral-800'
                      }`}
                      placeholder="Enter customer name"
                      required
                      autoFocus={allCustomers.length === 0}
                    />
                    {selectedCustomer && (
                      <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerName(''); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  {selectedCustomer && (
                    <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                      <CheckCircle size={10} />
                      {selectedCustomer.kind === 'queue' ? 'Assigned from walk-in queue' : `Assigned from today's reservation · ${(selectedCustomer as any).timeSlot}`}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Clock size={11} /> Duration
                  </label>
                  {/* 🟢 NEW: Clean Dropdown for Start Session */}
                  <select 
                    value={durationMinutes === 'open' ? 'open' : durationMinutes}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'open') {
                        setDurationMinutes('open');
                        setAmountPaid('0');
                        setPaymentOption('payLater');
                      } else {
                        const d = Number(val);
                        setDurationMinutes(d);
                        if (paymentOption === 'payNow') setAmountPaid(((d / 60) * effectiveHourly).toFixed(2));
                      }
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    {availableDurations.map(d => (
                      <option key={d} value={d}>{d / 60} Hour{d / 60 > 1 ? 's' : ''}</option>
                    ))}
                    <option value="open" disabled={isOpenTimeDisabled}>
                      Open Time {isOpenTimeDisabled ? '(Disabled near cut-off)' : ''}
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Payment Option</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentOption('payNow')}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        paymentOption === 'payNow'
                          ? 'bg-emerald-600/15 border-emerald-600 text-emerald-400'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <CreditCard size={11} className="inline mr-1.5" /> Pay Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentOption('payLater')}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        paymentOption === 'payLater'
                          ? 'bg-amber-600/15 border-amber-600 text-amber-400'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <Clock size={11} className="inline mr-1.5" /> Pay Later
                    </button>
                  </div>
                </div>

                {paymentOption === 'payNow' && durationMinutes !== 'open' && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Amount Paid (PHP)</label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={e => setAmountPaid(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      placeholder={`₱${(((durationMinutes as number) / 60) * effectiveHourly).toFixed(2)}`}
                      step="0.01"
                    />
                    <p className="text-[10px] text-neutral-600">Suggested: {formatPHP(((durationMinutes as number) / 60) * effectiveHourly)} for {(durationMinutes as number) < 60 ? `${durationMinutes}min` : `${(durationMinutes as number) / 60}hr`}</p>
                  </div>
                )}

                {durationMinutes === 'open' && (
                  <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-3">
                    <p className="text-[10px] text-blue-400 font-semibold mb-1">Open Time Selected</p>
                    <p className="text-[10px] text-blue-600/80">Customer will be billed automatically at the end of the session based on exact time played.</p>
                  </div>
                )}

                {paymentOption === 'payLater' && durationMinutes !== 'open' && (
                  <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3">
                    <p className="text-[10px] text-amber-600/80">Payment will be collected at the end of the session.</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setAssigningTableId(null)}
                    className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 font-semibold">
                    <Play size={14} /> Start Timer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* END SESSION MODAL */}
      {endingTableId && endingTable?.session && endInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center flex-none bg-rose-950/20">
              <div>
                <h2 className="text-base font-bold text-neutral-100">End Session & Checkout</h2>
                <p className="text-xs text-neutral-500">{endingTable.name} · {endingTable.session.customerName}</p>
              </div>
              <button onClick={() => setEndingTableId(null)} className="p-2 text-neutral-500 hover:text-white rounded-lg"><X size={16} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-1">Billing Breakdown</p>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Table Booked {endInfo.isOpenTime ? '(Open Time)' : `(${(endingTable.session.durationMinutes as number) < 60 ? `${endingTable.session.durationMinutes}m` : `${(endingTable.session.durationMinutes as number) / 60}h`})`}</span>
                  <span className="text-neutral-200">{formatPHP(endInfo.bookedCharge)}</span>
                </div>
                {endInfo.isOvertime && (
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-400 flex items-center gap-1"><AlertTriangle size={10} /> Overtime ({endInfo.overtimeMins}m)</span>
                    <span className="text-amber-400 font-semibold">+{formatPHP(endInfo.overtimeCharge)}</span>
                  </div>
                )}
                {endInfo.posOrdersTotal > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-400 flex items-center gap-1"><ShoppingCart size={10}/> Food & Drinks</span>
                    <span className="text-emerald-400 font-semibold">+{formatPHP(endInfo.posOrdersTotal)}</span>
                  </div>
                )}
                <div className="border-t border-neutral-700 pt-1.5 flex justify-between text-sm">
                  <span className="text-neutral-300 font-semibold">Total Due</span>
                  <span className="text-white font-black">{formatPHP(endInfo.totalDue)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Already Paid</span>
                  <span className="text-emerald-400">−{formatPHP(endInfo.alreadyPaid)}</span>
                </div>
                <div className={`flex justify-between text-sm pt-1 rounded-lg px-2 py-1.5 ${endInfo.balance > 0 ? 'bg-rose-950/40' : 'bg-emerald-950/20'}`}>
                  <span className={endInfo.balance > 0 ? 'text-rose-300 font-semibold' : 'text-emerald-400 font-semibold'}>{endInfo.balance > 0 ? 'Balance Due' : 'Settled'}</span>
                  <span className={`font-black ${endInfo.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatPHP(endInfo.balance > 0 ? endInfo.balance : 0)}</span>
                </div>
              </div>

              {endInfo.balance > 0 && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Payment Status</label>
                    <div className="flex gap-2">
                      <PayStatusBtn value="paid" current={endPayStatus} label="Fully Paid" onChange={setEndPayStatus} />
                      <PayStatusBtn value="partial" current={endPayStatus} label="Partial" onChange={setEndPayStatus} />
                      <PayStatusBtn value="unpaid" current={endPayStatus} label="Unpaid" onChange={setEndPayStatus} />
                    </div>
                  </div>

                  {endPayStatus !== 'unpaid' && (
                    <div className="space-y-3">
                      <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold block">Payment Method</label>
                      <div className="flex gap-2 mb-3">
                        <PayMethodBtn value="cash" current={endPayMethod} icon={Banknote} label="Cash" onChange={setEndPayMethod} />
                        <PayMethodBtn value="gcash" current={endPayMethod} icon={CreditCard} label="GCash" onChange={setEndPayMethod} />
                      </div>
                      
                      {endPayMethod === 'gcash' ? (
                        <div>
                          <label className="text-xs text-neutral-400 mb-1.5 block">GCash Reference Number *</label>
                          <input type="text" value={endGcashRef} onChange={e => setEndGcashRef(e.target.value.replace(/\D/g, '').slice(0, 13))} placeholder="13-digit ref no." className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono" />
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs text-neutral-400 mb-1.5 block">Cash Tendered *</label>
                          <input type="number" value={endCashTendered} onChange={e => setEndCashTendered(e.target.value)} placeholder={`e.g. ${endInfo.balance + 100}`} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                          {parseFloat(endCashTendered) > (endPayStatus === 'partial' ? (parseFloat(endPartialAmount) || 0) : endInfo.balance) && (
                            <p className="text-[11px] text-amber-400 mt-1 font-bold">Change: {formatPHP(parseFloat(endCashTendered) - (endPayStatus === 'partial' ? (parseFloat(endPartialAmount) || 0) : endInfo.balance))}</p>
                          )}
                        </div>
                      )}
                      
                      {endPayStatus === 'partial' && (
                        <div className="pt-2 border-t border-neutral-800">
                          <label className="text-xs text-neutral-400 mb-1.5 block">Amount Collected Today (PHP) *</label>
                          <input type="number" value={endPartialAmount} onChange={e => setEndPartialAmount(e.target.value)} placeholder={`Amount collected`} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
                        </div>
                      )}
                    </div>
                  )}

                  {(endPayStatus === 'partial' || endPayStatus === 'unpaid') && (
                    <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 space-y-3">
                      <p className="text-[10px] text-amber-500 uppercase tracking-widest font-semibold flex items-center gap-1.5"><AlertTriangle size={11}/> Debt Tracking Required</p>
                      <input type="text" value={debtName} onChange={e=>setDebtName(e.target.value)} placeholder="Customer Name" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200" />
                      <input type="text" value={debtContact} onChange={e=>setDebtContact(e.target.value)} placeholder="Contact Number / ID Info" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200" />
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 pt-2 border-t border-neutral-800">
                <button type="button" onClick={() => setEndingTableId(null)} className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">Cancel</button>
                <button type="button" onClick={handleConfirmEnd} className="flex-1 px-4 py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-sm rounded-xl shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2 font-semibold"><CircleCheck size={15} /> Finish & Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND SESSION MODAL */}
      {extendingTableId && extendingTable?.session && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center flex-none bg-amber-950/20">
              <div><h2 className="text-base font-bold text-neutral-100">Extend Session</h2><p className="text-xs text-neutral-500">{extendingTable.name} · {extendingTable.session.customerName}</p></div>
              <button onClick={() => setExtendingTableId(null)} className="p-2 text-neutral-500 hover:text-white rounded-lg"><X size={16} /></button>
            </div>

            <form onSubmit={handleConfirmExtend} className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Extra Time</label>
                <select 
                  value={extendMinutes}
                  onChange={e => setExtendMinutes(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                >
                  {availableDurations.map(d => (
                    <option key={d} value={d}>+{d / 60} Hour{d / 60 > 1 ? 's' : ''} (+{formatPHP((d / 60) * effectiveHourly)})</option>
                  ))}
                </select>
              </div>

              <div className="bg-neutral-900 rounded-xl p-3 text-xs border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Extension charge</span><span className="font-semibold text-amber-400">{formatPHP(extendCharge)}</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Payment Status</label>
                <div className="flex gap-2">
                  <PayStatusBtn value="paid" current={extendPayStatus} label="Paid Now" onChange={setExtendPayStatus} />
                  <PayStatusBtn value="partial" current={extendPayStatus} label="Partial" onChange={setExtendPayStatus} />
                  <PayStatusBtn value="unpaid" current={extendPayStatus} label="Defer to End" onChange={setExtendPayStatus} />
                </div>
              </div>

              {extendPayStatus !== 'unpaid' && (
                <div className="space-y-3">
                  <div className="flex gap-2 mb-2">
                    <PayMethodBtn value="cash" current={extendPayMethod} icon={Banknote} label="Cash" onChange={setExtendPayMethod} />
                    <PayMethodBtn value="gcash" current={extendPayMethod} icon={CreditCard} label="GCash" onChange={setExtendPayMethod} />
                  </div>
                  {extendPayMethod === 'gcash' ? (
                    <input type="text" value={extendGcashRef} onChange={e => setExtendGcashRef(e.target.value.replace(/\D/g, '').slice(0, 13))} placeholder="13-digit GCash Ref" className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:ring-blue-500/40 font-mono" />
                  ) : (
                    <div>
                      <input type="number" value={extendCashTendered} onChange={e => setExtendCashTendered(e.target.value)} placeholder="Amount Tendered" className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:ring-emerald-500/40" />
                      {parseFloat(extendCashTendered) > (extendPayStatus === 'partial' ? parseFloat(extendPartialAmount)||0 : extendCharge) && (
                        <p className="text-[11px] text-amber-400 mt-1 font-bold">Change: {formatPHP(parseFloat(extendCashTendered) - (extendPayStatus === 'partial' ? parseFloat(extendPartialAmount)||0 : extendCharge))}</p>
                      )}
                    </div>
                  )}
                  {extendPayStatus === 'partial' && (
                    <input type="number" value={extendPartialAmount} onChange={e => setExtendPartialAmount(e.target.value)} placeholder={`Amount collected today`} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:ring-amber-500/40" />
                  )}
                </div>
              )}

              {/* 🟢 NEW: Dynamic Action Buttons & Validation */}
              {(() => {
                let canExtend = true;
                
                if (extendPayStatus === 'paid') {
                  if (extendPayMethod === 'cash') canExtend = !!extendCashTendered && parseFloat(extendCashTendered) >= extendCharge;
                  if (extendPayMethod === 'gcash') canExtend = extendGcashRef.length === 13;
                } else if (extendPayStatus === 'partial') {
                  const partial = parseFloat(extendPartialAmount) || 0;
                  if (partial <= 0) canExtend = false;
                  else if (extendPayMethod === 'cash') canExtend = !!extendCashTendered && parseFloat(extendCashTendered) >= partial;
                  else if (extendPayMethod === 'gcash') canExtend = extendGcashRef.length === 13;
                }

                return (
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setExtendingTableId(null)} className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={!canExtend}
                      className={`flex-1 px-4 py-2.5 text-sm rounded-xl font-semibold transition-all flex items-center justify-center ${
                        canExtend 
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30' 
                          : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Zap size={15} className="inline mr-1.5" /> Confirm
                    </button>
                  </div>
                );
              })()}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}