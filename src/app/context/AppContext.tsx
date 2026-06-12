import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export type Session = {
  customerName: string;
  startTime: Date;
  durationMinutes: number;
  isPaid: boolean;
  hourlyRate: number;
  amountPaid: number;
};

export type Table = {
  id: string;
  name: string;
  status: TableStatus;
  session?: Session;
  isActive: boolean;
  maintenanceReason?: string;
};

export type QueueItem = {
  id: string;
  customerName: string;
  contactNumber: string;
  partySize: number;
  arrivalTime: Date;
  notes?: string;
  status: 'waiting' | 'called' | 'seated';
  queueNumber: number;
  prioritySource?: 'reservation';
};

export type ReservationStatus = 'pending' | 'confirmed' | 'checked-in' | 'completed' | 'cancelled';

export type Reservation = {
  id: string;
  customerName: string;
  contactNumber: string;
  email?: string;
  date: Date;
  timeSlot: string;
  durationHours: number;
  partySize: number;
  tableId?: string;
  status: ReservationStatus;
  totalAmount: number;
  downPaymentAmount: number;
  downPaymentPaid: boolean;
  balancePaid: boolean;
  createdAt: Date;
  cancellationReason?: string;
  promoCode?: string;
  discountAmount?: number;
};

export type Feedback = {
  id: string;
  customerName: string;
  contactInfo?: string;
  rating: number;
  feedbackType?: 'suggestion' | 'complaint' | 'lost_item' | 'compliment' | 'other';
  comment: string;
  date: Date;
  reservationId?: string;
  tags: string[];
};

export type ActivityType =
  | 'table_assigned' | 'table_freed' | 'table_reserved' | 'session_extended'
  | 'queue_added' | 'queue_removed' | 'queue_called'
  | 'reservation_created' | 'reservation_updated' | 'payment_received' | 'reservation_cancelled'
  | 'feedback_received' | 'promo_created'
  | 'admin_action' | 'tako_action';

export type Activity = {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
};

export type PromoCode = {
  id: string;
  code: string;
  discountPercent: number;
  description: string;
  isActive: boolean;
  maxUsage: number;
  usageCount: number;
  expiresAt?: Date;
  createdAt: Date;
};

export type Event = {
  id: string;
  title: string;
  date: string;
  type: string;
  description: string;
  registrationLink?: string;
  maxParticipants?: number;
  slotsFull?: boolean;
  attachments?: string[];
  promoCodeId?: string;
};

export type StaffProfile = {
  username: string;
  password: string;
  fullName: string;
  email: string;
  role: string;
  phone: string;
  joinedDate: string;
};

export type StaffUser = {
  id: string;
  username: string;
  password: string;
  fullName: string;
  email: string;
  role: 'manager' | 'cashier';
  isAdmin: boolean;
  phone: string;
  isActive: boolean;
  createdAt: Date;
};

export type RatesConfig = {
  hourlyRate: number;
  happyHourRate: number;
  happyHourStart: string;
  happyHourEnd: string;
  overtimeRate: number;
  downPaymentPercent: number;
};

export type ReservationTerms = {
  minHours: number;
  maxHours: number;
  minPartySize: number;
  maxPartySize: number;
  cancellationHours: number;
  cancellationPolicy: string;
  termsAndConditions: string;
};

export type AnnouncementType = 'info' | 'warning' | 'promo' | 'event';
export type Announcement = {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
};

export type ClosedDate = {
  id: string;
  date: string; // 'YYYY-MM-DD'
  reason: string;
  isFullDay: boolean;
  openTime?: string;
  closeTime?: string;
};

// ── Default Data ───────────────────────────────────────────────
// ── Utility Exports ──────────────────────────────────────────
export const HOURLY_RATE = 250;
export const DOWN_PAYMENT_RATE = 0.25;

export const generateRandomPromoCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const generateReferralCode = (name?: string) => {
  if (name) {
    const cleanName = name.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase();
    return `${cleanName}${generateRandomPromoCode().substring(0, 4)}`;
  }
  return generateRandomPromoCode();
};

const now = new Date();
const makeTime = (minsAgo: number) => new Date(now.getTime() - minsAgo * 60 * 1000);
const makeDate = (daysOffset: number, hour: number, minute: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const defaultTables: Table[] = [
  { id: 't1', name: 'Table 1', status: 'occupied', session: { customerName: 'Juan dela Cruz', startTime: makeTime(45), durationMinutes: 120, isPaid: true, hourlyRate: HOURLY_RATE, amountPaid: 500 }, isActive: true },
  { id: 't2', name: 'Table 2', status: 'occupied', session: { customerName: 'Maria Santos', startTime: makeTime(70), durationMinutes: 60, isPaid: true, hourlyRate: HOURLY_RATE, amountPaid: 250 }, isActive: true },
  { id: 't3', name: 'Table 3', status: 'occupied', session: { customerName: 'Carlo Reyes', startTime: makeTime(20), durationMinutes: 180, isPaid: false, hourlyRate: HOURLY_RATE, amountPaid: 0 }, isActive: true },
  { id: 't4', name: 'Table 4', status: 'reserved', isActive: true },
  { id: 't5', name: 'Table 5', status: 'available', isActive: true },
  { id: 't6', name: 'Table 6', status: 'available', isActive: true },
  { id: 't7', name: 'Table 7', status: 'available', isActive: true },
  { id: 't8', name: 'Table 8', status: 'available', isActive: true },
  { id: 't9', name: 'Table 9', status: 'available', isActive: true },
  { id: 't10', name: 'Table 10', status: 'available', isActive: true },
];

const defaultQueue: QueueItem[] = [
  { id: 'q1', customerName: 'Lito Bautista', contactNumber: '09171234567', partySize: 2, arrivalTime: makeTime(15), status: 'waiting', queueNumber: 1 },
];

const defaultStaffUsers: StaffUser[] = [
  { id: 'u1', username: 'admin', password: 'admin123', fullName: 'Admin User', email: 'admin@oneshot.com', role: 'manager', isAdmin: true, phone: '09171234567', isActive: true, createdAt: new Date('2024-01-15') },
  { id: 'u2', username: 'staff1', password: 'staff123', fullName: 'Juan Staff', email: 'staff1@oneshot.com', role: 'manager', isAdmin: false, phone: '09281234567', isActive: true, createdAt: new Date('2024-03-01') },
  { id: 'u3', username: 'cashier1', password: 'cash123', fullName: 'Maria Cashier', email: 'cashier1@oneshot.com', role: 'cashier', isAdmin: false, phone: '09391234567', isActive: true, createdAt: new Date('2024-04-15') },
];

// ── Context Type ───────────────────────────────────────────────
type AppContextType = {
  tables: Table[];
  queue: QueueItem[];
  reservations: Reservation[];
  feedback: Feedback[];
  activities: Activity[];
  promoCodes: PromoCode[];
  staffUsers: StaffUser[];
  rates: RatesConfig;
  reservationTerms: ReservationTerms;
  announcements: Announcement[];
  closedDates: ClosedDate[];
  
  staffLoggedIn: boolean;
  adminLoggedIn: boolean;
  staffProfile: StaffProfile;
  
  staffLogin: (u: string, p: string) => boolean;
  staffLogout: () => void;
  adminLogin: (u: string, p: string) => boolean;
  adminLogout: () => void;
  updateStaffProfile: (profile: Partial<StaffProfile>) => void;
  
  assignTable: (id: string, s: Session) => void;
  freeTable: (id: string) => void;
  reserveTable: (id: string) => void;
  extendSession: (id: string, mins: number, pay: number) => void;
  setTableMaintenance: (id: string, reason: string) => void;
  addTable: (n: string) => void;
  updateTable: (id: string, n: string) => void;
  toggleTableActive: (id: string) => void;
  deleteTable: (id: string) => void;
  
  addToQueue: (i: Omit<QueueItem, 'id'|'arrivalTime'|'status'|'queueNumber'>) => void;
  removeFromQueue: (id: string) => void;
  callQueueItem: (id: string) => void;
  
  addReservation: (i: Omit<Reservation, 'id'|'createdAt'>) => void;
  updateReservationStatus: (id: string, s: ReservationStatus) => void;
  cancelReservation: (id: string, r: string) => void;
  updateDownPayment: (id: string, p: boolean) => void;
  updateBalance: (id: string, p: boolean) => void;
  
  addFeedback: (i: Omit<Feedback, 'id'|'date'>) => void;
  addActivity: (t: ActivityType, d: string, m?: Record<string, any>) => void;
  
  addPromoCode: (i: Omit<PromoCode, 'id'|'createdAt'|'usageCount'>) => string;
  updatePromoCode: (id: string, u: Partial<Omit<PromoCode, 'id'|'createdAt'|'usageCount'>>) => void;
  togglePromoCode: (id: string) => void;
  deletePromoCode: (id: string) => void;
  applyPromoCode: (c: string) => PromoCode | null;

  events: Event[];
  addEvent: (e: Omit<Event, 'id'>) => void;
  updateEvent: (id: string, updates: Partial<Omit<Event, 'id'>>) => void;
  deleteEvent: (id: string) => void;
  
  addStaffUser: (u: Omit<StaffUser, 'id'|'createdAt'>) => void;
  updateStaffUser: (id: string, u: Partial<StaffUser>) => void;
  resetStaffUserPassword: (id: string) => void;
  toggleStaffUserActive: (id: string) => void;
  
  updateRates: (r: Partial<RatesConfig>) => void;
  updateReservationTerms: (t: Partial<ReservationTerms>) => void;
  addAnnouncement: (a: Omit<Announcement, 'id'|'createdAt'>) => void;
  updateAnnouncement: (id: string, u: Partial<Announcement>) => void;
  deleteAnnouncement: (id: string) => void;
  toggleAnnouncement: (id: string) => void;
  addClosedDate: (c: Omit<ClosedDate, 'id'>) => void;
  removeClosedDate: (id: string) => void;
  updateClosedDate: (id: string, u: Partial<ClosedDate>) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState<Table[]>(defaultTables);
  const [queue, setQueue] = useState<QueueItem[]>(defaultQueue);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [events, setEvents] = useState<Event[]>([
    { id: '1', title: 'Spooky Shots Halloween Tournament', date: '2026-10-31', type: 'Tournament', description: 'Annual 8-ball tournament. 500 PHP entry.', maxParticipants: 32, slotsFull: false },
    { id: '2', title: 'Student Billiards League', date: '2026-06-15', type: 'League', description: 'Local universities face off. 10% off for students.', maxParticipants: 20, slotsFull: false },
    { id: '3', title: 'Payday Friday Promo', date: '2026-06-30', type: 'Promo', description: '15% off reservations made today.' },
  ]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(defaultStaffUsers);
  const [rates, setRates] = useState<RatesConfig>({ hourlyRate: 250, happyHourRate: 200, happyHourStart: '18:00', happyHourEnd: '19:00', overtimeRate: 250, downPaymentPercent: 25 });
  const [reservationTerms, setReservationTerms] = useState<ReservationTerms>({ minHours: 1, maxHours: 8, minPartySize: 1, maxPartySize: 10, cancellationHours: 24, cancellationPolicy: 'No refunds on same-day cancellations', termsAndConditions: 'Rules apply.' });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  
  const [staffLoggedIn, setStaffLoggedIn] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [staffProfile, setStaffProfile] = useState<StaffProfile>({ username: 'admin', password: 'admin123', fullName: 'Admin User', email: 'admin@oneshot.com', role: 'Manager', phone: '09171234567', joinedDate: '2024-01-15' });

  // EGRESS OPTIMIZATION: SQLite / Local Sync Strategy Mock
  // Sync Once on Login
  useEffect(() => {
    if (adminLoggedIn || staffLoggedIn) {
      console.log('🔄 SYNC ONCE: Fetching initial state from Supabase to local "SQLite"...');
      // In a real scenario, this is where we do ONE supabase fetch query.
      // After this, timers and queue run fully locally with zero egress.
    }
  }, [adminLoggedIn, staffLoggedIn]);

  // Push Changes - Only on major events
  const syncToSupabase = useCallback((action: string, payload: any) => {
    console.log(`📤 PUSH CHANGE [${action}]: Sending only major event back to Supabase to save egress:`, payload);
  }, []);

  const addActivity = (type: ActivityType, description: string, metadata?: Record<string, any>) => {
    setActivities(prev => [{ id: Math.random().toString(36).substring(7), type, description, timestamp: new Date(), metadata }, ...prev]);
  };

  const staffLogin = (u: string, p: string) => { const valid = staffUsers.find(su => su.username === u && su.password === p && su.isActive); if (valid || (u==='staff' && p==='staff123')) { setStaffLoggedIn(true); return true; } return false; };
  const staffLogout = () => setStaffLoggedIn(false);
  const adminLogin = (u: string, p: string) => { if (u === 'admin' && p === 'admin123') { setAdminLoggedIn(true); return true; } return false; };
  const adminLogout = () => setAdminLoggedIn(false);
  const updateStaffProfile = (p: Partial<StaffProfile>) => setStaffProfile(prev => ({ ...prev, ...p }));

  const assignTable = (tableId: string, session: Session) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'occupied', session } : t));
    addActivity('table_assigned', `Table assigned to ${session.customerName}`, { tableId });
    syncToSupabase('TABLE_ASSIGNED', { tableId, session });
  };
  const freeTable = (tableId: string) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'available', session: undefined, maintenanceReason: undefined } : t));
    addActivity('table_freed', `Table freed`, { tableId });
    syncToSupabase('TABLE_FREED', { tableId });
  };
  const reserveTable = (tableId: string) => setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'reserved' } : t));
  const setTableMaintenance = (tableId: string, reason: string) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'maintenance', maintenanceReason: reason } : t));
    addActivity('admin_action', `Table set to maintenance: ${reason}`, { tableId });
  };
  const extendSession = (tableId: string, mins: number, pay: number) => {
    setTables(prev => prev.map(t => t.id === tableId && t.session ? { ...t, session: { ...t.session, durationMinutes: t.session.durationMinutes + mins, amountPaid: t.session.amountPaid + pay } } : t));
    syncToSupabase('SESSION_EXTENDED', { tableId, mins, pay });
  };
  const addTable = (name: string) => setTables(prev => [...prev, { id: `t${Date.now()}`, name, status: 'available', isActive: true }]);
  const updateTable = (id: string, name: string) => setTables(prev => prev.map(t => t.id === id ? { ...t, name } : t));
  const toggleTableActive = (id: string) => setTables(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
  const deleteTable = (id: string) => setTables(prev => prev.filter(t => t.id !== id));

  const addToQueue = (i: Omit<QueueItem, 'id'|'arrivalTime'|'status'|'queueNumber'>) => {
    setQueue(prev => {
      const nextNum = Math.max(0, ...prev.map(q => q.queueNumber ?? 0)) + 1;
      return [...prev, { ...i, id: `q${Date.now()}`, arrivalTime: new Date(), status: 'waiting', queueNumber: nextNum }];
    });
  };
  const removeFromQueue = (id: string) => setQueue(prev => prev.filter(q => q.id !== id));
  const callQueueItem = (id: string) => setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'called' } : q));

  const addReservation = (i: Omit<Reservation, 'id'|'createdAt'>) => {
    const id = `r${Date.now()}`;
    setReservations(prev => [...prev, { ...i, id, createdAt: new Date() }]);
    syncToSupabase('RESERVATION_ADDED', { id, ...i });
  };
  const updateReservationStatus = (id: string, status: ReservationStatus) => setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  const cancelReservation = (id: string, reason: string) => setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled', cancellationReason: reason } : r));
  const updateDownPayment = (id: string, paid: boolean) => setReservations(prev => prev.map(r => r.id === id ? { ...r, downPaymentPaid: paid } : r));
  const updateBalance = (id: string, paid: boolean) => setReservations(prev => prev.map(r => r.id === id ? { ...r, balancePaid: paid } : r));

  const addFeedback = (i: Omit<Feedback, 'id'|'date'>) => setFeedback(prev => [{ ...i, id: `f${Date.now()}`, date: new Date() }, ...prev]);

  const addPromoCode = (i: Omit<PromoCode, 'id'|'createdAt'|'usageCount'>): string => {
    const id = `p${Date.now()}`;
    setPromoCodes(prev => [...prev, { ...i, id, createdAt: new Date(), usageCount: 0 }]);
    return id;
  };
  const updatePromoCode = (id: string, u: Partial<Omit<PromoCode, 'id'|'createdAt'|'usageCount'>>) => setPromoCodes(prev => prev.map(p => p.id === id ? { ...p, ...u } : p));
  const togglePromoCode = (id: string) => setPromoCodes(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  const deletePromoCode = (id: string) => setPromoCodes(prev => prev.filter(p => p.id !== id));
  const applyPromoCode = (code: string) => promoCodes.find(p => p.code.toUpperCase() === code.toUpperCase() && p.isActive) || null;

  const addStaffUser = (u: Omit<StaffUser, 'id'|'createdAt'>) => setStaffUsers(prev => [...prev, { ...u, id: `su${Date.now()}`, createdAt: new Date() }]);
  const updateStaffUser = (id: string, u: Partial<StaffUser>) => setStaffUsers(prev => prev.map(user => user.id === id ? { ...user, ...u } : user));
  const resetStaffUserPassword = (id: string) => setStaffUsers(prev => prev.map(u => u.id === id ? { ...u, password: 'password123' } : u));
  const toggleStaffUserActive = (id: string) => setStaffUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));

  const updateRates = (r: Partial<RatesConfig>) => setRates(prev => ({ ...prev, ...r }));
  const updateReservationTerms = (t: Partial<ReservationTerms>) => setReservationTerms(prev => ({ ...prev, ...t }));
  const addAnnouncement = (a: Omit<Announcement, 'id'|'createdAt'>) => setAnnouncements(prev => [...prev, { ...a, id: `a${Date.now()}`, createdAt: new Date() }]);
  const updateAnnouncement = (id: string, u: Partial<Announcement>) => setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...u } : a));
  const deleteAnnouncement = (id: string) => setAnnouncements(prev => prev.filter(a => a.id !== id));
  const toggleAnnouncement = (id: string) => setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  const addClosedDate = (c: Omit<ClosedDate, 'id'>) => setClosedDates(prev => [...prev, { ...c, id: `cd${Date.now()}` }]);
  const removeClosedDate = (id: string) => setClosedDates(prev => prev.filter(c => c.id !== id));
  const updateClosedDate = (id: string, u: Partial<ClosedDate>) => setClosedDates(prev => prev.map(c => c.id === id ? { ...c, ...u } : c));

  const addEvent = (e: Omit<Event, 'id'>) => setEvents(prev => [...prev, { ...e, id: Date.now().toString() }]);
  const updateEvent = (id: string, updates: Partial<Omit<Event, 'id'>>) => setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  const deleteEvent = (id: string) => setEvents(prev => prev.filter(e => e.id !== id));

  return (
    <AppContext.Provider value={{
      tables, queue, reservations, feedback, activities, promoCodes, staffUsers, rates, reservationTerms, announcements, closedDates,
      staffLoggedIn, adminLoggedIn, staffProfile,
      staffLogin, staffLogout, adminLogin, adminLogout, updateStaffProfile,
      assignTable, freeTable, reserveTable, extendSession, setTableMaintenance, addTable, updateTable, toggleTableActive, deleteTable,
      addToQueue, removeFromQueue, callQueueItem,
      addReservation, updateReservationStatus, cancelReservation, updateDownPayment, updateBalance,
      addFeedback, addActivity, addPromoCode, updatePromoCode, togglePromoCode, deletePromoCode, applyPromoCode,
      events, addEvent, updateEvent, deleteEvent,
      addStaffUser, updateStaffUser, resetStaffUserPassword, toggleStaffUserActive,
      updateRates, updateReservationTerms, addAnnouncement, updateAnnouncement, deleteAnnouncement, toggleAnnouncement, addClosedDate, removeClosedDate, updateClosedDate
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
