import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from "../utils/supabase";
// ── Types (Pruned for Customer App) ────────────────────────────
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'maintenance' | 'event';

export type SessionOrder = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export type Session = {
  customerName: string;
  startTime: Date;
  durationMinutes: number | null; 
  isOpenTime: boolean; 
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

export type QueueItem = {
  id: string; customerName: string; contactNumber: string; partySize: number; arrivalTime: Date; notes?: string; status: 'waiting' | 'called' | 'seated'; queueNumber: number; prioritySource?: 'reservation';
};

export type ReservationStatus = 'pending' | 'confirmed' | 'checked-in' | 'completed' | 'cancelled';

export type Reservation = {
  id: string; customerName: string; contactNumber: string; email?: string; date: Date; timeSlot: string; durationHours: number; partySize: number; tableId?: string; status: ReservationStatus; totalAmount: number; downPaymentAmount: number; downPaymentPaid: boolean; balancePaid: boolean; createdAt: Date; cancellationReason?: string; promoCode?: string; discountAmount?: number; paymentRef?: string; receiptImg?: string;
};

export type Feedback = {
  id: string; customerName: string; contactInfo?: string; rating: number; feedbackType?: 'suggestion' | 'complaint' | 'lost_item' | 'compliment' | 'other'; comment: string; date: Date; reservationId?: string; tags: string[];
};

export type PromoCode = {
  id: string; code: string; discountPercent: number; description: string; isActive: boolean; maxUsage: number; usageCount: number; startDate?: Date; expiresAt?: Date; createdAt: Date;
};

export type Event = {
  id: string; title: string; date: string; type: string; description: string; registrationLink?: string; maxParticipants?: number; slotsFull?: boolean; attachments?: string[]; promoCodeId?: string;
  allowReservations?: boolean;
  caterWalkIns?: boolean;
  walkInTableCount?: number;
};

export type RatesConfig = {
  hourlyRate: number; overtimeRate: number; downPaymentPercent: number;
  bookingCutoffMinutes: number; weekdayStartTime: string; weekdayEndTime: string; isWeekdayHappyHourActive: boolean; weekdayHappyHourRate: number; weekdayHappyHourStart: string; weekdayHappyHourEnd: string; weekdayOnlineCapacityLimit: number;
  weekendStartTime: string; weekendEndTime: string; isWeekendHappyHourActive: boolean; weekendHappyHourRate: number; weekendHappyHourStart: string; weekendHappyHourEnd: string; weekendOnlineCapacityLimit: number;
};

export type ReservationTerms = {
  minHours: number; maxHours: number; cancellationHours: number; advanceBookingHours: number; cancellationPolicy: string; termsAndConditions: string;
  weekdayMinPartySize: number; weekdayMaxPartySize: number;
  weekendMinPartySize: number; weekendMaxPartySize: number;
};

export type AnnouncementType = 'info' | 'warning' | 'promo' | 'event';
export type Announcement = {
  id: string; title: string; content: string; type: AnnouncementType; isActive: boolean; createdAt: Date; expiresAt?: Date;
};

export type ClosedDate = {
  id: string; date: string; reason: string; isFullDay: boolean; openTime?: string; closeTime?: string; type?: 'specific' | 'weekly'; dayOfWeek?: number; 
};

export type WeatherData = {
  temp: number; condition: string; isRaining: boolean; code: number; locationName: string;
};

export const HOURLY_RATE = 0;
export const DOWN_PAYMENT_RATE = 0;

export const generateRandomPromoCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

type AppContextType = {
  tables: Table[]; 
  queue: QueueItem[]; 
  reservations: Reservation[]; 
  promoCodes: PromoCode[]; 
  rates: RatesConfig; 
  reservationTerms: ReservationTerms; 
  announcements: Announcement[]; 
  closedDates: ClosedDate[]; 
  weather: WeatherData | null; 
  events: Event[];
  siteConfig: any;
  activeAnnouncement: string; 
  
  updateWeatherLocation: (lat: string, lon: string, name: string) => void;
  updateActiveAnnouncement: (msg: string) => void;
  addReservation: (i: Omit<Reservation, 'id'|'createdAt'>) => string; 
  addFeedback: (i: Omit<Feedback, 'id'|'date'>) => void; 
  applyPromoCode: (c: string) => PromoCode | null;
  refreshLiveMonitor: () => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);

  const [tables, setTables] = useState<Table[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [rates, setRates] = useState<RatesConfig>({ hourlyRate: 0, overtimeRate: 0, downPaymentPercent: 0, weekdayStartTime: '', weekdayEndTime: '', isWeekdayHappyHourActive: false, weekdayHappyHourRate: 0, weekdayHappyHourStart: '', weekdayHappyHourEnd: '', weekdayOnlineCapacityLimit: 0, weekendStartTime: '', weekendEndTime: '', isWeekendHappyHourActive: false, weekendHappyHourRate: 0, weekendHappyHourStart: '', weekendHappyHourEnd: '', weekendOnlineCapacityLimit: 0, bookingCutoffMinutes: 60 });
  const [reservationTerms, setReservationTerms] = useState<ReservationTerms>({ minHours: 0, maxHours: 0, cancellationHours: 0, advanceBookingHours: 1, cancellationPolicy: '', termsAndConditions: '', weekdayMinPartySize: 0, weekdayMaxPartySize: 0, weekendMinPartySize: 0, weekendMaxPartySize: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherConfig, setWeatherConfig] = useState({ lat: '', lon: '', name: '' });
  const [activeAnnouncement, setActiveAnnouncement] = useState("");
  const updateActiveAnnouncement = (msg: string) => setActiveAnnouncement(msg);
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const updateWeatherLocation = useCallback((lat: string, lon: string, name: string) => { setWeatherConfig({ lat, lon, name }); }, []);

  const refreshLiveMonitor = async () => {
    try {
      const [ { data: newTables }, { data: newQueue } ] = await Promise.all([
        supabase.from('tables').select('*'),
        supabase.from('queue').select('*')
      ]);
      
      if (newTables) {
        setTables(prev => JSON.stringify(prev) !== JSON.stringify(newTables) ? newTables as Table[] : prev);
      }
      if (newQueue) {
        setQueue(prev => JSON.stringify(prev) !== JSON.stringify(newQueue) ? newQueue as QueueItem[] : prev);
      }
    } catch (error) {
      console.error("Live Monitor Refresh Error:", error);
    }
  };

  useEffect(() => {
    const fetchSupabaseData = async () => {
      try {
        const [
          { data: tablesData },
          { data: resData },
          { data: queueData },
          { data: annData },
          { data: cmsData },
          { data: closedDatesData },
          { data: promoData },
          { data: eventsData }
        ] = await Promise.all([
          supabase.from('tables').select('*'),
          supabase.from('reservations').select('*'),
          supabase.from('queue').select('*'),
          supabase.from('announcements').select('*'),
          supabase.from('cms').select('*'),
          supabase.from('closed_dates').select('*'),
          supabase.from('promo_codes').select('*'),
          supabase.from('events').select('*')
        ]);
        
        if (tablesData) setTables(tablesData as Table[]);
        if (resData) setReservations(resData as Reservation[]);
        if (queueData) setQueue(queueData as QueueItem[]);
        if (annData) setAnnouncements(annData as Announcement[]);
        if (closedDatesData) setClosedDates(closedDatesData as ClosedDate[]);
        if (promoData) setPromoCodes(promoData as PromoCode[]);
        
        if (eventsData) {
          setEvents(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const newEvents = (eventsData as Event[]).filter(e => !existingIds.has(e.id));
            return [...prev, ...newEvents];
          });
        }

        if (cmsData) {
          // Transform CMS Key-Value rows into a single config object
          const configObj = cmsData.reduce((acc: any, curr: any) => {
            acc[curr.keyName] = curr.settingValue;
            return acc;
          }, {});
          setSiteConfig(configObj);
        }

      } catch (err) {
        console.error("Failed to sync with Supabase:", err);
      } finally { 
        setTimeout(() => setIsInitializing(false), 800); 
      }
    };
    fetchSupabaseData();
  }, []);

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
      } catch (err) { }
    };
    fetchWeather();
  }, [weatherConfig]);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${currentYear}/PH`);
        if (!res.ok) return;
        const data = await res.json();
        const fetchedHolidays: Event[] = data.map((item: any) => ({
          id: `hol_${item.date}`, title: item.name, date: item.date, type: 'Holiday', description: `Nationwide Public Holiday. ML predicts high walk-in traffic and extended play duration.`,
        }));
        setEvents(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newHolidays = fetchedHolidays.filter(h => !existingIds.has(h.id));
          return [...prev, ...newHolidays];
        });
      } catch (err) {}
    };
    fetchHolidays();
  }, []);

  const addReservation = (i: Omit<Reservation, 'id'|'createdAt'>): string => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRes = { ...i, id, createdAt: new Date() };
    
    // 1. Optimistic UI update (keeps the frontend feeling instantly fast)
    setReservations(prev => [...prev, newRes as Reservation]);
    
    // 2. Sanitize the payload for strict PostgreSQL compatibility
    const supabasePayload = {
      ...newRes,
      // Convert raw Date objects to ISO strings
      date: newRes.date.toISOString(), 
      createdAt: newRes.createdAt.toISOString(),
      // Convert TypeScript booleans to SQLite-legacy Integers
      downPaymentPaid: newRes.downPaymentPaid ? 1 : 0,
      balancePaid: newRes.balancePaid ? 1 : 0,
      // Strip the temporary browser 'blob:' URL so it doesn't crash the BYTEA column
      receiptImg: null 
    };

    // 3. Fire and forget Supabase insert
    supabase.from('reservations').insert([supabasePayload]).then(({ error }) => {
      if (error) {
        console.error("Error inserting reservation to Supabase:", error);
      } else {
        console.log("Successfully saved to Supabase!");
      }
    });
    
    return id;
  };

  const addFeedback = (i: Omit<Feedback, 'id'|'date'>) => {
    const newFeedback = { ...i, id: `f${Date.now()}`, date: new Date() };
    
    // Optimistic UI update
    setFeedback(prev => [newFeedback as Feedback, ...prev]);
    
    // Fire and forget Supabase insert
    supabase.from('feedback').insert([newFeedback]).then(({ error }) => {
      if (error) console.error("Error inserting feedback to Supabase:", error);
    });
  };

  const applyPromoCode = (code: string) => {
    const now = new Date();
    return promoCodes.find(p => {
      if (p.code.toUpperCase() !== code.toUpperCase() || !p.isActive) return false;
      if (p.startDate && new Date(p.startDate) > now) return false; 
      if (p.expiresAt && new Date(p.expiresAt) < now) return false; 
      if (p.isLimitedUses !== false && p.usageCount >= p.maxUsage) return false; 
      return true;
    }) || null;
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-neutral-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h1 className="text-2xl font-black text-white tracking-widest">ONE SHOT</h1>
        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] mt-2 animate-pulse">Loading Application...</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      tables, queue, reservations, promoCodes, rates, reservationTerms, announcements, closedDates, weather, updateWeatherLocation,
      activeAnnouncement, updateActiveAnnouncement, siteConfig, events,
      addReservation, addFeedback, applyPromoCode, refreshLiveMonitor
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