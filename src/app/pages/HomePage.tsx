import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../utils/supabase';
// import ReCAPTCHA from 'react-google-recaptcha'; // 🟢 Commented out for now
import { addMinutes, differenceInSeconds, format, isToday, isBefore, startOfDay, isSameDay } from 'date-fns';
import {
  ChevronLeft, ChevronRight, X, Phone, MapPin,
  Clock, LogIn, UserPlus, Eye, EyeOff,
  Calendar, CheckCircle, ArrowRight, Users, ChevronDown,
  Megaphone, Info, Shield, Award, Mail, Tag, BookOpen,
  Sparkles, Upload, Search, ExternalLink, ImageIcon, AlertTriangle, XCircle, Bell, RefreshCw, Lock,
  Table2, DollarSign
} from 'lucide-react';
import { useAppContext, HOURLY_RATE, DOWN_PAYMENT_RATE } from '../context/AppContext';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

import logoImg from 'figma:asset/40eb82831843e17a3c48a360fd80f0aaaa58ddc8.png';
import heroImg1 from 'figma:asset/15fb8dcab89448c8f2ad20fb9946631b1c246968.png';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const todayStart = startOfDay(new Date());

type Section = 'home' | 'reservations' | 'rates' | 'events' | 'about' | 'feedback';

const QR_GCASH = [
  [1,1,1,0,1,0,1,0,0,1,1,1,1,0,1,1,1],
  [1,0,1,0,1,1,0,1,0,0,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,1,1,0,1,0,1,1,0,1,0,1],
  [1,0,1,0,1,1,0,0,1,1,1,0,1,0,1,0,1],
  [1,1,1,0,0,1,1,0,1,0,0,1,1,1,1,1,1],
  [0,0,0,0,1,0,1,0,0,1,0,0,0,0,0,0,0],
  [1,1,0,1,0,0,1,1,1,0,1,0,1,0,1,1,0],
  [0,1,0,0,1,0,0,0,1,0,0,1,0,1,1,0,1],
  [1,0,1,1,0,1,1,0,1,0,1,0,1,1,0,1,0],
  [0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1,0],
  [1,1,1,0,1,0,1,1,0,1,1,0,1,1,1,0,1],
  [1,0,1,0,0,1,0,1,0,0,0,1,0,1,0,1,0],
  [1,0,1,0,1,0,1,0,1,1,0,0,1,0,1,0,1],
  [1,0,1,0,0,1,0,1,0,0,1,0,0,0,1,1,0],
  [1,1,1,0,1,1,1,0,1,1,0,1,1,0,1,1,1],
  [0,0,0,0,1,0,0,1,0,0,1,0,0,1,0,1,0],
  [1,0,1,1,0,1,1,0,1,0,0,1,0,0,1,0,1],
];

function QRDisplay({ pattern, color }: { pattern: number[][], color: string }) {
  return (
    <div className="bg-white p-3 rounded-xl inline-block">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pattern[0].length}, 1fr)`, gap: '1px', width: 136, height: 136 }}>
        {pattern.flatMap((row, ri) =>
          row.map((cell, ci) => (
            <div key={`${ri}-${ci}`} style={{ backgroundColor: cell ? color : 'white', borderRadius: 1 }} />
          ))
        )}
      </div>
    </div>
  );
}

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

  const isPast = (date: Date) => date < today;
  const isSelected = (date: Date) => selectedDate ? date.getTime() === (() => { const s = new Date(selectedDate); s.setHours(0,0,0,0); return s.getTime(); })() : false;
  const isTodayDate = (date: Date) => date.getTime() === today.getTime();

  return (
    <div className="bg-transparent rounded-2xl select-none">
      <div className="flex items-center justify-between mb-4 px-1">
        <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1))} className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"><ChevronLeft size={16} /></button>
        <span className="text-xs font-bold text-white">{MONTHS[month]} {year}</span>
        <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1))} className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {DAYS_OF_WEEK.map(d => <div key={d} className="text-center text-[8px] text-neutral-500 font-bold uppercase tracking-widest">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map(({ day, currentMonth, date }, idx) => {
          const past = isPast(date); 
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

export function HomePage() {
  const navigate = useNavigate();
  const { siteConfig, isSystemOffline, announcements, tables, queue, reservations, events, closedDates, reservationTerms, rates, addReservation, cancelReservation, updateReservation, addFeedback, applyPromoCode, adminLogin, staffLogin, acknowledgeRefund, validateBookingPreflight } = useAppContext() as any;

  // 🟢 SUPABASE REAL-TIME AUTH LISTENER
  const [activeUser, setActiveUser] = useState<{ name: string; email: string; } | null>(null);

  useEffect(() => {
    // 1. Fetch current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setActiveUser({ name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User', email: session.user.email || '' });
      }
    });

    // 2. Listen for live login/logout events (Removes the need for page reloads)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setActiveUser({ name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User', email: session.user.email || '' });
      } else {
        setActiveUser(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const currentUser = activeUser; // Alias to safely pass the live user data to the rest of the file

  const [readAnnouncements, setReadAnnouncements] = useState<string[]>([]);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  const [closureAlert, setClosureAlert] = useState<{ date: Date, reason: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('oneshot_read_announcements');
    if (stored) {
      try { setReadAnnouncements(JSON.parse(stored)); } catch(e) {}
    }
    const visited = localStorage.getItem('oneshot_visited');
    if (!visited) {
      setIsFirstTime(true);
      localStorage.setItem('oneshot_visited', 'true');
    }
  }, []);

  const activeAnnouncements = announcements?.filter((a: any) => a.isActive && (!a.expiresAt || new Date(a.expiresAt) > new Date())) || [];
  
  const userReservations = currentUser 
    ? reservations.filter((r: any) => r.email && r.email.toLowerCase() === currentUser.email.toLowerCase()) 
    : [];
  const resNotifications = userReservations.map((r: any) => ({
    id: `notif_${r.id}_${r.status}`,
    type: 'Reservation Update',
    title: `Booking ${r.status.toUpperCase()}`,
    content: `Your reservation for ${format(new Date(r.date), 'MMM d, yyyy')} is currently marked as ${r.status}.`,
    createdAt: r.createdAt
  }));

  const allNotifications = [...activeAnnouncements, ...resNotifications].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const hasUnread = isFirstTime || allNotifications.some((n: any) => !readAnnouncements.includes(n.id));

  const markAsRead = (id: string) => {
    const newRead = [...readAnnouncements, id];
    setReadAnnouncements(newRead);
    localStorage.setItem('oneshot_read_announcements', JSON.stringify(newRead));
    if (isFirstTime) setIsFirstTime(false);
  };

  const markAllAsRead = () => {
    const ids = allNotifications.map((n: any) => n.id);
    setReadAnnouncements(ids);
    localStorage.setItem('oneshot_read_announcements', JSON.stringify(ids));
    setIsFirstTime(false);
  };

  const getOpenHoursDisplay = () => {
    try {
      const currentDay = new Date().getDay();
      const isWeekend = currentDay === 0 || currentDay === 5 || currentDay === 6; 
      const openTime = isWeekend ? (rates?.weekendStartTime || '12:00') : (rates?.weekdayStartTime || '12:00');
      const closeTime = isWeekend ? (rates?.weekendEndTime || '02:00') : (rates?.weekdayEndTime || '02:00');

      const parseMins = (t: string) => { const [h, m] = (t || '0').split(':').map(Number); return h * 60 + (m || 0); };
      const start = parseMins(openTime);
      let end = parseMins(closeTime);
      if (end <= start) end += 24 * 60;
      
      return `${Math.floor((end - start) / 60)}+`;
    } catch (e) {
      return '15+';
    }
  };
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);
  const [heroSlideDir, setHeroSlideDir] = useState<1 | -1>(1);
  const [now, setNow] = useState(new Date());
  const [activeSection, setActiveSection] = useState<Section>('home');

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'options' | 'login' | 'register' | 'forgot'>('options');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRegPromoModal, setShowRegPromoModal] = useState(false);

  // 🟢 NET TRUST SCORE ALGORITHM
  const completedBookings = userReservations.filter((r: any) => r.status === 'completed').length;
  const missedBookings = userReservations.filter((r: any) => r.status === 'walkout' || r.status === 'cancelled').length;
  const netTrustScore = completedBookings - missedBookings;
  const isTrustedCustomer = netTrustScore >= 3;

  const totalHoursPlayed = userReservations
    .filter((r: any) => r.status === 'completed')
    .reduce((sum: number, r: any) => sum + (r.durationHours || 0), 0);
  // 🟢 THRESHOLD CAP: Waiver is revoked if they book more than 3 hours
  const isDownPaymentWaived = isTrustedCustomer && resForm.duration <= 3;

  useEffect(() => {
    if (activeSection === 'reservations' && !currentUser) {
      const seen = localStorage.getItem('oneshot_reg_promo_seen');
      if (!seen) {
        setShowRegPromoModal(true);
        localStorage.setItem('oneshot_reg_promo_seen', 'true');
      }
    }
  }, [activeSection, currentUser]);

  const [loginForm, setLoginForm] = useState({ email: '', password: '', showPw: false, error: '', loading: false });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', showPw: false, error: '', loading: false });
  const [forgotForm, setForgotForm] = useState({ email: '', error: '', success: false, loading: false });

  // 🟢 SUPABASE AUTH HANDLERS
  const handleOAuthLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    if (error) alert(`${provider} login error: ` + error.message);
  };

  const handleLoginSubmit = async () => {
    if (!loginForm.email || !loginForm.password) return setLoginForm(f => ({ ...f, error: 'Please fill all fields.' }));
    setLoginForm(f => ({ ...f, loading: true, error: '' }));
    const { error } = await supabase.auth.signInWithPassword({ email: loginForm.email, password: loginForm.password });
    if (error) {
      setLoginForm(f => ({ ...f, error: error.message, loading: false }));
    } else {
      setShowAuthModal(false);
      setLoginForm({ email: '', password: '', showPw: false, error: '', loading: false });
    }
  };

  const handleRegisterSubmit = async () => {
    if (!registerForm.name || !registerForm.email || !registerForm.phone || !registerForm.password) return setRegisterForm(f => ({ ...f, error: 'Please fill all required fields.' }));
    if (registerForm.password !== registerForm.confirm) return setRegisterForm(f => ({ ...f, error: 'Passwords do not match.' }));
    
    // 🟢 PASSWORD VALIDATOR: 8 Characters Minimum ONLY
    if (registerForm.password.length < 8) return setRegisterForm(f => ({ ...f, error: 'Password must be at least 8 characters long.' }));
    
    setRegisterForm(f => ({ ...f, loading: true, error: '' }));
    const { error } = await supabase.auth.signUp({
      email: registerForm.email,
      password: registerForm.password,
      options: { data: { full_name: registerForm.name, phone: registerForm.phone } }
    });
    
    if (error) {
      setRegisterForm(f => ({ ...f, error: error.message, loading: false }));
    } else {
      setShowAuthModal(false);
      setRegisterForm({ name: '', email: '', phone: '', password: '', confirm: '', showPw: false, error: '', loading: false });
      alert("Registration successful! You are now logged in.");
    }
  };

  const handleForgotSubmit = async () => {
    if (!forgotForm.email) return setForgotForm(f => ({ ...f, error: 'Please enter your email.' }));
    setForgotForm(f => ({ ...f, loading: true, error: '' }));
    const { error } = await supabase.auth.resetPasswordForEmail(forgotForm.email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) {
      setForgotForm(f => ({ ...f, error: error.message, loading: false }));
    } else {
      setForgotForm(f => ({ ...f, success: true, loading: false }));
    }
  };

  const [reservationStep, setReservationStep] = useState<0 | 1 | 2 | 3>(0);
  const [resTab, setResTab] = useState<'new' | 'track'>('new');
  const [trackForm, setTrackForm] = useState({ reservationId: '', phone: '' });
  const [trackedReservations, setTrackedReservations] = useState<any[] | null>(null);
  const [generatedResId, setGeneratedResId] = useState('');
  
  // 🟢 NEW: Two-Panel UI States
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // 🟢 FIXED: `resForm` now correctly holds all input values to prevent "form is not defined"
  const [resForm, setResForm] = useState({ 
    name: '', email: '', phone: '', pax: 2, timeSlot: '', duration: 2,
    paymentMethod: 'gcash' as 'gcash' | 'cash', paymentRef: ''
  });
  
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleData, setRescheduleData] = useState<{ date: Date | null; timeSlot: string }>({ date: null, timeSlot: '' });

  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [receiptImg, setReceiptImg] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [feedbackForm, setFeedbackForm] = useState({ name: '', contact: '', type: '', customType: '', message: '', reservationId: '' });
  const [feedbackSent, setFeedbackSent] = useState(false);

  let heroSlides = [{ src: heroImg1, alt: 'One Shot Facility' }];
  try {
    const parsedImages = typeof siteConfig?.heroImages === 'string' ? JSON.parse(siteConfig.heroImages) : siteConfig?.heroImages;
    if (Array.isArray(parsedImages) && parsedImages.length > 0) {
      heroSlides = parsedImages.map((url: string) => {
        const isLocalUrl = url.includes('localhost');
        const isVercel = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
        return { 
          src: (isVercel && isLocalUrl) ? 'https://images.unsplash.com/photo-1761335633357-04fab36b333f?q=80' : url, 
          alt: 'One Shot Facility View' 
        };
      });
    }
  } catch (e) {}

  const cmsAboutImage = siteConfig?.aboutImage || "https://images.unsplash.com/photo-1761335633357-04fab36b333f?q=80";
  const isVercelEnvironment = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
  const safeAboutImage = (isVercelEnvironment && cmsAboutImage.includes('localhost')) 
    ? "https://images.unsplash.com/photo-1761335633357-04fab36b333f?q=80" 
    : cmsAboutImage;

  const cms = {
    heroTitle: siteConfig?.heroTitle || 'One Shot',
    heroSubtitle: siteConfig?.heroSubtitle || 'Bar & Billiards',
    heroDescription: siteConfig?.heroDescription || 'Your premier billiard destination at Autobase OAX, Cainta, Rizal.',
    aboutTitle: siteConfig?.aboutTitle || 'A Passion for the Game',
    aboutP1: siteConfig?.aboutP1 || 'One Shot Bar & Billiards was founded with a simple mission: to create the ultimate billiard experience in Cainta, Rizal.',
    aboutP2: siteConfig?.aboutP2 || 'Our 10 tournament-grade tables are maintained with precision, and our staff are passionate players themselves.',
    aboutP3: siteConfig?.aboutP3 || 'Whether you are a seasoned champion or picking up a cue for the first time, One Shot welcomes you.',
    aboutImage: safeAboutImage,
    address: siteConfig?.address || 'Autobase OAX, San Juan, Cainta, Rizal 1900',
    phone: siteConfig?.phone || '0917-123-4567 | 0998-765-4321',
    email: siteConfig?.email || 'oneshot.billiards@gmail.com',
    facebook: siteConfig?.facebook || '@OneShotBilliards',
    instagram: siteConfig?.instagram || '@oneshot_billiards',
    tiktok: siteConfig?.tiktok || '@oneshotbilliards',
  };

  useEffect(() => {
    if (heroSlides.length > 0) {
      const interval = setInterval(() => {
        setHeroSlideDir(1);
        setHeroSlideIdx(prev => (prev + 1) % heroSlides.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [heroSlides.length]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (reservations.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const emailResId = params.get('resId');
      
      if (emailResId) {
        setActiveSection('reservations');
        setResTab('track');
        setTrackForm({ reservationId: emailResId, phone: '' });
        
        const found = reservations
          .filter((r: any) => r.id.toUpperCase() === emailResId.toUpperCase())
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        if (found.length > 0) {
          setTrackedReservations(found);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [reservations.length]);

  useEffect(() => {
    if (currentUser) {
      setResForm(f => ({ ...f, name: currentUser.name, email: currentUser.email }));
      setResTab('track');
    }
  }, [currentUser]);

  useEffect(() => {
    setAgreedToTerms(false);
  }, [selectedDate]);

  const RES_DRAFT_KEY = 'oneshot_reservation_draft_v1';

  const saveReservationDraft = useCallback(() => {
    try {
      const draft = {
        selectedDate: selectedDate ? selectedDate.toISOString() : null,
        selectedTableId,
        resForm,
        promoCodeInput,
        appliedPromo,
        resTab,
        reservationStep
      };
      localStorage.setItem(RES_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) { console.warn('Failed to save draft', e); }
  }, [selectedDate, selectedTableId, resForm, promoCodeInput, appliedPromo, resTab, reservationStep]);

  const loadReservationDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(RES_DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.selectedDate) setSelectedDate(new Date(d.selectedDate));
      if (d.selectedTableId) setSelectedTableId(d.selectedTableId);
      if (d.resForm) setResForm(prev => ({ ...prev, ...(d.resForm || {}) }));
      if (d.promoCodeInput) setPromoCodeInput(d.promoCodeInput);
      if (d.appliedPromo) setAppliedPromo(d.appliedPromo);
      if (d.resTab) setResTab(d.resTab);
      if (d.reservationStep !== undefined) setReservationStep(d.reservationStep);
    } catch (e) { console.warn('Failed to load draft', e); }
  }, []);

  useEffect(() => {
    loadReservationDraft();
  }, [loadReservationDraft]);

  useEffect(() => {
    saveReservationDraft();
  }, [saveReservationDraft]);

  const effectiveHourly = (rates && Number(rates.hourlyRate) > 0) ? Number(rates.hourlyRate) : HOURLY_RATE;
  const baseAmount = Number(resForm.duration) * effectiveHourly;
  const discountAmount = appliedPromo ? Math.floor(baseAmount * appliedPromo.discountPercent / 100) : 0;
  const totalAmount = baseAmount - discountAmount;
  const downPaymentPercentVal = rates && Number(rates.downPaymentPercent) >= 0 ? Number(rates.downPaymentPercent) : DOWN_PAYMENT_RATE * 100;
  const downPayment = Math.ceil(totalAmount * (downPaymentPercentVal ? downPaymentPercentVal / 100 : DOWN_PAYMENT_RATE));

  
  const handleApplyPromo = () => {
    if (!promoCodeInput.trim()) return;
    const promo = applyPromoCode(promoCodeInput.trim());
    if (promo) {
      setAppliedPromo({ code: promo.code, discountPercent: promo.discountPercent });
      setPromoError('');
    } else {
      setPromoError('Invalid or expired promo code.');
      setAppliedPromo(null);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setPromoError('');
  };

  const getMaxDuration = () => {
    if (!resForm.timeSlot) return reservationTerms?.maxHours || 6;

    const parseToMins = (t: string) => {
      const [hh = '0', mm = '0'] = (t || '').split(':');
      const h = Number(hh);
      const m = Number(mm || 0);
      return h * 60 + m;
    };

    const slotMins = parseToMins(resForm.timeSlot);
    const startMins = parseToMins(rates?.reservationStartTime || '12:00');
    let endMins = parseToMins(rates?.reservationEndTime || '02:00');

    if (endMins <= startMins) endMins += 24 * 60;

    let normalizedSlotMins = slotMins;
    if (slotMins < startMins) normalizedSlotMins += 24 * 60;

    const minsUntilClose = endMins - normalizedSlotMins;
    const hoursUntilClose = Math.floor(minsUntilClose / 60);
    const maxAllowed = reservationTerms?.maxHours || 6;

    return Math.max(1, Math.min(hoursUntilClose, maxAllowed));
  };

  const maxAllowedDuration = getMaxDuration();

  const maxAllowedPartySize = (() => {
    const wDayMax = Number(reservationTerms?.weekdayMaxPartySize) || 20;
    const wEndMax = Number(reservationTerms?.weekendMaxPartySize) || 20;
    if (!selectedDate) return Math.max(wDayMax, wEndMax);
    const d = new Date(selectedDate);
    const isWeekend = d.getDay() === 0 || d.getDay() === 5 || d.getDay() === 6;
    return isWeekend ? wEndMax : wDayMax;
  })();

  useEffect(() => {
    if (resForm.pax > maxAllowedPartySize) {
      setResForm(f => ({ ...f, pax: maxAllowedPartySize }));
    }
  }, [maxAllowedPartySize, selectedDate]);

  const fmt12 = (tOrMins: string | number) => {
    try {
      let mins: number;
      if (typeof tOrMins === 'number') mins = tOrMins;
      else {
        const [hh = '0', mm = '0'] = (tOrMins || '').split(':');
        mins = Number(hh) * 60 + Number(mm || 0);
      }
      const m = ((mins % (24 * 60)) + (24 * 60)) % (24 * 60);
      let hh = Math.floor(m / 60);
      const mm = m % 60;
      const period = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12;
      if (hh === 0) hh = 12;
      return `${hh}:${String(mm).padStart(2, '0')} ${period}`;
    } catch (e) { return String(tOrMins); }
  };

  const bookingHoursDisplay = (() => {
    try {
      const start = rates?.reservationStartTime || '12:00';
      const end = rates?.reservationEndTime || '02:00';
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);

      let startMins = sh * 60 + (sm || 0);
      let endMins = eh * 60 + (em || 0);
      if (endMins <= startMins) endMins += 24 * 60;

      const cutoffMins = endMins - 60; 
      if (cutoffMins <= startMins) return 'No online bookings';

      const startDisplay = fmt12(start);
      return `${startDisplay} to ${fmt12(cutoffMins)}`;
    } catch (e) {
      return `${rates?.reservationStartTime || '12:00'} to ${rates?.reservationEndTime || '02:00'}`;
    }
  })();

  useEffect(() => {
    if (resForm.duration > maxAllowedDuration) {
      setResForm(f => ({ ...f, duration: maxAllowedDuration }));
    }
  }, [maxAllowedDuration, resForm.timeSlot]);

  // 🟢 NEW: Strict Table Validation Logic
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
      if (slotMins < nowMins + 60) return 'advance';
    }

    const startReserveMins = parseToMins(rates?.reservationStartTime || '12:00');
    let endReserveMins = parseToMins(rates?.reservationEndTime || '02:00');
    if (endReserveMins <= startReserveMins) endReserveMins += 24 * 60;

    let normalizedSlot = slotMins;
    if (slotMins < startReserveMins) normalizedSlot += 24 * 60;

    if (normalizedSlot < startReserveMins || normalizedSlot >= endReserveMins) return 'closed';

    const isSlotWeekend = [0, 5, 6].includes(requestedStart.getDay());
    const isHHActive = isSlotWeekend ? rates?.isWeekendHappyHourActive : rates?.isWeekdayHappyHourActive;
    
    if (isHHActive) {
      const hhStart = isSlotWeekend ? rates?.weekendHappyHourStart : rates?.weekdayHappyHourStart;
      const hhEnd = isSlotWeekend ? rates?.weekendHappyHourEnd : rates?.weekdayHappyHourEnd;
      const s = parseToMins(hhStart || '18:00');
      const e = parseToMins(hhEnd || '19:00');
      let slotNorm = slotMins;
      if (slotMins < s) slotNorm += 24 * 60;
      if (slotNorm >= s && slotNorm < (e <= s ? e + 24 * 60 : e)) return 'happyhour';
    }

    const sameDayEvents = events.filter((e: any) => {
      if (e.allowReservations !== false) return false;
      if (!e.date) return false;
      const eventDates = e.date.split(',').map((d: string) => d.trim());
      return eventDates.includes(format(requestedStart, 'yyyy-MM-dd'));
    });

    for (const ev of sameDayEvents) {
      if (ev.duration === 'Whole Day') return 'event_blocked';
      const [eStartStr, eEndStr] = ev.duration?.split(' - ') || [];
      if (eStartStr && eEndStr) {
        const eStartMins = parseToMins(eStartStr.trim());
        let eEndMins = parseToMins(eEndStr.trim());
        if (eEndMins <= eStartMins) eEndMins += 24 * 60;
        let reqStartMins = slotMins;
        let reqEndMins = slotMins + (duration * 60);
        if (reqStartMins < eEndMins && reqEndMins > eStartMins) return 'event_blocked';
      }
    }

    // 🟢 Strict Check 1: Existing Reservations on this Specific Table
    let tableOverlapCount = 0;
    const sameTableRes = reservations.filter((r: any) => 
      r.tableId === selectedTableId && 
      r.status !== 'cancelled' && 
      r.status !== 'completed' && 
      isSameDay(new Date(r.date), requestedStart)
    );

    sameTableRes.forEach((r: any) => {
      const rStart = new Date(r.date);
      const [rH, rM] = r.timeSlot.split(':').map(Number);
      rStart.setHours(rH, rM, 0, 0); // Reconstruct exact time
      const rEnd = addMinutes(rStart, r.durationHours * 60);
      if (requestedStart < rEnd && requestedEnd > rStart) tableOverlapCount++;
    });

    if (tableOverlapCount > 0) return 'table_conflict';

    // 🟢 Strict Check 2: Live Active Walk-In on this Specific Table
    if (isToday(requestedStart)) {
      const targetTable = tables.find((t: any) => t.id === selectedTableId);
      if (targetTable?.status === 'occupied' && targetTable.session?.startTime && targetTable.session?.durationMinutes) {
         const sessionEnd = addMinutes(new Date(targetTable.session.startTime), targetTable.session.durationMinutes);
         if (requestedStart < sessionEnd) return 'active_conflict';
      }
    }

    return 'valid';
  };
  
  const timeValidation = validateTimeSlot(resForm.timeSlot, resForm.duration);

  const [isVerifying, setIsVerifying] = useState(false);

  const handleReservationSubmit = async () => {
    if (!resForm.name || !resForm.phone || !selectedDate || !selectedTableId || !resForm.timeSlot || timeValidation !== 'valid') return;
    setIsVerifying(true);
    
    setTimeout(() => {
      setReservationStep(2);
      setIsVerifying(false);
    }, 600);
  };

  const handlePaymentConfirm = async () => {
    setConfirmingPayment(true);
    
    try {
      let finalReceiptUrl = null;

      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('oneshot-assets').upload(fileName, receiptFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('oneshot-assets').getPublicUrl(fileName);
        finalReceiptUrl = publicUrlData.publicUrl;
      }

      const reservationDate = new Date(selectedDate!);
      const [hours, minutes] = resForm.timeSlot.split(':').map(Number);
      reservationDate.setHours(hours, minutes, 0, 0);

      const newId = addReservation({
        customerName: resForm.name,
        contactNumber: resForm.phone,
        email: resForm.email,
        date: reservationDate,
        timeSlot: resForm.timeSlot,
        durationHours: resForm.duration,
        partySize: resForm.pax,
        tableId: selectedTableId, 
        // 🟢 WAIVER LOGIC APPLIED HERE
        status: isDownPaymentWaived ? 'confirmed' : 'pending',
        totalAmount,
        downPaymentAmount: isDownPaymentWaived ? 0 : downPayment,
        downPaymentPaid: isDownPaymentWaived ? true : !!finalReceiptUrl,
        balancePaid: false,
        paymentRef: isDownPaymentWaived ? 'TRUSTED_WAIVER' : 'GCASH_UPLOAD',
        promoCode: appliedPromo?.code,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        receiptImg: finalReceiptUrl || undefined,
      });

      setGeneratedResId(newId || Math.random().toString(36).substring(2, 8).toUpperCase());
      setConfirmingPayment(false);
      try { localStorage.removeItem(RES_DRAFT_KEY); } catch (e) {}
      setReservationStep(3);

    } catch (error) {
      console.error("Payment Confirmation Error:", error);
      alert("Failed to upload receipt. Please try again.");
      setConfirmingPayment(false);
    }
  };

  const closeReservation = () => {
    saveReservationDraft();
    setReservationStep(0);
    setAgreedToTerms(false);
    setGeneratedResId('');
    setReceiptImg(null); 
    if (currentUser) setResTab('track');
  };

  const handleCancelBooking = (id: string) => {
    if(window.confirm("Are you sure you want to cancel this booking?")) {
       cancelReservation(id, "Cancelled by user");
       if (trackForm.reservationId || currentUser) {
         setTrackedReservations(reservations.filter((r: any) => r.id === trackForm.reservationId || r.email === currentUser?.email));
       }
    }
  };

  const handleRescheduleSubmit = (id: string) => {
    if (!rescheduleData.date || !rescheduleData.timeSlot) return;
    const val = validateTimeSlot(rescheduleData.timeSlot, 2);
    if (val !== 'valid') {
      alert(`Invalid time selected: ${val === 'closed' ? 'Outside of reservation hours' : 'Walk-in only happy hour'}`);
      return;
    }

    const reservationDate = new Date(rescheduleData.date);
    const [hours, minutes] = rescheduleData.timeSlot.split(':').map(Number);
    reservationDate.setHours(hours, minutes, 0, 0);

    updateReservation(id, { date: reservationDate, timeSlot: rescheduleData.timeSlot, status: 'pending' });
    setReschedulingId(null);
    alert('Reservation successfully rescheduled! Staff will review and confirm your new time.');
  };

  const handleFeedbackSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!feedbackForm.name || !feedbackForm.contact || !feedbackForm.type || !feedbackForm.message) return;
    if (feedbackForm.type === 'other' && !feedbackForm.customType) return;
    
    const finalMessage = feedbackForm.type === 'other' ? `[Type: ${feedbackForm.customType}]\n${feedbackForm.message}` : feedbackForm.message;
    
    addFeedback({ 
      customerName: feedbackForm.name, 
      contactInfo: feedbackForm.contact, 
      rating: 0, 
      feedbackType: feedbackForm.type as any, 
      comment: finalMessage, 
      tags: feedbackForm.type === 'other' ? [feedbackForm.customType] : [],
      reservationId: feedbackForm.reservationId || undefined
    });
    
    setFeedbackSent(true);
    setTimeout(() => { setFeedbackSent(false); setFeedbackForm({ name: '', contact: '', type: '', customType: '', message: '', reservationId: '' }); }, 3000);
  };

  const prevHeroSlide = () => { setHeroSlideDir(-1); setHeroSlideIdx(p => (p - 1 + heroSlides.length) % heroSlides.length); };
  const nextHeroSlide = () => { setHeroSlideDir(1); setHeroSlideIdx(p => (p + 1) % heroSlides.length); };

  const publicEvents = events.filter((e: any) => e.type !== 'Holiday');
  
  const upcomingEvents = publicEvents.filter((e: any) => {
    const dates = e.date ? e.date.split(',') : [];
    const sortedDates = [...dates].sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    const lastDate = sortedDates[sortedDates.length - 1];
    return lastDate ? !isBefore(new Date(lastDate), todayStart) : true;
  });

  const pastEvents = publicEvents.filter((e: any) => {
    const dates = e.date ? e.date.split(',') : [];
    const sortedDates = [...dates].sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    const lastDate = sortedDates[sortedDates.length - 1];
    return lastDate ? isBefore(new Date(lastDate), todayStart) : false;
  });

  const reservedDates = reservations.filter((r: any) => r.status !== 'cancelled').map((r: any) => new Date(r.date));

  const allNavSections: { id: Section; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'reservations', label: 'Reservations' },
    { id: 'rates', label: 'Rates' },
    { id: 'events', label: 'Events' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">

      {/* ── Top Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-[72px] bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/60 flex items-center overflow-visible">
        <button
          onClick={() => setActiveSection('home')}
          className="h-full flex items-center px-5 pr-12 bg-emerald-700 hover:bg-emerald-600 transition-colors flex-shrink-0 relative z-10 cursor-pointer text-left"
          style={{ clipPath: 'polygon(0 0, 100% 0, 82% 100%, 0 100%)', minWidth: 220 }}
        >
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="One Shot Bar & Billiards" className="h-9 w-9 object-contain rounded-lg flex-shrink-0" />
            <div>
              <p className="text-white text-[17px] font-black tracking-tight leading-tight">ONE SHOT</p>
              <p className="text-emerald-200 text-[10px] uppercase tracking-[0.2em] font-semibold">Bar & Billiards</p>
            </div>
          </div>
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-4 pr-5 flex-shrink-0 relative">
          
          {/* Bell Button */}
          <div className="relative">
            <button
              onClick={() => setShowAnnouncements(!showAnnouncements)}
              className="relative p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-neutral-800"
            >
              <Bell size={20} />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-neutral-950 animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {showAnnouncements && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full mt-2 right-0 w-80 sm:w-96 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/50">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bell size={14} className="text-emerald-500" /> Notifications
                    </h3>
                    {hasUnread && (
                      <button onClick={markAllAsRead} className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 px-2 py-1 rounded transition-colors">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {allNotifications.length === 0 ? (
                      <p className="text-xs text-neutral-500 text-center py-6">No recent announcements</p>
                    ) : (
                      allNotifications.map((n: any) => {
                        const isUnread = isFirstTime || !readAnnouncements.includes(n.id);
                        const isRes = n.type === 'Reservation Update';
                        return (
                          <div key={n.id} className={`p-4 rounded-xl mb-1 transition-colors ${isUnread ? 'bg-emerald-950/20 border border-emerald-900/40' : 'hover:bg-neutral-900/50 border border-transparent'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 ${
                                isRes ? 'text-sky-400 bg-sky-500/10' : 
                                n.type?.toLowerCase() === 'holiday' ? 'text-rose-400 bg-rose-500/10' : 
                                n.type?.toLowerCase() === 'event' ? 'text-amber-400 bg-amber-500/10' : 
                                n.type?.toLowerCase() === 'promo' ? 'text-violet-400 bg-violet-500/10' : 
                                'text-emerald-500 bg-emerald-500/10'
                              }`}>
                                {n.type}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-neutral-500">{format(new Date(n.createdAt), 'MMM d')}</span>
                                {isUnread && (
                                  <button onClick={() => markAsRead(n.id)} className="text-[10px] text-emerald-400 hover:text-white transition-colors flex items-center gap-1" title="Mark as read">
                                    <CheckCircle size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />}
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-bold mb-1 truncate ${isUnread ? 'text-white' : 'text-neutral-300'}`} title={n.title}>{n.title}</p>
                                <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">{n.content}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-neutral-800" />

          {currentUser ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 bg-emerald-600/10 border border-emerald-600/25 rounded-full px-3 py-1.5 hover:bg-emerald-600/20 transition-colors max-w-[150px]">
                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] font-black text-white flex-shrink-0">{currentUser.name[0]}</div>
                <span className="text-xs text-emerald-300 font-medium hidden sm:block truncate">{currentUser.name}</span>
              </button>
              <button onClick={async () => { await supabase.auth.signOut(); setTrackedReservations(null); }} className="text-[10px] text-neutral-500 hover:text-neutral-300 px-2 py-1.5 transition-colors">Logout</button>
            </div>
          ) : (
            <button onClick={() => { setAuthMode('options'); setShowAuthModal(true); }} className="flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded-full transition-all font-bold shadow-lg shadow-emerald-900/30">
              <LogIn size={14} /> <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Section Navigation ── */}
      <nav className="fixed top-[72px] left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800/60 flex items-center justify-center gap-1 px-4 overflow-x-auto h-[54px]">
        {allNavSections.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`relative px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === id ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {label}
            {activeSection === id && (
              <motion.span layoutId="navUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* ── Main Content ── */}
      <main className="flex-1 pt-[126px]">
        <AnimatePresence mode="wait">
          
          {/* ════ HOME SECTION ════ */}
          {activeSection === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              
              <div className="relative h-[70vh] min-h-[500px] overflow-hidden group bg-neutral-950">
                <AnimatePresence mode="wait" custom={heroSlideDir}>
                  <motion.div
                    key={heroSlideIdx}
                    custom={heroSlideDir}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 w-full h-full"
                  >
                    <ImageWithFallback src={heroSlides[heroSlideIdx].src} alt={heroSlides[heroSlideIdx].alt} className="w-full h-full object-cover" />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent pointer-events-none" />

                <button onClick={prevHeroSlide} className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-600 hover:border-emerald-500 z-20 cursor-pointer shadow-xl"><ChevronLeft size={24} /></button>
                <button onClick={nextHeroSlide} className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-600 hover:border-emerald-500 z-20 cursor-pointer shadow-xl"><ChevronRight size={24} /></button>

                <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 px-6 text-center z-10 pointer-events-none">
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="flex flex-col items-center pointer-events-auto">
                    <p className="text-emerald-400 text-xs uppercase tracking-[0.3em] font-semibold mb-3 truncate max-w-[90vw]">{cms.heroTitle}</p>
                    <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight line-clamp-2 max-w-[90vw]">{cms.heroTitle}</h1>
                    <p className="text-emerald-300 text-xl font-light mb-5 line-clamp-2 max-w-[90vw]">{cms.heroSubtitle}</p>
                    <p className="text-neutral-400 text-sm max-w-md mx-auto mb-7 leading-relaxed line-clamp-4">{cms.heroDescription}</p>
                    
                    <div className="flex flex-wrap justify-center gap-3 mb-6">
                      <button onClick={() => setActiveSection('reservations')} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full text-sm font-semibold transition-all shadow-lg shadow-emerald-900/40 hover:shadow-emerald-800/60">
                        <Calendar size={15} /> Book a Table
                      </button>
                      <button onClick={() => document.getElementById('home-about-section')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-2 bg-neutral-900/80 backdrop-blur-sm hover:bg-neutral-800 text-neutral-100 px-6 py-3 rounded-full text-sm font-semibold transition-all border border-neutral-700/50 hover:border-neutral-600">
                        <Info size={15} /> Learn More
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      {heroSlides.map((_, i) => (
                        <button key={i} onClick={() => { setHeroSlideDir(i > heroSlideIdx ? 1 : -1); setHeroSlideIdx(i); }} className={`h-1.5 rounded-full transition-all ${i === heroSlideIdx ? 'bg-emerald-400 w-5' : 'bg-white/35 w-1.5 hover:bg-white/60'}`} />
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="bg-neutral-900 border-y border-neutral-800">
              <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-neutral-800">
                {[
                  { value: String(tables?.length || 0), label: 'Billiard Tables', color: 'text-emerald-400' },
                  { value: `₱${effectiveHourly}`, label: 'Per Hour', color: 'text-amber-400' },
                  { value: getOpenHoursDisplay(), label: 'Hours Open Daily', color: 'text-sky-400' },
                  { value: 'A+', label: 'Top Tier Facility', color: 'text-rose-400' },
                ].map(({ value, label, color }) => (
                  <div key={label} className="p-6 text-center">
                    <p className={`text-3xl font-black ${color} mb-1`}>{value}</p>
                    <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">{label}</p>
                  </div>
                ))}
              </div>
            </div>

              <div className="max-w-5xl mx-auto px-6 py-16">
                <h2 className="text-center text-2xl font-bold text-white mb-10">Why Choose One Shot?</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { 
                      icon: Award, 
                      title: 'Premium Tables', 
                      desc: `${tables?.length || 0} tournament-grade billiard tables maintained to the highest standard.`, 
                      color: 'emerald' 
                    },
                    { 
                      icon: Clock, 
                      title: 'Extended Hours', 
                      desc: `Weekdays ${fmt12(rates?.weekdayStartTime || '12:00')} – ${fmt12(rates?.weekdayEndTime || '02:00')} · Weekends ${fmt12(rates?.weekendStartTime || '12:00')} – ${fmt12(rates?.weekendEndTime || '02:00')}. Game night starts here!`, 
                      color: 'amber' 
                    },
                    { icon: Shield, title: 'Safe & Secure', desc: 'Clean, safe, and well-lit environment for players of all skill levels.', color: 'sky' },
                  ].map(({ icon: Icon, title, desc, color }) => (
                    <div key={title} className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-${color}-600/40 transition-all group`}>
                      <div className={`w-10 h-10 rounded-xl bg-${color}-600/15 border border-${color}-600/25 flex items-center justify-center mb-4 group-hover:bg-${color}-600/25 transition-colors`}>
                        <Icon size={18} className={`text-${color}-400`} />
                      </div>
                      <h3 className="text-white font-semibold mb-2">{title}</h3>
                      <p className="text-neutral-500 text-sm leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ════ ABOUT SECTION CONTENT ════ */}
              <div id="home-about-section" className="max-w-5xl mx-auto px-6 py-16 border-t border-neutral-800">
                <div className="text-center mb-10"><h2 className="text-3xl font-black text-white mb-2">{cms.aboutTitle}</h2><p className="text-neutral-400 text-sm">The story behind your favorite billiards destination</p></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-12">
                  <div>
                    <p className="text-emerald-400 text-xs uppercase tracking-widest font-semibold mb-3">Our Story</p><h3 className="text-2xl font-bold text-white mb-4">A Passion for the Game</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-4">{cms.aboutP1}</p>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-4">{cms.aboutP2}</p>
                    <p className="text-neutral-400 text-sm leading-relaxed">{cms.aboutP3}</p>
                  </div>
                  <div className="rounded-2xl overflow-hidden h-72">
                     <ImageWithFallback src={cms.aboutImage} alt="One Shot Facility" className="w-full h-full object-cover" />
                  </div>
                </div>
                
                {/* 🟢 Interactive Google Maps Embed */}
                <div className="mb-12">
                  <h3 className="text-center text-xl font-bold text-white mb-6">Our Location</h3>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden h-96 flex relative group">
                    <iframe 
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3861.6425983794347!2d121.12493947585098!3d14.581333485888201!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c70049cd2efb%3A0x4b8fd5634abcd6cc!2sOne%20Shot%20Bar%20and%20Billiards!5e0!3m2!1sen!2sph!4v1700000000000!5m2!1sen!2sph" 
                      className="absolute inset-0 w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-700"
                      allowFullScreen={false} 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                       <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-800 shadow-xl flex items-center gap-2">
                         <MapPin size={14} className="text-emerald-500" />
                         <span className="text-xs font-semibold text-white">{cms.address}</span>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-800 pt-10">
                  <div className="text-center mb-8"><h3 className="text-xl font-bold text-white mb-1">Contact Us</h3><p className="text-neutral-400 text-sm">We'd love to hear from you. Get in touch!</p></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="bg-neutral-900 border border-neutral-800 hover:border-emerald-600/30 rounded-xl p-5 transition-all flex gap-4">
                         <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center flex-shrink-0"><MapPin size={16} className="text-emerald-400" /></div>
                         <div className="min-w-0 flex-1"><p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Address</p><p className="text-sm text-neutral-200 whitespace-pre-line break-words line-clamp-3">{cms.address}</p></div>
                      </div>
                      <div className="bg-neutral-900 border border-neutral-800 hover:border-sky-600/30 rounded-xl p-5 transition-all flex gap-4">
                         <div className="w-10 h-10 rounded-xl bg-sky-600/10 border border-sky-600/20 flex items-center justify-center flex-shrink-0"><Phone size={16} className="text-sky-400" /></div>
                         <div className="min-w-0 flex-1"><p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Phone / Viber</p><p className="text-sm text-neutral-200 whitespace-pre-line break-words line-clamp-2">{cms.phone}</p></div>
                      </div>
                      <div className="bg-neutral-900 border border-neutral-800 hover:border-violet-600/30 rounded-xl p-5 transition-all flex gap-4">
                         <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-600/20 flex items-center justify-center flex-shrink-0"><Mail size={16} className="text-violet-400" /></div>
                         <div className="min-w-0 flex-1"><p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Email</p><p className="text-sm text-neutral-200 truncate">{cms.email}</p></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-3">Follow Us</p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { platform: 'Facebook', handle: cms.facebook, icon: '📘' }, 
                            { platform: 'Instagram', handle: cms.instagram, icon: '📸' }, 
                            { platform: 'TikTok', handle: cms.tiktok, icon: '🎵' }
                          ].map(({ platform, handle, icon }) => (
                            <div key={platform} className="flex items-center gap-2.5 bg-neutral-800/60 rounded-lg p-3">
                              <span className="text-lg">{icon}</span>
                              <div>
                                <p className="text-[10px] text-neutral-500">{platform}</p>
                                <p className="text-xs text-neutral-300 truncate">{handle}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ════ FEEDBACK SECTION CONTENT ════ */}
              <div id="home-feedback-section" className="max-w-2xl mx-auto px-6 py-16 border-t border-neutral-800">
                <div className="text-center mb-8"><h2 className="text-3xl font-black text-white mb-2">Send us Feedback</h2><p className="text-neutral-400 text-sm">We value your experience. Let us know how we can improve!</p></div>
                {feedbackSent ? (
                  <div className="bg-sky-600/10 border border-sky-600/30 rounded-2xl p-10 text-center"><CheckCircle size={40} className="text-sky-400 mx-auto mb-3" /><p className="text-sky-300 font-semibold text-lg mb-1">Message Sent!</p><p className="text-neutral-500 text-sm">Our management team will review your message shortly. Thank you!</p></div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-5">
                    <div className="flex items-center gap-2 mb-1"><Mail className="text-sky-400" size={18} /><p className="text-sm font-semibold text-white">Direct Message to Management</p></div>
                    <div><label className="block text-xs text-neutral-400 mb-1.5">Your Name <span className="text-rose-500">*</span></label><input type="text" value={feedbackForm.name} onChange={e => setFeedbackForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Juan dela Cruz" required className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-sky-500" /></div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-xs text-neutral-400 mb-1.5">Contact Number <span className="text-rose-500">*</span></label><input type="tel" inputMode="numeric" value={feedbackForm.contact} onChange={e => setFeedbackForm(f => ({ ...f, contact: e.target.value.replace(/\D/g, '').slice(0, 13) }))} placeholder="e.g. 09123456789" required className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-sky-500" /></div>
                      <div><label className="block text-xs text-neutral-400 mb-1.5">Reservation ID <span className="text-neutral-600">(Optional)</span></label><input type="text" value={feedbackForm.reservationId} onChange={e => setFeedbackForm(f => ({ ...f, reservationId: e.target.value.toUpperCase() }))} placeholder="e.g. X7B9QA" className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-sky-500 font-mono tracking-widest uppercase" /></div>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1.5">Type of Feedback <span className="text-rose-500">*</span></label>
                      <div className="relative"><select value={feedbackForm.type} onChange={e => setFeedbackForm(f => ({ ...f, type: e.target.value }))} required className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-sky-500 appearance-none"><option value="" disabled>Select a category...</option><option value="compliment">Compliment</option><option value="suggestion">Suggestion</option><option value="complaint">Concern / Complaint</option><option value="lost_item">Lost Item</option><option value="other">Other</option></select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" /></div>
                    </div>

                    {feedbackForm.type === 'other' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                        <label className="block text-xs text-neutral-400 mb-1.5">Please Specify <span className="text-rose-500">*</span></label>
                        <input type="text" value={feedbackForm.customType} onChange={e => setFeedbackForm(f => ({ ...f, customType: e.target.value }))} placeholder="e.g. Partnership Inquiry" required className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-sky-500" />
                      </motion.div>
                    )}

                    <div><label className="block text-xs text-neutral-400 mb-1.5">Message <span className="text-rose-500">*</span></label><textarea value={feedbackForm.message} onChange={e => setFeedbackForm(f => ({ ...f, message: e.target.value }))} placeholder="Please provide details..." rows={4} required className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-sky-500 resize-none" /></div>
                    <button type="submit" disabled={!feedbackForm.name || !feedbackForm.contact || !feedbackForm.type || (feedbackForm.type === 'other' && !feedbackForm.customType) || !feedbackForm.message} className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-neutral-800 text-white py-3 rounded-xl text-sm font-semibold">Submit Feedback</button>
                  </form>
                )}
              </div>
            </motion.div>
          )}
          
          {/* ════ RESERVATIONS SECTION ════ */}
          {activeSection === 'reservations' && (
            <motion.div key="reservations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="max-w-6xl mx-auto px-4 py-10">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-white mb-2">{currentUser ? `Welcome back, ${currentUser.name.split(' ')[0]}!` : 'Reservations'}</h2>
                <p className="text-neutral-400 text-sm">Secure your specific table or track your booking.</p>
              </div>

              <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1 mb-8 max-w-sm mx-auto">
                <button onClick={() => setResTab('new')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${resTab === 'new' ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500 hover:text-neutral-300'}`}>
                  <Calendar size={14} /> New Booking
                </button>
                <button onClick={() => {
                  setResTab('track');
                  if (currentUser) {
                    setTrackedReservations(reservations.filter((r: any) => r.email === currentUser.email).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                  }
                }} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${resTab === 'track' ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500 hover:text-neutral-300'}`}>
                  {currentUser ? <BookOpen size={14} /> : <Search size={14} />} 
                  {currentUser ? 'My Bookings' : 'Track Booking'}
                </button>
              </div>

              {resTab === 'new' && (
                <>
                  {/* 🟢 Dead Man Switch Lockdown Banner */}
                  {isSystemOffline && (
                    <div className="mb-8 bg-rose-950/40 border border-rose-800/50 rounded-xl p-5 flex items-start gap-3 animate-in fade-in">
                      <AlertTriangle className="text-rose-500 flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <h4 className="text-sm font-bold text-rose-400">Live Reservations Disabled</h4>
                        <p className="text-xs text-rose-300/80 mt-1.5 leading-relaxed">
                          Our physical venue is currently experiencing local internet connectivity issues. To prevent double-booking, online reservations have been temporarily paused. Please visit us in person—we are accepting walk-ins!
                        </p>
                      </div>
                    </div>
                  )}

                  <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative pb-20 ${isSystemOffline ? 'opacity-50 pointer-events-none grayscale-[50%]' : ''}`}>
                    
                    {/* 🟢 LEFT PANEL: Integrated Calendar & Live Table Feed */}
                    <div className="lg:col-span-5 flex flex-col h-[600px] bg-neutral-900 rounded-2xl border border-neutral-800 shadow-xl overflow-hidden">
                      {/* Integrated Header & Date Picker Toggle */}
                      <div className="bg-neutral-950 p-4 border-b border-neutral-800 flex flex-col gap-3 z-20 shrink-0">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold ml-1">Step 1 — Pick a Date & Table</p>
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

                      {/* Expandable Calendar Inline */}
                      <AnimatePresence>
                        {isCalendarExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }} 
                            exit={{ height: 0, opacity: 0 }} 
                            className="overflow-hidden border-b border-neutral-800 bg-neutral-950/50 shrink-0"
                          >
                            <div className="p-4">
                              <MiniCalendar
                                selectedDate={selectedDate}
                                onSelect={(d) => {
                                  setSelectedDate(d);
                                  setSelectedTableId(null);
                                  setIsCalendarExpanded(false);
                                }}
                                reservedDates={reservedDates}
                                closedDates={closedDates}
                                onClosedClick={(d, reason) => setClosureAlert({ date: d, reason })}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Live Table Feed */}
                      <div className="overflow-y-auto p-4 space-y-3 hide-scrollbar flex-1 bg-neutral-900">
                        {!selectedDate ? (
                          <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                            <Calendar size={32} className="text-neutral-600 mb-3" />
                            <p className="text-sm text-neutral-400">Select a date to view available tables.</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Live Table Status</p>
                                {isToday(selectedDate) && (
                                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                  </span>
                                )}
                              </div>
                              <span className="text-[8px] bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">
                                Max {Math.max(1, Math.floor((tables.filter((t: any) => t.isActive).length || 10) * (([0, 5, 6].includes(new Date(selectedDate).getDay()) ? Number(rates?.weekendOnlineCapacityLimit || 40) : Number(rates?.weekdayOnlineCapacityLimit || 90)) / 100)))} Tables Online
                              </span>
                            </div>

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
                                r.tableId === table.id && 
                                isSameDay(new Date(r.date), selectedDate) && 
                                r.status !== 'cancelled' && 
                                r.status !== 'completed'
                              ).sort((a: any, b: any) => {
                                const timeA = a.timeSlot.split(':').map(Number);
                                const timeB = b.timeSlot.split(':').map(Number);
                                return (timeA[0]*60 + timeA[1]) - (timeB[0]*60 + timeB[1]);
                              });

                              return (
                                <div 
                                  key={table.id} 
                                  className={`relative rounded-xl border transition-all ${isMaint ? 'bg-neutral-900/40 border-neutral-800/60 opacity-60' : isSel ? 'bg-emerald-950/20 border-emerald-500 shadow-lg shadow-emerald-900/20' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600'}`}
                                >
                                  <div className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                      <div>
                                        <h4 className={`text-sm font-bold ${isSel ? 'text-emerald-400' : 'text-neutral-200'}`}>{table.name}</h4>
                                        {isMaint ? (
                                          <p className="text-[10px] text-rose-400 font-semibold mt-1">Maintenance</p>
                                        ) : isOcc && isToday(selectedDate) ? (
                                          <p className="text-[10px] text-amber-400 font-semibold mt-1">In Use until {inUseUntil}</p>
                                        ) : (
                                          <p className="text-[10px] text-emerald-400 font-semibold mt-1">Available</p>
                                        )}
                                      </div>
                                      <button 
                                        disabled={isMaint}
                                        onClick={() => { setSelectedTableId(table.id); setTimeout(() => document.getElementById('booking-form-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}
                                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors border ${isSel ? 'bg-emerald-500 text-white border-emerald-400 shadow-md' : isMaint ? 'bg-neutral-800 text-neutral-600 border-neutral-700 cursor-not-allowed' : 'bg-neutral-800 text-neutral-300 hover:bg-emerald-600/20 hover:text-emerald-400 hover:border-emerald-500/50 border-neutral-700'}`}
                                      >
                                        {isSel ? 'Selected' : 'Select'}
                                      </button>
                                    </div>
                                    
                                    <div className="bg-neutral-900/80 rounded-lg p-2.5 border border-neutral-800/50">
                                      <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-semibold mb-1.5">Today's Reservations</p>
                                      {tableRes.length === 0 ? (
                                        <p className="text-xs text-neutral-600 italic">No bookings.</p>
                                      ) : (
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

                    {/* 🟢 RIGHT PANEL: Booking Form */}
                    <div className="lg:col-span-7">
                      {!selectedDate || !selectedTableId ? (
                        <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 h-full min-h-[400px]">
                          <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mb-2">
                            <Table2 size={32} className="text-neutral-600" />
                          </div>
                          <p className="text-neutral-400 font-semibold">Select a table from the feed to continue.</p>
                          <p className="text-neutral-600 text-xs max-w-xs">Pick a date, then choose your preferred table to unlock the booking form.</p>
                        </div>
                      ) : (
                        <div id="booking-form-start">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Step 2 — Your Details</p>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                              Booking {tables.find((t: any) => t.id === selectedTableId)?.name}
                            </span>
                          </div>
                          
                          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="sm:col-span-2">
                                <label className="block text-xs text-neutral-400 mb-1.5">Full Name <span className="text-rose-500">*</span></label>
                                <input type="text" value={resForm.name} onChange={e => setResForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Juan dela Cruz" className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors" />
                              </div>
                              <div>
                                <label className="block text-xs text-neutral-400 mb-1.5">Email Address {currentUser ? '' : <span className="text-neutral-600">(Optional)</span>}</label>
                                <input type="email" value={resForm.email} onChange={e => setResForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@email.com" className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors" />
                              </div>
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <label className="block text-xs text-neutral-400 mb-1.5">Phone Number <span className="text-rose-500">*</span></label>
                                  <input type="tel" inputMode="numeric" value={resForm.phone} onChange={e => setResForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 13) }))} placeholder="09XX-XXX-XXXX" className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors" />
                                  <p className="mt-1 text-[10px] text-neutral-500">Use 13 digits max.</p>
                                </div>
                                <div className="w-20 shrink-0">
                                  <label className="block text-xs text-neutral-400 mb-1.5 flex justify-between items-end">
                                    <span>Pax</span>
                                    {selectedDate && <span className="text-[9px] text-emerald-500 font-bold ml-1">Max {maxAllowedPartySize}</span>}
                                  </label>
                                  <input 
                                    type="number" 
                                    min={1} 
                                    max={maxAllowedPartySize} 
                                    value={resForm.pax} 
                                    onChange={e => {
                                      const val = parseInt(e.target.value);
                                      if (val > maxAllowedPartySize) {
                                        setResForm(f => ({ ...f, pax: maxAllowedPartySize }));
                                      } else {
                                        setResForm(f => ({ ...f, pax: val || 1 }));
                                      }
                                    }} 
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500 transition-colors text-center" 
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* FLEXIBLE TIME INPUT */}
                            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80 mt-2">
                              <label className="block text-xs text-emerald-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Clock size={14} /> Schedule Setup
                              </label>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs text-neutral-400 mb-1.5">Start Time <span className="text-rose-500">*</span></label>
                                  <input
                                    type="time"
                                    style={{ colorScheme: 'dark' }}
                                    value={resForm.timeSlot}
                                    onChange={e => setResForm(f => ({ ...f, timeSlot: e.target.value }))}
                                    className={`w-full bg-neutral-800 border rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:outline-none transition-colors ${
                                      ['closed', 'happyhour', 'full', 'table_conflict', 'active_conflict'].includes(timeValidation) ? 'border-rose-500/50 text-rose-200' : 'border-neutral-700 focus:border-emerald-500'
                                    }`}
                                  />
                                </div>
                                <div className="flex flex-col justify-end">
                                  <label className="block text-xs text-neutral-400 mb-1.5 flex justify-between items-end flex-shrink-0">
                                    <span>Duration (hours)</span>
                                    {resForm.timeSlot && <span className="text-[9px] text-amber-500 text-right leading-tight max-w-[80px]">Max ~{maxAllowedDuration}h</span>}
                                  </label>
                                  <select value={resForm.duration} onChange={e => setResForm(f => ({ ...f, duration: parseInt(e.target.value) }))} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500 transition-colors">
                                    {Array.from({ length: maxAllowedDuration }, (_, i) => i + 1).map(h => (
                                      <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              
                              <div className="mt-3">
                                {timeValidation === 'past' && <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1"><XCircle size={10} /> This time slot has already passed.</p>}
                                {timeValidation === 'advance' && <p className="text-[10px] text-amber-500 font-semibold flex items-center gap-1"><AlertTriangle size={10} /> Requires at least 1 hour advance notice.</p>}
                                {timeValidation === 'closed' && <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1"><XCircle size={10} /> Outside operating hours.</p>}
                                {timeValidation === 'happyhour' && <p className="text-[10px] text-amber-500 font-semibold flex items-center gap-1"><AlertTriangle size={10} /> Happy Hour is strictly walk-in only.</p>}
                                {timeValidation === 'full' && <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1"><Users size={10} /> Venue online capacity limit reached.</p>}
                                {timeValidation === 'event_blocked' && <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Overlaps with a special event.</p>}
                                
                                {/* 🟢 NEW STRICT CONFLICT ALERTS */}
                                {timeValidation === 'table_conflict' && (
                                  <div className="text-[10px] text-rose-400 font-bold flex items-start gap-1.5 bg-rose-950/30 p-2.5 rounded border border-rose-900/50 mt-2">
                                    <XCircle size={14} className="flex-shrink-0 mt-0.5" /> 
                                    <span>Time slot overlaps with another reservation on this specific table. Please adjust your start time or duration, or pick a different table from the feed.</span>
                                  </div>
                                )}
                                {timeValidation === 'active_conflict' && (
                                  <div className="text-[10px] text-amber-400 font-bold flex items-start gap-1.5 bg-amber-950/20 p-2.5 rounded border border-amber-900/30 mt-2">
                                    <Clock size={14} className="flex-shrink-0 mt-0.5" /> 
                                    <span>A walk-in customer is currently playing on this table. Please allow buffer time for their session to finish.</span>
                                  </div>
                                )}
                                
                                {timeValidation === 'valid' && (
                                  <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-2">
                                    <CheckCircle size={10} /> Schedule looks good!
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="pt-4 border-t border-neutral-800 mt-2">
                              <label className="block text-xs text-neutral-400 mb-1.5">Promo Code <span className="text-neutral-600">(optional)</span></label>
                              {appliedPromo ? (
                                <div className="flex items-center gap-2 bg-emerald-600/10 border border-emerald-600/30 rounded-lg px-3 py-2">
                                  <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                                  <span className="text-xs text-emerald-300 font-semibold flex-1">{appliedPromo.code} — {appliedPromo.discountPercent}% off applied!</span>
                                  <button type="button" onClick={handleRemovePromo} className="text-neutral-500 hover:text-rose-400 transition-colors"><X size={13} /></button>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex gap-2">
                                    <input type="text" value={promoCodeInput} onChange={e => { setPromoCodeInput(e.target.value.toUpperCase()); setPromoError(''); }} placeholder="e.g. WELCOME20" className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 font-mono" />
                                    <button type="button" onClick={handleApplyPromo} disabled={!promoCodeInput.trim()} className="px-4 py-2 bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">Apply</button>
                                  </div>
                                  {promoError && <p className="text-[11px] text-rose-400">{promoError}</p>}
                                </div>
                              )}
                            </div>

                            <div className="bg-neutral-800/60 rounded-xl p-4 border border-neutral-700/50">
                              <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-semibold">Booking Summary</p>
                              <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between"><span className="text-neutral-400">Date</span><span className="text-neutral-200">{selectedDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
                                <div className="flex justify-between"><span className="text-neutral-400">Time</span><span className="text-neutral-200">{resForm.timeSlot || '—'}</span></div>
                                <div className="flex justify-between"><span className="text-neutral-400">Duration</span><span className="text-neutral-200">{resForm.duration}h × ₱{effectiveHourly}/hr</span></div>
                                {appliedPromo && (
                                  <div className="flex justify-between text-emerald-400"><span>Promo ({appliedPromo.code})</span><span>−₱{discountAmount}.00</span></div>
                                )}
                                <div className="border-t border-neutral-700 pt-1.5 mt-1.5 flex justify-between">
                                  <span className="text-neutral-400">Total Amount</span><span className="text-white font-semibold">₱{totalAmount}.00</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-amber-400">Down Payment ({rates?.downPaymentPercent || 25}%)</span><span className="text-amber-300 font-semibold">₱{downPayment}.00</span>
                                </div>
                              </div>
                            </div>

                            <button 
                              onClick={handleReservationSubmit} 
                              disabled={
                                !resForm.name.trim() || 
                                !resForm.phone.trim() || 
                                !resForm.timeSlot || 
                                timeValidation !== 'valid' ||
                                isVerifying
                              } 
                              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-2"
                            >
                              {isVerifying ? <><RefreshCw size={14} className="animate-spin" /> Verifying...</> : <>Proceed to Payment <ArrowRight size={14} /></>}
                            </button>
                            
                            {/* 🟢 RECAPTCHA LEGAL DISCLAIMER COMMENTED OUT FOR NOW 
                            <p className="text-[10px] text-neutral-500 text-center leading-relaxed mt-3 px-2">
                              This site is protected by reCAPTCHA and the Google <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline">Terms of Service</a> apply.
                            </p>
                            */}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
                
              {/* Guest Tracking View */}
              {resTab === 'track' && (
                <div className="max-w-3xl mx-auto">
                  {!currentUser && !trackedReservations ? (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-lg mx-auto">
                      <div className="text-center mb-6">
                        <Search size={32} className="text-emerald-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-white mb-1">Track Reservation</h3>
                        <p className="text-xs text-neutral-400">Enter your Reservation ID and registered phone number below to view your booking status.</p>
                      </div>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const found = reservations.filter((r: any) => 
                          r.id.toUpperCase() === trackForm.reservationId.toUpperCase() &&
                          r.contactNumber === trackForm.phone
                        ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        setTrackedReservations(found);
                      }} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1.5 font-semibold tracking-wider">Reservation ID</label>
                            <input type="text" required value={trackForm.reservationId} onChange={e => setTrackForm(f => ({ ...f, reservationId: e.target.value.toUpperCase() }))} placeholder="e.g. X7B9QA" className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-3 text-center text-base text-neutral-100 focus:border-emerald-500 font-mono tracking-[0.2em] uppercase outline-none transition-colors" />
                          </div>
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1.5 font-semibold tracking-wider">Registered Phone</label>
                            <input type="tel" required value={trackForm.phone} onChange={e => setTrackForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 13) }))} placeholder="09XX-XXX-XXXX" className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-3 text-center text-base text-neutral-100 focus:border-emerald-500 font-mono tracking-widest outline-none transition-colors" />
                          </div>
                        </div>
                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-900/30">Find Booking</button>
                      </form>
                      <div className="mt-6 pt-5 border-t border-neutral-800 text-center">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-2">Want to manage your bookings online?</p>
                        <button type="button" onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors">Create an account for full access &rarr;</button>
                      </div>
                    </div>
                  ) : (() => {
                    const statusColors: Record<string, string> = { pending: 'bg-amber-500/15 text-amber-400 border-amber-500/25', confirmed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', 'checked-in': 'bg-sky-500/15 text-sky-400 border-sky-500/25', completed: 'bg-neutral-700/50 text-neutral-400 border-neutral-700', cancelled: 'bg-rose-500/15 text-rose-400 border-rose-500/25' };
                    const myBookings = currentUser 
                      ? reservations.filter((r: any) => r.email && r.email.toLowerCase() === currentUser.email.toLowerCase()).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      : (trackedReservations || []);

                    if (myBookings.length === 0) {
                      return (
                        <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-2xl p-12 text-center">
                          <AlertTriangle size={36} className="text-rose-500 mx-auto mb-3" />
                          <p className="text-neutral-200 font-semibold mb-1">No Bookings Found</p>
                          <p className="text-neutral-500 text-sm mb-5">We couldn't find any reservations matching those details.</p>
                          <button onClick={() => setTrackedReservations(null)} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all border border-neutral-700">Try Again</button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center mb-2 px-1">
                          <p className="text-xs text-neutral-400">Showing results for: <strong className="text-neutral-200">{currentUser ? currentUser.email : trackForm.reservationId}</strong></p>
                          {!currentUser && <button onClick={() => setTrackedReservations(null)} className="text-xs text-emerald-400 hover:underline">New Search</button>}
                        </div>
                        {myBookings.map((r: any) => {
                          const isAffectedByClosure = closedDates.some((cd: any) => isSameDay(new Date(cd.date), new Date(r.date)));
                          
                          return (
                          <div key={r.id} className={`border rounded-xl p-4 flex flex-col gap-4 ${isAffectedByClosure && r.status !== 'cancelled' ? 'bg-rose-950/20 border-rose-900/50' : 'bg-neutral-900 border-neutral-800'}`}>
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-neutral-200">{new Date(r.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                  <span className="text-neutral-600">·</span><p className="text-sm text-neutral-400">{r.timeSlot}</p>
                                  <span className="text-neutral-600">·</span><p className="text-sm text-neutral-400">{r.durationHours}h</p>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap"><span>{r.partySize} person{r.partySize > 1 ? 's' : ''}</span></div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="text-right"><p className="text-sm font-bold text-white">₱{r.totalAmount.toLocaleString()}</p><p className="text-[10px] text-neutral-600">Total</p></div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusColors[r.status] || statusColors.pending}`}>{r.status.replace('-', ' ')}</span>
                              </div>
                            </div>
                            
                            {isAffectedByClosure && r.status !== 'cancelled' && (
                              <div className="bg-rose-950/40 border border-rose-800/50 rounded-lg p-4 mt-2">
                                <h4 className="text-rose-400 font-bold text-sm flex items-center gap-2 mb-2"><AlertTriangle size={16} /> Action Required: Establishment Closed</h4>
                                <p className="text-xs text-neutral-300 mb-3 leading-relaxed">
                                  We sincerely apologize, but One Shot Bar & Billiards will be closed on <strong>{format(new Date(r.date), 'MMM d, yyyy')}</strong> due to unforeseen circumstances or a private event. <br/><br/>
                                  You are entitled to a full refund of your <strong>₱{r.downPaymentAmount.toFixed(2)}</strong> down payment, or you may reschedule your booking to a new date.
                                </p>
                                <div className="flex gap-2 border-t border-rose-900/30 pt-3 mt-3">
                                  {currentUser ? (
                                    <>
                                      <button onClick={() => { setReschedulingId(r.id); setRescheduleData({ date: new Date(r.date), timeSlot: r.timeSlot }); }} className="flex-1 text-[11px] font-semibold bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 rounded transition-colors">Reschedule Booking</button>
                                      <button onClick={() => cancelReservation(r.id, "Closure Refund Request")} className="flex-1 text-[11px] font-semibold text-rose-300 hover:text-white bg-rose-950/50 border border-rose-800/50 hover:bg-rose-900/50 px-3 py-2 rounded transition-colors">Cancel & Request Refund</button>
                                    </>
                                  ) : (
                                    <div className="w-full bg-rose-950/60 border border-rose-900/50 p-2.5 rounded-lg text-center flex items-center justify-center gap-2">
                                      <Lock size={12} className="text-rose-400" />
                                      <p className="text-[10px] text-rose-200">Guest modifications locked. Please call <strong>{cms.phone}</strong> to process your refund or reschedule.</p>
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] text-neutral-500 mt-3 text-center">Need help? Contact us at <strong>{cms.phone}</strong> or <strong>{cms.email}</strong></p>
                              </div>
                            )}

                            {(!isAffectedByClosure && (r.status === 'pending' || r.status === 'confirmed')) && (
                              <div className="border-t border-neutral-800/60 pt-3">
                                {currentUser ? (
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => { setReschedulingId(r.id); setRescheduleData({ date: new Date(r.date), timeSlot: r.timeSlot }); }} className="text-[10px] font-semibold text-neutral-400 hover:text-white bg-neutral-800 px-3 py-1.5 rounded transition-colors">Reschedule</button>
                                    <button onClick={() => handleCancelBooking(r.id)} className="text-[10px] font-semibold text-rose-400 hover:text-white bg-rose-950/30 border border-rose-900/50 hover:bg-rose-900/50 px-3 py-1.5 rounded transition-colors">Cancel Booking</button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Shield size={14} className="text-amber-500 flex-shrink-0" />
                                      <p className="text-[10px] text-amber-200/80 leading-snug">Guest modifications locked. Call <strong>{cms.phone}</strong> to reschedule or cancel.</p>
                                    </div>
                                    <button onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} className="text-[10px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1.5 rounded border border-amber-500/20 transition-colors whitespace-nowrap ml-2">Register</button>
                                  </div>
                                )}
                              </div>
                            )}

                            {reschedulingId === r.id && (
                              <div className="mt-2 p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-4">
                                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Select New Date & Time</h4>
                                <MiniCalendar selectedDate={rescheduleData.date} onSelect={(d) => setRescheduleData(prev => ({ ...prev, date: d }))} reservedDates={reservedDates} closedDates={closedDates} />
                                <div>
                                   <label className="block text-xs text-neutral-400 mb-1.5">New Time</label>
                                   <input type="time" value={rescheduleData.timeSlot} onChange={e => setRescheduleData(prev => ({ ...prev, timeSlot: e.target.value }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500 transition-colors" />
                                </div>
                                <div className="flex gap-2 justify-end pt-2 border-t border-neutral-800/60">
                                   <button onClick={() => setReschedulingId(null)} className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors">Abort</button>
                                   <button onClick={() => handleRescheduleSubmit(r.id)} disabled={!rescheduleData.date || !rescheduleData.timeSlot} className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 text-white rounded-lg transition-colors">Confirm Reschedule</button>
                                </div>
                              </div>
                            )}

                            {/* Refund Status Tracker */}
                            {r.status === 'cancelled' && r.refundStatus && (
                              <div className="mt-4 bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <Shield size={14} className="text-sky-500" /> Refund Status
                                </h4>
                                
                                {r.refundStatus === 'pending' && (
                                  <p className="text-xs text-amber-400 bg-amber-950/20 p-3 rounded-lg border border-amber-900/30">
                                    Your refund request has been received and is currently in the queue for management review.
                                  </p>
                                )}

                                {r.refundStatus === 'processing' && (
                                  <p className="text-xs text-sky-400 bg-sky-950/20 p-3 rounded-lg border border-sky-900/30">
                                    Management is currently processing your refund. You will receive an update shortly.
                                  </p>
                                )}

                                {r.refundStatus === 'sent' && (
                                  <div className="space-y-3">
                                    <div className="bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-lg">
                                      <p className="text-sm font-bold text-emerald-400 mb-1">Refund Sent via GCash</p>
                                      <p className="text-xs text-neutral-400">
                                        We have successfully transferred <strong>₱{r.downPaymentAmount.toFixed(2)}</strong> back to your GCash account. Please check your SMS or GCash app inbox.
                                      </p>
                                      {r.refundNotes && <p className="text-[10px] text-neutral-500 mt-2 italic">Note: {r.refundNotes}</p>}
                                    </div>
                                    <button 
                                      onClick={() => acknowledgeRefund(r.id)}
                                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                                    >
                                      I Confirm Receipt of Refund
                                    </button>
                                  </div>
                                )}

                                {r.refundStatus === 'in_person' && (
                                  <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                                    <div>
                                      <p className="text-sm font-bold text-neutral-200">Refund Claimed</p>
                                      <p className="text-xs text-neutral-500">Refund was provided in cash at the counter.</p>
                                    </div>
                                    <button disabled className="bg-neutral-800 text-neutral-600 text-[10px] font-bold py-1.5 px-3 rounded cursor-not-allowed">
                                      Completed
                                    </button>
                                  </div>
                                )}

                                {r.refundStatus === 'remediated' && (
                                  <div className="bg-violet-950/20 border border-violet-900/30 p-3 rounded-lg">
                                    <p className="text-sm font-bold text-violet-400 mb-1">Converted to Game Credit</p>
                                    <p className="text-xs text-neutral-400">
                                      Your down payment has been successfully transferred to a new table session. Enjoy your game!
                                    </p>
                                  </div>
                                )}

                                {r.refundStatus === 'acknowledged' && (
                                  <div className="flex items-center gap-2 text-emerald-500 bg-emerald-950/10 p-3 rounded-lg border border-emerald-900/20">
                                    <CheckCircle size={16} />
                                    <div>
                                      <p className="text-sm font-bold">Refund Completed</p>
                                      <p className="text-xs text-emerald-500/70">You have acknowledged receipt of this refund.</p>
                                    </div>
                                  </div>
                                )}

                                {r.refundStatus === 'expired' && (
                                  <p className="text-xs text-rose-400 bg-rose-950/20 p-3 rounded-lg border border-rose-900/30">
                                    This refund request has expired as it was unclaimed for too long. Please contact support.
                                  </p>
                                )}
                              </div>
                            )}

                          </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          )}

          {/* ════ RATES SECTION ════ */}
          {activeSection === 'rates' && (
            <motion.div key="rates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="max-w-4xl mx-auto px-6 py-10">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-white mb-2">Table Rates</h2>
                <p className="text-neutral-400 text-sm">Transparent and affordable pricing for everyone.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {(() => {
                  const currentDay = new Date().getDay();
                  const isWeekend = currentDay === 0 || currentDay === 5 || currentDay === 6;
                  const isHappyHourActive = isWeekend ? rates?.isWeekendHappyHourActive : rates?.isWeekdayHappyHourActive;
                  const happyHourRate = isWeekend ? rates?.weekendHappyHourRate : rates?.weekdayHappyHourRate;
                  const happyHourStart = isWeekend ? rates?.weekendHappyHourStart : rates?.weekdayHappyHourStart;
                  const happyHourEnd = isWeekend ? rates?.weekendHappyHourEnd : rates?.weekdayHappyHourEnd;
                  const dayTypeLabel = isWeekend ? 'Weekends (Fri-Sun)' : 'Weekdays (Mon-Thu)';

                  return [
                    { name: 'Standard Play', rate: `₱${effectiveHourly}`, unit: '/ hour', desc: 'Walk-in regular play on any available table.', features: ['First-Come First-Served', 'Any available table', 'Cue sticks included', 'Timer monitored'], badge: null, color: 'neutral' },
                    { name: 'Reserved Table', rate: `₱${effectiveHourly}`, unit: '/ hour', desc: 'Book a specific time slot and table in advance.', features: ['Guaranteed table slot', `${rates?.downPaymentPercent ?? 25}% down payment`, 'Priority seating', 'Advance booking'], badge: 'Popular', color: 'emerald' },
                    { 
                      name: 'Happy Hour', 
                      rate: `₱${happyHourRate || 200}`, 
                      unit: '/ hour', 
                      desc: `Discounted walk-in rate today (${dayTypeLabel}) from ${fmt12(happyHourStart || '18:00')}–${fmt12(happyHourEnd || '19:00')}.`, 
                      features: ['Valid today only', 'Walk-in ONLY - No reservations', 'Discounted standard rate', 'Subject to availability'], 
                      badge: 'Limited', 
                      color: 'amber' 
                    },
                  ]
                  .filter(card => card.name !== 'Happy Hour' || isHappyHourActive)
                  .map(({ name, rate, unit, desc, features, badge, color }) => (
                    <div key={name} className={`relative bg-neutral-900 border rounded-2xl p-6 flex flex-col ${color === 'emerald' ? 'border-emerald-600/50 shadow-lg shadow-emerald-950/50' : color === 'amber' ? 'border-amber-600/30' : 'border-neutral-800'}`}>
                      {badge && <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${color === 'emerald' ? 'bg-emerald-600 text-white' : color === 'amber' ? 'bg-amber-600 text-white' : 'bg-neutral-700 text-neutral-400'}`}>{badge}</span>}
                      <p className={`text-xs uppercase tracking-widest font-semibold mb-2 ${color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-neutral-500'}`}>{name}</p>
                      <div className="flex items-end gap-1 mb-3"><span className={`text-4xl font-black ${color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-white'}`}>{rate}</span><span className="text-neutral-500 text-sm mb-1">{unit}</span></div>
                      <p className="text-neutral-500 text-xs mb-5 leading-relaxed">{desc}</p>
                      <ul className="space-y-2 flex-1">
                        {features.map(f => <li key={f} className="flex items-center gap-2 text-xs text-neutral-400"><CheckCircle size={12} className={color === 'emerald' ? 'text-emerald-500' : color === 'amber' ? 'text-amber-500' : 'text-neutral-600'} />{f}</li>)}
                      </ul>
                      
                      {name === 'Standard Play' ? (
                        <div className="mt-5 w-full py-2.5 rounded-xl text-xs font-semibold text-center bg-neutral-950/40 text-neutral-500 border border-neutral-800/40 select-none"> Walk-ins Welcome</div>
                      ) : name === 'Happy Hour' ? (
                        <div className="mt-5 w-full py-2.5 rounded-xl text-xs font-semibold text-center bg-neutral-950/40 text-neutral-500 border border-neutral-800/40 select-none"> Walk-in Only</div>
                      ) : (
                        <button onClick={() => setActiveSection('reservations')} className="mt-5 w-full py-2.5 rounded-xl text-xs font-semibold transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20">Book Now</button>
                      )}
                    </div>
                  ));
                })()}
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Reservation Policies & Terms</h3>
                <div className="flex gap-3 bg-emerald-950/40 border border-emerald-700/30 rounded-xl p-4 mb-5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600/20 flex items-center justify-center mt-0.5"><Info size={13} className="text-emerald-400" /></div>
                  <div>
                    <p className="text-emerald-300 text-xs font-semibold mb-1">Reservation Redemption Policy</p>
                    <p className="text-neutral-400 text-xs leading-relaxed">After completing your reservation and {rates?.downPaymentPercent ?? 25}% down payment, the <span className="text-white font-medium">remaining balance must be settled before or after your game</span> — payable via <span className="text-white font-medium">Cash or GCash</span>.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'Reservation Rule', value: `Requires at least ${reservationTerms.advanceBookingHours || 1} hour(s) advance notice.` },
                    { label: 'Online Booking Hours', value: bookingHoursDisplay },
                    { label: 'Minimum Booking', value: `${reservationTerms.minHours || 1} hour(s)` },
                    { label: 'Maximum Booking', value: 'Depending on closing cut-off' },
                    { label: 'Grace Period', value: '15 minutes' },
                    { label: 'Cancellation Policy', value: reservationTerms.cancellationPolicy },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-2 border-b border-neutral-800/60"><span className="text-neutral-500">{label}</span><span className="text-neutral-200 font-medium text-right ml-2">{value}</span></div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ EVENTS SECTION ════ */}
          {activeSection === 'events' && (
            <motion.div key="events" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="max-w-screen-md mx-auto px-5 pb-20">
              <div className="text-center mb-10 mt-6">
                <h2 className="text-3xl font-black text-white tracking-tight uppercase mb-3">Events & Tournaments</h2>
                <p className="text-neutral-400 max-w-sm mx-auto text-sm">Join our exclusive tournaments, leagues, and special events.</p>
              </div>

              {upcomingEvents.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Calendar size={16} /> Upcoming Events
                  </h3>
                  <div className="space-y-6">
                    {upcomingEvents.map((event: any) => (
                      <div key={event.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden relative group transition-all hover:border-emerald-600/30 flex flex-col">
                        {event.attachments && event.attachments.length > 0 ? (
                          <div className="w-full h-48 sm:h-64 bg-neutral-800 overflow-hidden relative flex-shrink-0">
                            {/* 🟢 FIXED: Events Fallback Image handling */}
                            <ImageWithFallback src={event.attachments[0]} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent" />
                          </div>
                        ) : (
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                        )}
                        <div className="p-6 relative z-10 flex-1 flex flex-col">
                          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4">
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-md mb-2 inline-block truncate max-w-full">{event.type}</span>
                              <h3 className="text-xl font-bold text-neutral-100 mb-1 line-clamp-2" title={event.title}>{event.title}</h3>
                            </div>
                            <div className="text-left sm:text-right shrink-0"><p className="text-sm font-black text-emerald-500 bg-emerald-950/30 border border-emerald-900/50 px-3 py-1 rounded-lg">{new Date(event.date.split(',')[0]).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
                          </div>
                          <p className="text-sm text-neutral-400 mb-6 leading-relaxed flex-1 line-clamp-4">{event.description}</p>
                          <div className="flex items-center justify-between border-t border-neutral-800/60 pt-4 mt-auto">
                            <div className="text-xs text-neutral-500 font-medium">{event.maxParticipants ? (event.slotsFull ? <span className="text-rose-400 font-bold bg-rose-950/30 px-2 py-1 rounded">Sold Out</span> : <span>Max {event.maxParticipants} participants</span>) : <span>Open to all</span>}</div>
                            {event.registrationLink ? <a href={event.registrationLink} target="_blank" rel="noopener noreferrer" className="text-xs bg-white text-black font-semibold px-4 py-2.5 rounded-full hover:bg-neutral-200 flex items-center gap-1.5">Register Now <ExternalLink size={12} strokeWidth={2.5} /></a> : <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">No Registration Required</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pastEvents.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Clock size={16} /> Past Events
                  </h3>
                  <div className="space-y-4">
                    {pastEvents.map((event: any) => (
                      <div key={event.id} className="bg-neutral-900/50 border border-neutral-800/60 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                        {event.attachments && event.attachments.length > 0 && (
                          <ImageWithFallback src={event.attachments[0]} alt={event.title} className="w-full sm:w-24 h-24 object-cover rounded-lg flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded uppercase font-bold">{event.type}</span>
                            <h4 className="font-bold text-neutral-200 truncate">{event.title}</h4>
                          </div>
                          <p className="text-xs text-neutral-500 line-clamp-2 mb-2">{event.description}</p>
                          <p className="text-[10px] text-neutral-400 font-medium">Held on: {new Date(event.date.split(',')[0]).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        {event.bracketLink && (
                          <a href={event.bracketLink} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded-md transition-colors flex-shrink-0 whitespace-nowrap">
                            View Results
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {publicEvents.length === 0 && (
                <div className="text-center py-12 border border-dashed border-neutral-800 rounded-xl"><p className="text-neutral-500">No events found. Check back soon!</p></div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        <footer className="bg-neutral-900 border-t border-neutral-800 mt-10 py-8 px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <img src={logoImg} alt="One Shot Bar & Billiards" className="h-8 w-8 object-contain" />
              <span className="text-white font-bold text-sm">One Shot Bar & Billiards</span>
            </div>
            <p className="text-neutral-600 text-xs">
              {cms.address} · Mon–Thu {fmt12(rates?.weekdayStartTime || '12:00')}–{fmt12(rates?.weekdayEndTime || '02:00')} · Fri–Sun {fmt12(rates?.weekendStartTime || '12:00')}–{fmt12(rates?.weekendEndTime || '02:00')}
            </p>
            <p className="text-neutral-700 text-[10px]">© 2026 One Shot Bar & Billiards. All rights reserved.</p>
          </div>
        </footer>
      </main>

      {/* ════ MODALS ════ */}
      <AnimatePresence>
        {showProfileModal && currentUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowProfileModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} onClick={e => e.stopPropagation()} className="bg-neutral-950 border border-neutral-800 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden">
              
              {/* 🟢 DECORATIVE BACKGROUND GLOW */}
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-900/20 to-transparent pointer-events-none" />
              
              <div className="p-7 relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-2xl font-black text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-4 ring-neutral-950">
                        {currentUser.name[0]}
                      </div>
                      {/* Floating Badge for Trusted Users */}
                      {isTrustedCustomer && (
                        <div className="absolute -bottom-1 -right-1 bg-neutral-950 rounded-full p-1 border border-emerald-900/50">
                          <Shield size={12} className="text-emerald-400 fill-emerald-400/20" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-white leading-tight truncate">{currentUser.name}</h3>
                      <p className="text-xs text-emerald-400/70 font-medium truncate mt-0.5">{currentUser.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowProfileModal(false)} className="text-neutral-500 hover:text-white transition-colors bg-neutral-900/50 p-1.5 rounded-full hover:bg-neutral-800 border border-neutral-800"><X size={16} /></button>
                </div>

                <div className="space-y-4">
                  
                  {/* 🟢 TRUST STATUS GAMIFICATION CARD */}
                  {isTrustedCustomer ? (
                    <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-2xl p-5 flex items-start gap-4 shadow-lg shadow-emerald-900/10 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl" />
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Shield size={20} className="text-emerald-400" />
                      </div>
                      <div className="relative z-10">
                        <h4 className="text-sm font-black text-emerald-400 mb-1">Trusted Customer</h4>
                        <p className="text-[10px] text-emerald-200/70 leading-relaxed">
                          Zero-downpayment bookings unlocked! Your stellar track record (Score: {netTrustScore}) keeps this perk active.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
                      <div className="flex items-start gap-3 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                          <Lock size={14} className="text-neutral-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-neutral-200 flex items-center justify-between">
                            Standard Tier
                            <span className="text-[10px] text-emerald-500 font-black">{Math.max(0, netTrustScore)} / 3</span>
                          </h4>
                          <p className="text-[10px] text-neutral-500 leading-relaxed mt-1">
                            Complete {Math.max(0, 3 - netTrustScore)} more bookings without missing to unlock zero-downpayment Trusted Status.
                          </p>
                          {/* Animated Progress Bar */}
                          <div className="w-full bg-neutral-950 rounded-full h-1.5 mt-3 overflow-hidden border border-neutral-800/50">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(Math.max(0, netTrustScore) / 3) * 100}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 🟢 SLEEK METRICS DASHBOARD */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-neutral-900/50 border border-neutral-800/80 p-3 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:bg-neutral-900 transition-colors">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl transition-all group-hover:bg-emerald-500/10" />
                      <CheckCircle size={14} className="text-emerald-500/40 mb-1" />
                      <p className="text-2xl font-black text-white">{completedBookings}</p>
                      <p className="text-[8px] text-neutral-500 uppercase tracking-widest font-bold mt-1">Completed</p>
                    </div>
                    <div className="bg-neutral-900/50 border border-neutral-800/80 p-3 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:bg-neutral-900 transition-colors">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/5 rounded-full blur-xl transition-all group-hover:bg-sky-500/10" />
                      <Clock size={14} className="text-sky-500/40 mb-1" />
                      <p className="text-2xl font-black text-sky-400">{totalHoursPlayed}</p>
                      <p className="text-[8px] text-neutral-500 uppercase tracking-widest font-bold mt-1">Hours Played</p>
                    </div>
                    <div className="bg-neutral-900/50 border border-neutral-800/80 p-3 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:bg-neutral-900 transition-colors">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-xl transition-all group-hover:bg-rose-500/10" />
                      <XCircle size={14} className="text-rose-500/40 mb-1" />
                      <p className="text-2xl font-black text-rose-400">{missedBookings}</p>
                      <p className="text-[8px] text-neutral-500 uppercase tracking-widest font-bold mt-1">Missed</p>
                    </div>
                  </div>
                
                {/* 🟢 POLISHED ACTIONS */}
                <div className="mt-6 pt-6 border-t border-neutral-800/60 flex flex-col gap-3">
                  <button onClick={() => { setShowProfileModal(false); setActiveSection('reservations'); setResTab('track'); }} className="w-full flex items-center justify-center gap-2 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold py-3.5 rounded-xl transition-colors text-sm shadow-sm">
                    <BookOpen size={16} className="text-emerald-500" /> View My Bookings
                  </button>
                  <button onClick={async () => { await supabase.auth.signOut(); setShowProfileModal(false); }} className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-rose-950/30 text-rose-400/80 hover:text-rose-400 font-semibold py-3 rounded-xl transition-colors text-xs">
                    Sign Out
                  </button>
                </div>
              </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuthModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAuthModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} onClick={e => e.stopPropagation()} className="bg-neutral-950 border border-neutral-800 rounded-3xl p-7 w-full max-w-sm shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto hide-scrollbar">
              
              {authMode === 'options' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-2xl font-black text-white">Sign In</h3>
                    <button onClick={() => setShowAuthModal(false)} className="text-neutral-500 hover:text-white transition-colors"><X size={20} /></button>
                  </div>
                  <p className="text-xs text-neutral-400 mb-5">Enter your email to sign in or create a new account.</p>
                  
                  <div className="space-y-3">
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      value={loginForm.email} 
                      onChange={e => {
                        setLoginForm(f => ({ ...f, email: e.target.value, error: '' }));
                        setRegisterForm(f => ({ ...f, email: e.target.value, error: '' }));
                        setForgotForm(f => ({ ...f, email: e.target.value, error: '' }));
                      }} 
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3.5 text-sm text-neutral-100 focus:border-emerald-500 outline-none transition-colors" 
                    />
                    <button 
                      onClick={() => setAuthMode('login')} 
                      disabled={!loginForm.email.includes('@')}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/30 transition-colors"
                    >
                      Continue with Email
                    </button>
                  </div>

                  <div className="flex items-center gap-3 py-3 mt-2">
                    <div className="flex-1 h-px bg-neutral-800" />
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold tracking-wider">or continue with</span>
                    <div className="flex-1 h-px bg-neutral-800" />
                  </div>

                  <div className="space-y-3">
                    <button onClick={() => handleOAuthLogin('google')} className="w-full bg-white hover:bg-neutral-200 text-black font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Continue with Google
                    </button>
                    <button onClick={() => handleOAuthLogin('facebook')} className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Continue with Facebook
                    </button>
                    <button onClick={() => handleOAuthLogin('apple')} className="w-full bg-black hover:bg-neutral-900 border border-neutral-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg"><path d="M12 20.684c-1.631 0-3.136-.5-4.407-1.391-.19-.134-.336-.312-.416-.519l-2.029-5.263c-.156-.405-.246-.838-.246-1.284 0-1.898 1.155-3.52 2.845-4.238 1.196-.508 2.557-.591 3.824-.236.425.119.882.119 1.306 0 1.267-.355 2.628-.272 3.824.236 1.69.718 2.845 2.34 2.845 4.238 0 .446-.09.879-.246 1.284l-2.029 5.263c-.08.207-.226.385-.416.519-1.271.89-2.776 1.391-4.407 1.391zm.703-14.779c-1.312 0-2.435-.85-2.834-2.062-.128-.387-.197-.8-.197-1.218 0-1.312.85-2.435 2.062-2.834.387-.128.8-.197 1.218-.197 1.312 0 2.435.85 2.834 2.062.128.387.197.8.197 1.218 0 1.312-.85 2.435-2.062 2.834-.387.128-.8.197-1.218.197z"/></svg>
                      Continue with Apple
                    </button>
                  </div>

                  <p className="text-center text-xs text-neutral-500 mt-6">
                    Don't have an account? <button onClick={() => setAuthMode('register')} className="text-emerald-400 hover:underline font-bold">Register</button>
                  </p>
                </div>
              )}

              {authMode === 'login' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2 border-b border-neutral-800/60 pb-4">
                    <button onClick={() => setAuthMode('options')} className="text-neutral-500 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                    <h3 className="text-lg font-bold text-white flex-1">Enter Password</h3>
                    <button onClick={() => setShowAuthModal(false)} className="text-neutral-600 hover:text-white"><X size={18} /></button>
                  </div>
                  {loginForm.error && <div className="bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs px-3 py-2 rounded-lg">{loginForm.error}</div>}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1.5">Email Address</label>
                      <input type="email" disabled value={loginForm.email} className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-500 outline-none cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1.5">Password</label>
                      <div className="relative">
                        <input type={loginForm.showPw ? 'text' : 'password'} autoFocus placeholder="Enter your password" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value, error: '' }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 pr-10 text-sm text-neutral-100 focus:border-emerald-500 outline-none transition-colors" />
                        <button onClick={() => setLoginForm(f => ({ ...f, showPw: !f.showPw }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">{loginForm.showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      </div>
                    </div>
                  </div>
                  <button onClick={handleLoginSubmit} disabled={loginForm.loading} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/30 transition-colors">
                    {loginForm.loading ? 'Signing in...' : 'Sign In securely'}
                  </button>
                  <p className="text-center text-xs text-neutral-500 mt-4">
                    Forgot your password? <button onClick={() => setAuthMode('forgot')} className="text-emerald-400 hover:underline font-bold">Reset it</button>
                  </p>
                </div>
              )}

              {authMode === 'register' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2 border-b border-neutral-800/60 pb-4">
                    <button onClick={() => setAuthMode('options')} className="text-neutral-500 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                    <h3 className="text-lg font-bold text-white flex-1">Create Account</h3>
                    <button onClick={() => setShowAuthModal(false)} className="text-neutral-600 hover:text-white"><X size={18} /></button>
                  </div>
                  {registerForm.error && <div className="bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs px-3 py-2 rounded-lg">{registerForm.error}</div>}
                  <div className="space-y-3">
                    {[ { key: 'name', label: 'Full Name', type: 'text' }, { key: 'email', label: 'Email Address', type: 'email' }, { key: 'phone', label: 'Contact Number', type: 'tel' }].map(({ key, label, type }) => (
                      <div key={key}><label className="block text-xs text-neutral-400 mb-1.5">{label}</label><input type={type} inputMode={key === 'phone' ? 'numeric' : undefined} value={(registerForm as any)[key]} onChange={e => setRegisterForm(f => ({ ...f, [key]: key === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 13) : e.target.value, error: '' }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500 outline-none transition-colors" /></div>
                    ))}
                    <div><label className="block text-xs text-neutral-400 mb-1.5">Password</label><div className="relative"><input type={registerForm.showPw ? 'text' : 'password'} value={registerForm.password} onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value, error: '' }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 pr-10 text-sm text-neutral-100 focus:border-emerald-500 outline-none transition-colors" /><button onClick={() => setRegisterForm(f => ({ ...f, showPw: !f.showPw }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">{registerForm.showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                    <div><label className="block text-xs text-neutral-400 mb-1.5">Confirm Password</label><input type="password" value={registerForm.confirm} onChange={e => setRegisterForm(f => ({ ...f, confirm: e.target.value, error: '' }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500 outline-none transition-colors" /></div>
                  </div>
                  <button onClick={handleRegisterSubmit} disabled={registerForm.loading} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/30 transition-colors">
                    {registerForm.loading ? 'Creating Account...' : 'Register Account'}
                  </button>
                </div>
              )}

              {/* 🟢 NEW: Forgot Password Mode */}
              {authMode === 'forgot' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2 border-b border-neutral-800/60 pb-4">
                    <button onClick={() => setAuthMode('login')} className="text-neutral-500 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                    <h3 className="text-lg font-bold text-white flex-1">Reset Password</h3>
                    <button onClick={() => setShowAuthModal(false)} className="text-neutral-600 hover:text-white"><X size={18} /></button>
                  </div>
                  
                  {forgotForm.success ? (
                    <div className="bg-emerald-950/20 border border-emerald-900/40 p-5 rounded-xl text-center">
                      <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
                      <p className="text-emerald-400 font-bold mb-1">Recovery Link Sent!</p>
                      <p className="text-xs text-neutral-400">Check your email ({forgotForm.email}) for the secure reset link.</p>
                      <button onClick={() => setAuthMode('options')} className="mt-4 w-full py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-xs font-semibold transition-colors">Back to Sign In</button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-neutral-400 mb-2">Enter your email address and we'll send you a secure link to reset your password.</p>
                      {forgotForm.error && <div className="bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs px-3 py-2 rounded-lg">{forgotForm.error}</div>}
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1.5">Email Address</label>
                        <input type="email" autoFocus value={forgotForm.email} onChange={e => setForgotForm(f => ({ ...f, email: e.target.value, error: '' }))} placeholder="juan@email.com" className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-neutral-100 focus:border-emerald-500 outline-none transition-colors" />
                      </div>
                      <button onClick={handleForgotSubmit} disabled={forgotForm.loading || !forgotForm.email.includes('@')} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/30 transition-colors">
                        {forgotForm.loading ? 'Sending...' : 'Send Recovery Link'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRegPromoModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-neutral-950 border border-neutral-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-sky-500" />
              <button onClick={() => setShowRegPromoModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white"><X size={18} /></button>
              
              <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-6 border border-neutral-800 shadow-inner">
                <Sparkles size={28} className="text-emerald-400" />
              </div>
              
              <h3 className="text-2xl font-black text-white mb-2">Wait! Don't book as a guest.</h3>
              <p className="text-neutral-400 text-sm mb-6 leading-relaxed">Register an account with One Shot Bar & Billiards today and unlock an upgraded experience.</p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5"><CheckCircle size={14} className="text-emerald-400" /></div>
                  <div><p className="text-sm font-bold text-neutral-200">Faster Checkout</p><p className="text-xs text-neutral-500">Your details are saved for your next game.</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5"><BookOpen size={14} className="text-emerald-400" /></div>
                  <div><p className="text-sm font-bold text-neutral-200">Track Bookings Easily</p><p className="text-xs text-neutral-500">View your active and past reservations instantly.</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5"><Tag size={14} className="text-emerald-400" /></div>
                  <div><p className="text-sm font-bold text-neutral-200">Exclusive Promos</p><p className="text-xs text-neutral-500">Get access to member-only discount codes.</p></div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button onClick={() => { setShowRegPromoModal(false); setAuthMode('email_register'); setShowAuthModal(true); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/30">Create an Account</button>
                <button onClick={() => setShowRegPromoModal(false)} className="w-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 font-semibold py-3.5 rounded-xl border border-neutral-800 transition-colors">Continue as Guest</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {reservationStep === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto hide-scrollbar">
              <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
                <div><h3 className="text-base font-bold text-white">Payment & Confirmation</h3></div>
                <button onClick={closeReservation} className="text-neutral-600 hover:text-white transition-colors"><X size={18} /></button>
              </div>
              <div className="p-6">
                
                {/* 🟢 THE WAIVER UI OVERRIDE */}
                {isDownPaymentWaived ? (
                  <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-xl p-6 mb-5 text-center shadow-lg shadow-emerald-900/20 animate-in fade-in zoom-in-95">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Shield size={24} className="text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-black text-emerald-400 mb-1">Trusted Customer Benefit</h3>
                    <p className="text-xs text-emerald-300/80 font-medium mb-4 leading-relaxed">
                      Because of your proven booking reliability (Trust Score: {netTrustScore}), your GCash down payment requirement is <strong className="text-white">completely waived</strong> for this session.
                    </p>
                    <div className="inline-flex items-center gap-2 bg-neutral-900/80 px-4 py-2 rounded-lg border border-neutral-800">
                       <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Pay At Venue</span>
                       <span className="text-sm font-black text-white">₱{totalAmount}.00</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-amber-950/30 border border-amber-800/30 rounded-xl p-4 mb-5 text-center">
                      <p className="text-xs text-amber-500 mb-1">Amount Due ({rates?.downPaymentPercent ?? 25}% Down Payment)</p>
                      <p className="text-4xl font-black text-amber-400">₱{downPayment}.00</p>
                      <p className="text-xs text-neutral-500 mt-1">Remaining balance <span className="text-neutral-300 font-semibold">₱{totalAmount - downPayment}.00</span> must be paid after your game</p>
                    </div>
                    
                    <div className="flex flex-col items-center gap-4">
                      <QRDisplay pattern={QR_GCASH} color="#1d4ed8" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-blue-400">GCash</p>
                        <p className="text-xs text-neutral-300 font-semibold">ONE SHOT BAR & BILLIARDS</p>
                        <p className="text-xs text-neutral-500">+63 917-123-4567</p>
                      </div>
                      
                      <div className="w-full mt-2 text-left">
                        <label className="block text-xs text-neutral-400 mb-1.5">Upload Receipt Screenshot <span className="text-rose-500">*</span></label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 cursor-pointer bg-neutral-950 border border-dashed border-neutral-700 hover:border-blue-500 rounded-lg px-3 py-3 text-center transition-colors flex flex-col items-center justify-center gap-1">
                            <input type="file" accept="image/*" className="hidden" onChange={e => { 
                              const file = e.target.files?.[0]; 
                              if (file) {
                                setReceiptImg(URL.createObjectURL(file)); 
                                setReceiptFile(file);
                              } 
                            }} />
                              <Upload size={14} className="text-neutral-500" />
                            <span className="text-[10px] text-neutral-400">{receiptImg ? 'Change Image' : 'Tap to upload'}</span>
                          </label>
                          {receiptImg && (
                            <div className="w-14 h-14 rounded-lg border border-neutral-700 overflow-hidden flex-shrink-0 bg-neutral-900">
                              <img src={receiptImg} alt="Receipt" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mt-5 mb-5 max-h-44 overflow-y-auto">
                  <p className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
                    <BookOpen size={12} className="text-emerald-500" /> Reservation Terms & Conditions
                  </p>
                  <ul className="space-y-2 text-[10px] text-neutral-400 leading-relaxed">
                    <li>• Minimum booking duration is {reservationTerms.minHours || 1} hour(s).</li>
                    <li>• Maximum booking duration (based on cut-off) is {maxAllowedDuration} hour(s).</li>
                    <li>• Online booking window: {fmt12(rates?.reservationStartTime || '12:00')} to {fmt12(((() => { const e = rates?.reservationEndTime || '02:00'; const [hh, mm] = e.split(':').map(Number); let em = hh*60 + (mm||0); const sm = (rates?.reservationStartTime||'12:00').split(':').map(Number); let smm = sm[0]*60 + (sm[1]||0); if (em <= smm) em += 24*60; return em - 60; })()))} (cutoff 1 hour before close)</li>
                    <li>• Store hours: {fmt12(rates?.reservationStartTime || '12:00')} — {fmt12(rates?.reservationEndTime || '02:00')}</li>
                    {!isDownPaymentWaived && <li>• A {rates?.downPaymentPercent ?? 25}% down payment is required to secure your slot.</li>}
                    <li>• Remaining balance must be settled after your session.</li>
                    <li>• Online capacity limit: {rates?.onlineCapacityLimit ?? 70}% of tables (admin-configured)</li>
                    <li>• {reservationTerms.cancellationPolicy}</li>
                    <li>• {reservationTerms.termsAndConditions}</li>
                  </ul>
                </div>

                <label className="flex items-start gap-2 text-[11px] text-neutral-400 cursor-pointer mb-5">
                  <input type="checkbox" checked={agreedToTerms} onChange={() => setAgreedToTerms(prev => !prev)} className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-emerald-500" />
                  <span>I have read and agree to the reservation terms and conditions.</span>
                </label>

                <button 
                  onClick={handlePaymentConfirm} 
                  disabled={confirmingPayment || (!isDownPaymentWaived && !receiptImg) || !agreedToTerms} 
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                >
                  {confirmingPayment ? 'Processing...' : (isDownPaymentWaived ? <><CheckCircle size={15} /> Confirm Reservation</> : <><CheckCircle size={15} /> I've Sent the Payment</>)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reservationStep === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200 }} className="w-16 h-16 rounded-full bg-emerald-600/15 border border-emerald-600/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-400" />
              </motion.div>
              <h3 className="text-xl font-black text-white mb-2">Reservation Submitted!</h3>
              <p className="text-neutral-500 text-sm mb-4">Your reservation has been submitted. Our staff will verify your payment and confirm shortly.</p>
              <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 mb-5 text-center">
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold mb-1">Your Reservation ID</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black text-white tracking-[0.2em] font-mono">{generatedResId}</span>
                </div>
              </div>
              <button onClick={closeReservation} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-semibold transition-all">Back to Home</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {closureAlert && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-neutral-950 border border-rose-900/50 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative overflow-hidden text-center">
               <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20 shadow-inner mx-auto">
                  <AlertTriangle size={28} className="text-rose-500" />
               </div>
               <h3 className="text-2xl font-black text-rose-400 mb-2">Venue Closed</h3>
               <p className="text-neutral-300 font-semibold mb-2">{format(closureAlert.date, 'MMMM d, yyyy')}</p>
               <p className="text-neutral-400 text-sm mb-6 leading-relaxed bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                 {closureAlert.reason || "We are closed on this date. Please select another date for your reservation."}
               </p>
               <button onClick={() => setClosureAlert(null)} className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg border border-neutral-700">
                 Understood
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟢 RECAPTCHA COMMENTED OUT FOR NOW 
      <ReCAPTCHA
        ref={recaptchaRef}
        size="invisible"
        badge="bottomright"
        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6Lcg9I4tAAAAADU4f_xcNh2_awMqHzoytxBo4dnc"}
      />
      */}
    </div>
  );
}