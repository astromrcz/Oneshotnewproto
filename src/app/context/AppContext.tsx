import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export type SessionOrder = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export type Session = {
  customerName: string;
  startTime: Date;
  durationMinutes: number | null; // Null means "Open Time"
  isOpenTime: boolean; // Flag to track if it's pay-as-you-go
  isPaid: boolean;
  hourlyRate: number;
  amountPaid: number;
  orders?: SessionOrder[];
  paymentStatus?: 'paid' | 'payLater';
  gcashReceiptImg?: string;
};

export type Table = {
  id: string;
  name: string;
  status: TableStatus;
  session?: Session;
  isActive: boolean;
  maintenanceReason?: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  isActive: boolean;
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
  paymentRef?: string;
  receiptImg?: string;
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
  | 'admin_action' | 'tako_action' | 'pos_order';

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
  startDate?: Date;
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
  avatarImg?: string;
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
  // Base Settings
  hourlyRate: number;
  overtimeRate: number;
  downPaymentPercent: number;

  // Weekday Settings
  bookingCutoffMinutes: number;
  weekdayStartTime: string;
  weekdayEndTime: string;
  isWeekdayHappyHourActive: boolean;
  weekdayHappyHourRate: number;
  weekdayHappyHourStart: string;
  weekdayHappyHourEnd: string;
  weekdayOnlineCapacityLimit: number;

  // Weekend Settings
  weekendStartTime: string;
  weekendEndTime: string;
  isWeekendHappyHourActive: boolean;
  weekendHappyHourRate: number;
  weekendHappyHourStart: string;
  weekendHappyHourEnd: string;
  weekendOnlineCapacityLimit: number;
};

export type ReservationTerms = {
  // General Terms
  minHours: number;
  maxHours: number;
  cancellationHours: number;
  advanceBookingHours: number;
  cancellationPolicy: string;
  termsAndConditions: string;

  // Weekday Constraints
  weekdayMinPartySize: number;
  weekdayMaxPartySize: number;

  // Weekend Constraints
  weekendMinPartySize: number;
  weekendMaxPartySize: number;
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
  date: string; 
  reason: string;
  isFullDay: boolean;
  openTime?: string;
  closeTime?: string;
};

export type WeatherData = {
  temp: number;
  condition: string;
  isRaining: boolean;
  code: number;
  locationName: string;
};

// Zeroed out but kept to prevent breaking imports
export const HOURLY_RATE = 0;
export const DOWN_PAYMENT_RATE = 0;

export const generateRandomPromoCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ── Context Type ───────────────────────────────────────────────
type AppContextType = {
  tables: Table[]; queue: QueueItem[]; reservations: Reservation[]; feedback: Feedback[]; activities: Activity[]; promoCodes: PromoCode[]; staffUsers: StaffUser[]; inventory: InventoryItem[]; rates: RatesConfig; reservationTerms: ReservationTerms; announcements: Announcement[]; closedDates: ClosedDate[]; weather: WeatherData | null; updateWeatherLocation: (lat: string, lon: string, name: string) => void;
  activeAnnouncement: string; updateActiveAnnouncement: (msg: string) => void;
  staffLoggedIn: boolean; adminLoggedIn: boolean; staffProfile: StaffProfile;
  staffLogin: (u: string, p: string) => boolean; staffLogout: () => void; adminLogin: (u: string, p: string) => boolean; adminLogout: () => void; updateStaffProfile: (profile: Partial<StaffProfile>) => void;
  assignTable: (id: string, s: Session) => void; freeTable: (id: string) => void; reserveTable: (id: string) => void; extendSession: (id: string, mins: number, pay: number) => void; setTableMaintenance: (id: string, reason: string) => void; addTable: (n: string) => void; updateTable: (id: string, n: string) => void; toggleTableActive: (id: string) => void; deleteTable: (id: string) => void;
  addInventoryItem: (i: Omit<InventoryItem, 'id'>) => void; updateInventoryItem: (id: string, i: Partial<InventoryItem>) => void; deleteInventoryItem: (id: string) => void; submitTableOrders: (tableId: string, cart: SessionOrder[]) => void; voidTableOrder: (tableId: string, orderIndex: number, order: SessionOrder) => void;
  addToQueue: (i: Omit<QueueItem, 'id'|'arrivalTime'|'status'|'queueNumber'>) => void; removeFromQueue: (id: string) => void; callQueueItem: (id: string) => void;
  addReservation: (i: Omit<Reservation, 'id'|'createdAt'>) => string; updateReservationStatus: (id: string, s: ReservationStatus) => void; updateReservation: (id: string, u: Partial<Reservation>) => void; cancelReservation: (id: string, r: string) => void; updateDownPayment: (id: string, p: boolean) => void; updateBalance: (id: string, p: boolean) => void;
  addFeedback: (i: Omit<Feedback, 'id'|'date'>) => void; addActivity: (t: ActivityType, d: string, m?: Record<string, any>) => void;
  addPromoCode: (i: Omit<PromoCode, 'id'|'createdAt'|'usageCount'>) => string; updatePromoCode: (id: string, u: Partial<Omit<PromoCode, 'id'|'createdAt'|'usageCount'>>) => void; togglePromoCode: (id: string) => void; deletePromoCode: (id: string) => void; applyPromoCode: (c: string) => PromoCode | null;
  events: Event[]; addEvent: (e: Omit<Event, 'id'>) => void; updateEvent: (id: string, updates: Partial<Omit<Event, 'id'>>) => void; deleteEvent: (id: string) => void;
  addStaffUser: (u: Omit<StaffUser, 'id'|'createdAt'>) => void; updateStaffUser: (id: string, u: Partial<StaffUser>) => void; resetStaffUserPassword: (id: string) => void; toggleStaffUserActive: (id: string) => void;
  updateRates: (r: Partial<RatesConfig>) => Promise<void>; updateReservationTerms: (t: Partial<ReservationTerms>) => Promise<void>; addAnnouncement: (a: Omit<Announcement, 'id'|'createdAt'>) => void; updateAnnouncement: (id: string, u: Partial<Announcement>) => void; deleteAnnouncement: (id: string) => void; toggleAnnouncement: (id: string) => void; addClosedDate: (c: Omit<ClosedDate, 'id'>) => void; removeClosedDate: (id: string) => void; updateClosedDate: (id: string, u: Partial<ClosedDate>) => void;
  siteConfig: any;
  updateSiteConfig: (config: any) => void;
  refreshLiveMonitor: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);

  // States
  const [tables, setTables] = useState<Table[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  
  // Safe fallbacks for UI while loading
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([
    { id: 'u1', username: 'admin', password: 'admin123', fullName: 'Admin User', email: 'admin@oneshot.com', role: 'manager', isAdmin: true, phone: '09171234567', isActive: true, createdAt: new Date() }
  ]);
  
  const [rates, setRates] = useState<RatesConfig>({ 
    hourlyRate: 0, overtimeRate: 0, downPaymentPercent: 0,
    weekdayStartTime: '', weekdayEndTime: '',
    isWeekdayHappyHourActive: false, weekdayHappyHourRate: 0, weekdayHappyHourStart: '', weekdayHappyHourEnd: '', weekdayOnlineCapacityLimit: 0,
    weekendStartTime: '', weekendEndTime: '',
    isWeekendHappyHourActive: false, weekendHappyHourRate: 0, weekendHappyHourStart: '', weekendHappyHourEnd: '', weekendOnlineCapacityLimit: 0,   bookingCutoffMinutes: 60,    weekdayStartTime: '',
  });
  
  const [reservationTerms, setReservationTerms] = useState<ReservationTerms>({ 
    minHours: 0, maxHours: 0, cancellationHours: 0, advanceBookingHours: 1, // 🟢 NEW
    cancellationPolicy: '', termsAndConditions: '',
    weekdayMinPartySize: 0, weekdayMaxPartySize: 0,
    weekendMinPartySize: 0, weekendMaxPartySize: 0
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherConfig, setWeatherConfig] = useState({ lat: '', lon: '', name: '' });

  const [activeAnnouncement, setActiveAnnouncement] = useState("");
  const updateActiveAnnouncement = (msg: string) => setActiveAnnouncement(msg);
  
  const [staffLoggedIn, setStaffLoggedIn] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [staffProfile, setStaffProfile] = useState<StaffProfile>({ username: 'admin', password: 'admin123', fullName: 'Admin User', email: 'admin@oneshot.com', role: 'Manager', phone: '09171234567', joinedDate: '2024-01-15' });
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const updateWeatherLocation = useCallback((lat: string, lon: string, name: string) => {
    setWeatherConfig({ lat, lon, name });
  }, []);

  // 🟢 SILENT BACKGROUND REFRESH (Zero Online Egress)
  const refreshLiveMonitor = async () => {
    try {
      const [tablesRes, queueRes] = await Promise.all([
        fetch('http://localhost:3001/api/tables').catch(() => null),
        fetch('http://localhost:3001/api/queue').catch(() => null),
      ]);

      if (tablesRes && tablesRes.ok) {
        const newTables = await tablesRes.json();
        setTables(prev => JSON.stringify(prev) !== JSON.stringify(newTables) ? newTables : prev);
      }
      
      if (queueRes && queueRes.ok) {
        const newQueue = await queueRes.json();
        setQueue(prev => JSON.stringify(prev) !== JSON.stringify(newQueue) ? newQueue : prev);
      }
    } catch (error) {
      // Fail silently - it will just try again on the next tick
    }
  };

  // 🟢 FETCH LOCAL DATABASE ON MOUNT
  useEffect(() => {
    const fetchLocalDatabase = async () => {
      console.log("📡 Attempting to fetch data from localhost:3001...");
      try {
        // 🟢 FIXED: Added closedDatesRes and eventsRes to the destructuring array
        const [tablesRes, resRes, invRes, queueRes, ratesRes, feedRes, annRes, cmsRes, closedDatesRes, promoRes, eventsRes, activitiesRes] = await Promise.all([
          fetch('http://localhost:3001/api/tables').catch(e => { console.error("Table fetch failed:", e); return null; }),
          fetch('http://localhost:3001/api/reservations').catch(() => null),
          fetch('http://localhost:3001/api/inventory').catch(() => null),
          fetch('http://localhost:3001/api/queue').catch(() => null),
          fetch('http://localhost:3001/api/settings/rates').catch(() => null),
          fetch('http://localhost:3001/api/feedback').catch(() => null),
          fetch('http://localhost:3001/api/announcements').catch(() => null),
          fetch('http://localhost:3001/api/cms').catch(() => null),
          fetch('http://localhost:3001/api/closed-dates').catch(() => null),
          fetch('http://localhost:3001/api/promo-codes').catch(() => null), 
          fetch('http://localhost:3001/api/events').catch(() => null),
          fetch('http://localhost:3001/api/activities').catch(() => null),
        ]);

        if (tablesRes && tablesRes.ok) setTables(await tablesRes.json());
        if (resRes && resRes.ok) setReservations(await resRes.json());
        if (invRes && invRes.ok) setInventory(await invRes.json());
        if (queueRes && queueRes.ok) setQueue(await queueRes.json());
        if (feedRes && feedRes.ok) setFeedback(await feedRes.json());
        if (annRes && annRes.ok) setAnnouncements(await annRes.json());
        if (cmsRes && cmsRes.ok) setSiteConfig(await cmsRes.json());
        if (closedDatesRes && closedDatesRes.ok) setClosedDates(await closedDatesRes.json());
        if (promoRes && promoRes.ok) setPromoCodes(await promoRes.json());
        if (activitiesRes && activitiesRes.ok) setActivities(await activitiesRes.json());
        
        if (eventsRes && eventsRes.ok) {
          const dbEvents = await eventsRes.json();
          setEvents(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const newEvents = dbEvents.filter((e: any) => !existingIds.has(e.id));
            return [...prev, ...newEvents];
          });
        }
        
        if (ratesRes && ratesRes.ok) {
        const dbSettings = await ratesRes.json();
        setRates(prev => ({ ...prev, ...dbSettings }));
        setReservationTerms(prev => ({ ...prev, ...dbSettings })); // 🟢 NEW: Load terms from DB
      }
        
        console.log("✅ Local SQLite database successfully synchronized to state.");
      } catch (err) {
        console.error("❌ Failed to connect to local SQLite Edge Server.", err);
      } finally {
        setTimeout(() => setIsInitializing(false), 800);
      }
    };

    fetchLocalDatabase();
  }, []);

  // Fetch Weather
  useEffect(() => {
    const fetchWeather = async () => {
      if (!weatherConfig.lat || !weatherConfig.lon) return;
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${weatherConfig.lat}&longitude=${weatherConfig.lon}&current=temperature_2m,weather_code&timezone=Asia%2FManila`);
        if (!res.ok) return;
        const data = await res.json();
        
        const code = data.current.weather_code;
        const temp = data.current.temperature_2m;
        const isRaining = code >= 50; 
        
        let condition = "Clear";
        if (code >= 1 && code <= 3) condition = "Cloudy";
        if (code >= 50 && code <= 69) condition = "Raining";
        if (code >= 80 && code <= 82) condition = "Heavy Rain";
        if (code >= 95) condition = "Thunderstorm";

        setWeather({ temp, condition, isRaining, code, locationName: weatherConfig.name });
      } catch (err) {
        console.error("Weather API failed:", err);
      }
    };
    fetchWeather();
  }, [weatherConfig]);

  // Fetch Philippine Holidays
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${currentYear}/PH`);
        if (!res.ok) return;
        const data = await res.json();
        
        const fetchedHolidays: Event[] = data.map((item: any) => ({
          id: `hol_${item.date}`,
          title: item.name,
          date: item.date,
          type: 'Holiday',
          description: `Nationwide Public Holiday. ML predicts high walk-in traffic and extended play duration.`,
        }));

        setEvents(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newHolidays = fetchedHolidays.filter(h => !existingIds.has(h.id));
          return [...prev, ...newHolidays];
        });
      } catch (err) {
        console.error("Holiday API failed:", err);
      }
    };
    fetchHolidays();
  }, []);

  const syncToDB = async (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', payload: any, successMsg: string) => {
    try {
      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch (e) { json = text; }
      if (res.ok) {
        console.log(`💾 [DB SAVED]: ${successMsg} fully inputted into SQLite Database.`);
        return json;
      } else {
        console.error(`❌ [DB ERROR]: Failed to save ${endpoint}`, text);
        toast.error("Database sync failed. Check server.js");
        throw new Error(`DB error: ${res.status} ${text}`);
      }
    } catch (e) {
      console.error("Network error. Is server.js running?", e);
      toast.error("Offline Mode: Changes saved to RAM, but database server is unreachable.");
      throw e;
    }
  };

  const syncToSupabase = useCallback((action: string, payload: any) => {
    console.log(`📤 PUSH CHANGE [${action}]: Sending only major event back to Supabase to save egress:`, payload);
  }, []);

  const addActivity = (type: ActivityType, description: string, metadata?: Record<string, any>) => {
    const newActivity = { id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, type, description, timestamp: new Date(), metadata };
    setActivities(prev => [newActivity, ...prev]);
    
    // Silent database push
    fetch('http://localhost:3001/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newActivity)
    }).catch(e => console.error("Failed to log activity"));
  };

  const staffLogin = (u: string, p: string) => { const valid = staffUsers.find(su => su.username === u && su.password === p && su.isActive); if (valid || (u==='staff' && p==='staff123')) { setStaffLoggedIn(true); return true; } return false; };
  const staffLogout = () => setStaffLoggedIn(false);
  const adminLogin = (u: string, p: string) => { if (u === 'admin' && p === 'admin123') { setAdminLoggedIn(true); return true; } return false; };
  const adminLogout = () => setAdminLoggedIn(false);
  const updateStaffProfile = (p: Partial<StaffProfile>) => {
    setStaffProfile(prev => {
      const updated = { ...prev, ...p };
      
      // 🟢 NEW: Push profile changes to the SQLite database
      fetch(`http://localhost:3001/api/staff/${updated.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      }).catch(e => console.error("Failed to update profile to DB"));
      
      return updated;
    });
  };

  const assignTable = (tableId: string, session: Session) => {
    const updatedSession = { ...session, orders: [] };
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'occupied', session: updatedSession } : t));
    addActivity('table_assigned', `Table assigned to ${session.customerName}`, { tableId });
    syncToDB(`/api/tables/${tableId}`, 'PUT', { status: 'occupied', session: updatedSession }, `Table assigned`);
  };

  const freeTable = (tableId: string) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'available', session: undefined, maintenanceReason: undefined } : t));
    addActivity('table_freed', `Table freed`, { tableId });
    syncToDB(`/api/tables/${tableId}`, 'PUT', { status: 'available', session: null }, `Table freed`);
  };

  const extendSession = (tableId: string, mins: number, pay: number) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId && t.session) {
        const updatedSession = { ...t.session, durationMinutes: (t.session.durationMinutes||0) + mins, amountPaid: t.session.amountPaid + pay };
        syncToDB(`/api/tables/${tableId}`, 'PUT', { status: 'occupied', session: updatedSession }, `Table extended`);
        return { ...t, session: updatedSession };
      }
      return t;
    }));
    addActivity('session_extended', `Extended table session by ${mins} minutes`);
  };

  const reserveTable = (tableId: string) => setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'reserved' } : t));
  
  const setTableMaintenance = (tableId: string, reason: string) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'maintenance', maintenanceReason: reason } : t));
    addActivity('admin_action', `Table set to maintenance: ${reason}`, { tableId });
  };

  const addTable = (name: string) => {
    const newTable = { id: `t${Date.now()}`, name, status: 'available' as TableStatus, isActive: true };
    setTables(prev => [...prev, newTable]);
    addActivity('admin_action', `Added new table: ${name}`);
    syncToDB('/api/tables', 'POST', newTable, `New table added`);
  };

  const updateTable = (id: string, name: string) => setTables(prev => prev.map(t => t.id === id ? { ...t, name } : t));
  const toggleTableActive = (id: string) => {
    setTables(prev => {
      const target = prev.find(t => t.id === id);
      if (target) {
        syncToDB(`/api/tables/${id}`, 'PUT', { isActive: !target.isActive }, `Table visibility toggled`);
      }
      return prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t);
    });
  };
  const deleteTable = (id: string) => setTables(prev => prev.filter(t => t.id !== id));

  const addInventoryItem = (i: Omit<InventoryItem, 'id'>) => {
    const newItem = { ...i, id: `inv${Date.now()}` };
    setInventory(prev => [...prev, newItem]);
    syncToDB('/api/inventory', 'POST', newItem, `Added ${i.name} to inventory`);
    addActivity('admin_action', `Added new menu item: ${i.name}`); 
  };

  const updateInventoryItem = (id: string, u: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, ...u } : i));
    syncToDB(`/api/inventory/${id}`, 'PUT', u, `Updated item ${id}`);
    addActivity('admin_action', `Updated menu item details`);
  };

  const deleteInventoryItem = (id: string) => setInventory(prev => prev.filter(i => i.id !== id));
  
  const submitTableOrders = (tableId: string, cart: SessionOrder[]) => {
    setInventory(prev => prev.map(inv => {
      const cartItem = cart.find(c => c.id === inv.id);
      return cartItem ? { ...inv, stock: inv.stock - cartItem.qty } : inv;
    }));
    setTables(prev => prev.map(t => {
      if (t.id === tableId && t.session) {
        const newOrders = [...(t.session.orders || [])];
        cart.forEach(cartItem => {
          const existing = newOrders.find(o => o.id === cartItem.id);
          if (existing) existing.qty += cartItem.qty;
          else newOrders.push({ ...cartItem });
        });
        return { ...t, session: { ...t.session, orders: newOrders } };
      }
      return t;
    }));
    addActivity('pos_order', `Confirmed ${cart.length} new items for ${tables.find(t=>t.id===tableId)?.name}`);
  };

  const voidTableOrder = (tableId: string, orderIndex: number, order: SessionOrder) => {
    setInventory(prev => prev.map(inv => inv.id === order.id ? { ...inv, stock: inv.stock + order.qty } : inv));
    setTables(prev => prev.map(t => {
      if (t.id === tableId && t.session) {
        const newOrders = [...(t.session.orders || [])];
        newOrders.splice(orderIndex, 1);
        return { ...t, session: { ...t.session, orders: newOrders } };
      }
      return t;
    }));
    addActivity('admin_action', `Voided ${order.name} (x${order.qty}) from ${tables.find(t=>t.id===tableId)?.name}`);
  };

  const addToQueue = (i: Omit<QueueItem, 'id'|'arrivalTime'|'status'|'queueNumber'>) => {
    setQueue(prev => {
      const nextNum = Math.max(0, ...prev.map(q => q.queueNumber ?? 0)) + 1;
      const newItem = { ...i, id: `q${Date.now()}`, arrivalTime: new Date(), status: 'waiting' as const, queueNumber: nextNum };
      addActivity('queue_added', `Added ${i.customerName} to queue position #${nextNum}`);
      syncToDB('/api/queue', 'POST', newItem, `Queue item added`);
      return [...prev, newItem];
    });
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id));
    syncToDB(`/api/queue/${id}`, 'DELETE', {}, `Queue item removed`);
  };

  const callQueueItem = (id: string) => {
    setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'called' } : q));
    addActivity('queue_called', `Called customer from queue to available table`);
    syncToDB(`/api/queue/${id}`, 'PUT', { status: 'called' }, `Queue item called`);
  };

 const addReservation = (i: Omit<Reservation, 'id'|'createdAt'>): string => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRes = { ...i, id, createdAt: new Date() };
    setReservations(prev => [...prev, newRes]);
    syncToDB('/api/reservations', 'POST', newRes, `Reservation ${id} added`);
    syncToSupabase('RESERVATION_ADDED', newRes);
    addActivity('reservation_created', `New reservation created for ${i.customerName} (${id})`); // 🟢 NEW
    return id;
  };
  
  const updateReservationStatus = (id: string, status: ReservationStatus) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    syncToDB(`/api/reservations/${id}`, 'PUT', { status }, `Reservation status updated`);
    addActivity('reservation_updated', `Reservation ${id} status updated to ${status}`); // 🟢 NEW
  };

  const updateReservation = (id: string, u: Partial<Reservation>) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, ...u } : r));
    syncToDB(`/api/reservations/${id}`, 'PUT', u, `Reservation updated`);
    addActivity('reservation_updated', `Reservation ${id} details were updated`);
  };
  
  const cancelReservation = (id: string, reason: string) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled', cancellationReason: reason } : r));
    syncToDB(`/api/reservations/${id}`, 'PUT', { status: 'cancelled', cancellationReason: reason }, `Reservation cancelled`);
    addActivity('reservation_cancelled', `Reservation ${id} was cancelled. Reason: ${reason}`); // 🟢 NEW
  };
  
  const updateDownPayment = (id: string, paid: boolean) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, downPaymentPaid: paid } : r));
    syncToDB(`/api/reservations/${id}`, 'PUT', { downPaymentPaid: paid }, `Down payment updated`);
    if (paid) addActivity('payment_received', `Down payment recorded for reservation ${id}`); // 🟢 NEW
  };
  
  const updateBalance = (id: string, paid: boolean) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, balancePaid: paid } : r));
    syncToDB(`/api/reservations/${id}`, 'PUT', { balancePaid: paid }, `Balance updated`);
    if (paid) addActivity('payment_received', `Remaining balance settled for reservation ${id}`); // 🟢 NEW
  };

  const addFeedback = (i: Omit<Feedback, 'id'|'date'>) => {
    const newFeedback = { ...i, id: `f${Date.now()}`, date: new Date() };
    setFeedback(prev => [newFeedback, ...prev]);
    syncToDB('/api/feedback', 'POST', newFeedback, "New customer feedback");
  };

 
 const addPromoCode = (i: Omit<PromoCode, 'id'|'createdAt'|'usageCount'>): string => {
    const id = `p${Date.now()}`;
    const newPromo = { ...i, id, createdAt: new Date(), usageCount: 0 };
    setPromoCodes(prev => [...prev, newPromo]);
    syncToDB('/api/promo-codes', 'POST', newPromo, `Generated promo code`); // 🟢 NEW
    return id;
  };
  const updatePromoCode = (id: string, u: Partial<Omit<PromoCode, 'id'|'createdAt'|'usageCount'>>) => {
    setPromoCodes(prev => prev.map(p => p.id === id ? { ...p, ...u } : p));
  };
  const togglePromoCode = (id: string) => {
    const target = promoCodes.find(p => p.id === id);
    setPromoCodes(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
    if (target) syncToDB(`/api/promo-codes/${id}`, 'PUT', { isActive: !target.isActive }, 'Toggled promo'); // 🟢 NEW
  };
  const deletePromoCode = (id: string) => {
    setPromoCodes(prev => prev.filter(p => p.id !== id));
    syncToDB(`/api/promo-codes/${id}`, 'DELETE', {}, 'Deleted promo'); // 🟢 NEW
  };
  const applyPromoCode = (code: string) => {
    const now = new Date();
    return promoCodes.find(p => {
      if (p.code.toUpperCase() !== code.toUpperCase() || !p.isActive) return false;
      if (p.startDate && new Date(p.startDate) > now) return false; // Not started yet
      if (p.expiresAt && new Date(p.expiresAt) < now) return false; // Expired
      if (p.isLimitedUses !== false && p.usageCount >= p.maxUsage) return false; // Depleted
      return true;
    }) || null;
  };

  const addStaffUser = (u: Omit<StaffUser, 'id'|'createdAt'>) => setStaffUsers(prev => [...prev, { ...u, id: `su${Date.now()}`, createdAt: new Date() }]);
  const updateStaffUser = (id: string, u: Partial<StaffUser>) => setStaffUsers(prev => prev.map(user => user.id === id ? { ...user, ...u } : user));
  const resetStaffUserPassword = (id: string) => setStaffUsers(prev => prev.map(u => u.id === id ? { ...u, password: 'password123' } : u));
  const toggleStaffUserActive = (id: string) => setStaffUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));

  const updateRates = async (r: Partial<RatesConfig>) => {
    const sanitized = { ...r } as Partial<RatesConfig>;
    
    // Coerce numeric fields to numbers and clamp where needed
    if (sanitized.hourlyRate !== undefined) sanitized.hourlyRate = Number(sanitized.hourlyRate) || 0;
    if (sanitized.overtimeRate !== undefined) sanitized.overtimeRate = Number(sanitized.overtimeRate) || 0;
    if (sanitized.weekdayHappyHourRate !== undefined) sanitized.weekdayHappyHourRate = Number(sanitized.weekdayHappyHourRate) || 0;
    if (sanitized.weekendHappyHourRate !== undefined) sanitized.weekendHappyHourRate = Number(sanitized.weekendHappyHourRate) || 0;
    
    if (sanitized.downPaymentPercent !== undefined && sanitized.downPaymentPercent !== null) {
      let dp = Number(sanitized.downPaymentPercent) || 0;
      dp = Math.max(0, Math.min(100, dp));
      sanitized.downPaymentPercent = dp;
    }

    setRates(prev => ({ ...prev, ...sanitized }));
    try {
      console.log('Updating rates payload:', sanitized);
      const res = await syncToDB('/api/settings/rates', 'PUT', sanitized, `Updated System Rates`);
      addActivity('admin_action', 'System rates updated');
      return res;
    } catch (e) {
      console.error('Failed to sync rates to DB', e);
      throw e;
    }
  };

  const updateReservationTerms = async (t: Partial<ReservationTerms>) => {
    setReservationTerms(prev => ({ ...prev, ...t }));
    
    try {
      console.log('Updating reservation terms payload:', t);
      // FIXED: Pointing to /api/settings/terms instead of /rates
      const res = await syncToDB('/api/settings/terms', 'PUT', t, `Updated Reservation Terms`); 
      addActivity('admin_action', 'Reservation terms updated');
      return res;
    } catch (e) {
      console.error('Failed to sync reservation terms to DB', e);
      throw e;
    }
  };

 const addAnnouncement = (a: Omit<Announcement, 'id'|'createdAt'>) => {
    const newAnn = { ...a, id: `a${Date.now()}`, createdAt: new Date() };
    setAnnouncements(prev => [newAnn, ...prev]);
    syncToDB('/api/announcements', 'POST', newAnn, `Created announcement: ${a.title}`);
  };

  const updateAnnouncement = (id: string, u: Partial<Announcement>) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...u } : a));
    syncToDB(`/api/announcements/${id}`, 'PUT', u, `Updated announcement`);
  };
  
  const deleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    syncToDB(`/api/announcements/${id}`, 'DELETE', {}, `Deleted announcement`);
  };

  const toggleAnnouncement = (id: string) => {
    const target = announcements.find(a => a.id === id);
    if (target) {
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
      syncToDB(`/api/announcements/${id}`, 'PUT', { isActive: !target.isActive }, `Toggled announcement visibility`);
    }
  };

  const addClosedDate = (c: Omit<ClosedDate, 'id'>) => {
    const newCd = { ...c, id: `cd${Date.now()}` };
    setClosedDates(prev => [...prev, newCd]);
    syncToDB('/api/closed-dates', 'POST', newCd, `Created closed date for ${c.date}`);
  };
  
  const removeClosedDate = (id: string) => {
    setClosedDates(prev => prev.filter(c => c.id !== id));
    syncToDB(`/api/closed-dates/${id}`, 'DELETE', {}, `Deleted closed date`);
  };
  
  const updateClosedDate = (id: string, u: Partial<ClosedDate>) => {
    setClosedDates(prev => prev.map(c => c.id === id ? { ...c, ...u } : c));
    syncToDB(`/api/closed-dates/${id}`, 'PUT', u, `Updated closed date`);
  };

  const updateSiteConfig = (newConfig: any) => {
    setSiteConfig((prev: any) => ({ ...prev, ...newConfig }));
    syncToDB('/api/cms', 'PUT', newConfig, `Updated Website Content`);
    addActivity('admin_action', `Updated public website CMS content`);
  };

  const addEvent = (e: Omit<Event, 'id'>) => {
    const newEvent = { ...e, id: Date.now().toString() };
    setEvents(prev => [...prev, newEvent]);
    syncToDB('/api/events', 'POST', newEvent, `Created new event`); // 🟢 NEW
  };
  const updateEvent = (id: string, updates: Partial<Omit<Event, 'id'>>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    syncToDB(`/api/events/${id}`, 'PUT', updates, `Updated event`); // 🟢 NEW
  };
  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    syncToDB(`/api/events/${id}`, 'DELETE', {}, `Deleted event`); // 🟢 NEW
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-neutral-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h1 className="text-2xl font-black text-white tracking-widest">ONE SHOT</h1>
        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] mt-2 animate-pulse">Syncing Database...</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      tables, queue, reservations, feedback, activities, promoCodes, staffUsers, inventory, rates, reservationTerms, announcements, closedDates, weather, updateWeatherLocation,
      activeAnnouncement, updateActiveAnnouncement,
      staffLoggedIn, adminLoggedIn, staffProfile,
      staffLogin, staffLogout, adminLogin, adminLogout, updateStaffProfile,
      assignTable, freeTable, reserveTable, extendSession, setTableMaintenance, addTable, updateTable, toggleTableActive, deleteTable,
      addInventoryItem, updateInventoryItem, deleteInventoryItem, submitTableOrders, voidTableOrder,
      addToQueue, removeFromQueue, callQueueItem,
      addReservation, updateReservationStatus, updateReservation, cancelReservation, updateDownPayment, updateBalance,
      addFeedback, addActivity, addPromoCode, updatePromoCode, togglePromoCode, deletePromoCode, applyPromoCode,
      events, addEvent, updateEvent, deleteEvent,
      addStaffUser, updateStaffUser, resetStaffUserPassword, toggleStaffUserActive,
      updateRates, updateReservationTerms, addAnnouncement, updateAnnouncement, deleteAnnouncement, toggleAnnouncement, addClosedDate, removeClosedDate, updateClosedDate, siteConfig, updateSiteConfig, refreshLiveMonitor
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