import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { addMinutes, differenceInSeconds, format, isToday, isBefore, startOfDay, isSameDay } from 'date-fns';
import {
  ChevronLeft, ChevronRight, X, Phone, MapPin,
  Clock, LogIn, UserPlus, Eye, EyeOff,
  Calendar, CheckCircle, ArrowRight, Users, ChevronDown,
  Megaphone, Info, Shield, Award, Mail, Tag, BookOpen,
  Sparkles, Upload, Search, ExternalLink, ImageIcon, AlertTriangle, XCircle
} from 'lucide-react';
import { useAppContext, HOURLY_RATE, DOWN_PAYMENT_RATE } from '../context/AppContext';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

import logoImg from 'figma:asset/40eb82831843e17a3c48a360fd80f0aaaa58ddc8.png';
import heroImg1 from 'figma:asset/15fb8dcab89448c8f2ad20fb9946631b1c246968.png';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

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

function MiniCalendar({ selectedDate, onSelect, reservedDates, closedDates }: { selectedDate: Date | null; onSelect: (d: Date) => void; reservedDates: Date[]; closedDates: Date[]; }) {
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
  const isClosed = (date: Date) => closedDates.some(cd => { const d = new Date(cd); d.setHours(0, 0, 0, 0); return d.getTime() === date.getTime(); });
  const isPast = (date: Date) => date < today;
  const isSelected = (date: Date) => selectedDate ? date.getTime() === (() => { const s = new Date(selectedDate); s.setHours(0,0,0,0); return s.getTime(); })() : false;
  const isTodayDate = (date: Date) => date.getTime() === today.getTime();

  return (
    <div className="bg-[#111111] rounded-2xl border border-neutral-800/80 p-5 pb-6 shadow-xl select-none">
      <div className="flex items-center justify-between mb-6 px-2">
        <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1))} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"><ChevronLeft size={16} /></button>
        <span className="text-sm font-semibold text-white">{MONTHS[month]} {year}</span>
        <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1))} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 mb-4">
        {DAYS_OF_WEEK.map(d => <div key={d} className="text-center text-[9px] text-neutral-500 font-medium uppercase tracking-widest">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-3">
        {cells.map(({ day, currentMonth, date }, idx) => {
          const past = isPast(date); const selected = isSelected(date); const today_ = isTodayDate(date);
          const reserved = isReserved(date) && currentMonth; const closed = isClosed(date) && currentMonth;
          const clickable = currentMonth && !past && !closed;
          return (
            <div key={idx} className="flex justify-center">
              <button type="button" disabled={!clickable} onClick={() => clickable && onSelect(date)} className={`relative flex flex-col items-center justify-center w-10 h-11 rounded-xl text-xs transition-all ${!currentMonth ? 'opacity-20 cursor-default' : ''} ${past && currentMonth ? 'opacity-30 cursor-default text-neutral-600' : ''} ${closed && !past && currentMonth ? 'opacity-50 cursor-not-allowed text-rose-500' : ''} ${selected ? 'border border-emerald-500 text-emerald-400 bg-emerald-500/5' : ''} ${!selected && today_ && !closed ? 'border border-emerald-500 text-emerald-400' : ''} ${!selected && clickable && !today_ ? 'text-neutral-300 hover:bg-neutral-800' : ''}`}>
                <span className={selected ? 'font-bold' : 'font-medium'}>{day}</span>
                {reserved && !selected && !closed && <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-amber-500" />}
                {selected && <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-emerald-500" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { siteConfig, announcements, tables, queue, reservations, events, closedDates, reservationTerms, rates, addReservation, cancelReservation, updateReservation, addFeedback, applyPromoCode, adminLogin, staffLogin } = useAppContext() as any;

  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [announcementDir, setAnnouncementDir] = useState<1 | -1>(1);

  const [heroSlideIdx, setHeroSlideIdx] = useState(0);
  const [heroSlideDir, setHeroSlideDir] = useState<1 | -1>(1);
  const [now, setNow] = useState(new Date());
  const [activeSection, setActiveSection] = useState<Section>('home');

  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '', showPw: false, error: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', showPw: false, error: '' });

  const [reservationStep, setReservationStep] = useState<0 | 1 | 2 | 3>(0);
  const [resTab, setResTab] = useState<'new' | 'track'>('new');
  const [trackForm, setTrackForm] = useState({ reservationId: '' });
  const [trackedReservations, setTrackedReservations] = useState<any[] | null>(null);
  const [generatedResId, setGeneratedResId] = useState('');
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isPreferredTableExpanded, setIsPreferredTableExpanded] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLiveMonitorOpen, setIsLiveMonitorOpen] = useState(false);
  
  const [resForm, setResForm] = useState({ name: '', email: '', phone: '', pax: 2, timeSlot: '', duration: 2 });
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleData, setRescheduleData] = useState<{ date: Date | null; timeSlot: string }>({ date: null, timeSlot: '' });

  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [receiptImg, setReceiptImg] = useState<string | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [feedbackForm, setFeedbackForm] = useState({ name: '', contact: '', type: '', message: '' });
  const [feedbackSent, setFeedbackSent] = useState(false);

  // 🟢 CMS DYNAMIC MAPPING 
  const activeAnnouncements = announcements?.filter((a: any) => a.isActive && (!a.expiresAt || new Date(a.expiresAt) > new Date())) || [];
  const displayAnnouncements = activeAnnouncements.length > 0 
    ? activeAnnouncements.map((a: any) => a.content) 
    : ["🎱 Welcome to One Shot Bar & Billiards! Book your favorite table now!"];

  // Safely parse hero images from the siteConfig
  let heroSlides = [{ src: heroImg1, alt: 'One Shot Facility' }];
  try {
    const parsedImages = typeof siteConfig?.heroImages === 'string' ? JSON.parse(siteConfig.heroImages) : siteConfig?.heroImages;
    if (Array.isArray(parsedImages) && parsedImages.length > 0) {
      heroSlides = parsedImages.map((url: string) => ({ src: url, alt: 'One Shot Facility View' }));
    }
  } catch (e) {}

  const cms = {
    heroTitle: siteConfig?.heroTitle || 'One Shot',
    heroSubtitle: siteConfig?.heroSubtitle || 'Bar & Billiards',
    heroDescription: siteConfig?.heroDescription || 'Your premier billiard destination at Autobase OAX, Cainta, Rizal.',
    aboutTitle: siteConfig?.aboutTitle || 'A Passion for the Game',
    aboutP1: siteConfig?.aboutP1 || 'One Shot Bar & Billiards was founded with a simple mission: to create the ultimate billiard experience in Cainta, Rizal.',
    aboutP2: siteConfig?.aboutP2 || 'Our 10 tournament-grade tables are maintained with precision, and our staff are passionate players themselves.',
    aboutP3: siteConfig?.aboutP3 || 'Whether you are a seasoned champion or picking up a cue for the first time, One Shot welcomes you.',
    aboutImage: siteConfig?.aboutImage || "https://images.unsplash.com/photo-1761335633357-04fab36b333f?q=80",
    address: siteConfig?.address || 'Autobase OAX, San Juan, Cainta, Rizal 1900',
    phone: siteConfig?.phone || '0917-123-4567 | 0998-765-4321',
    email: siteConfig?.email || 'oneshot.billiards@gmail.com',
    facebook: siteConfig?.facebook || '@OneShotBilliards',
    instagram: siteConfig?.instagram || '@oneshot_billiards',
    tiktok: siteConfig?.tiktok || '@oneshotbilliards',
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncementDir(1);
      setAnnouncementIdx(prev => (prev + 1) % displayAnnouncements.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [displayAnnouncements.length]);

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
    if (currentUser) {
      setResForm(f => ({ ...f, name: currentUser.name, email: currentUser.email }));
      setResTab('track'); // Auto-switch to track tab when logged in
    }
  }, [currentUser]);

  useEffect(() => {
    setAgreedToTerms(false);
  }, [selectedDate]);

  // Persist reservation draft to localStorage so closing dialogs doesn't lose input
  const RES_DRAFT_KEY = 'oneshot_reservation_draft_v1';

  const saveReservationDraft = useCallback(() => {
    try {
      const draft = {
        selectedDate: selectedDate ? selectedDate.toISOString() : null,
        selectedTableId,
        resForm,
        promoCodeInput,
        appliedPromo,
        paymentRef,
        receiptImg,
        resTab,
        reservationStep
      };
      localStorage.setItem(RES_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) { console.warn('Failed to save draft', e); }
  }, [selectedDate, selectedTableId, resForm, promoCodeInput, appliedPromo, paymentRef, receiptImg, resTab, reservationStep]);

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
      if (d.paymentRef) setPaymentRef(d.paymentRef);
      if (d.receiptImg) setReceiptImg(d.receiptImg);
      if (d.resTab) setResTab(d.resTab);
    } catch (e) { console.warn('Failed to load draft', e); }
  }, []);

  useEffect(() => {
    loadReservationDraft();
  }, [loadReservationDraft]);

  // Save draft on significant changes
  useEffect(() => {
    saveReservationDraft();
  }, [saveReservationDraft]);

  useEffect(() => {
    if (selectedTableId) {
      setIsPreferredTableExpanded(false);
    }
  }, [selectedTableId]);

  const effectiveHourly = (rates && Number(rates.hourlyRate) > 0) ? Number(rates.hourlyRate) : HOURLY_RATE;
  const baseAmount = Number(resForm.duration) * effectiveHourly;
  const discountAmount = appliedPromo ? Math.floor(baseAmount * appliedPromo.discountPercent / 100) : 0;
  const totalAmount = baseAmount - discountAmount;
  const downPaymentPercentVal = rates && Number(rates.downPaymentPercent) >= 0 ? Number(rates.downPaymentPercent) : DOWN_PAYMENT_RATE * 100;
  const downPayment = Math.ceil(totalAmount * (downPaymentPercentVal ? downPaymentPercentVal / 100 : DOWN_PAYMENT_RATE));

  const handleLoginSubmit = () => {
    if (!loginForm.email || !loginForm.password) {
      setLoginForm(f => ({ ...f, error: 'Please fill all fields.' }));
      return;
    }
    const name = loginForm.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    setCurrentUser({ name, email: loginForm.email });
    setShowLoginModal(false);
    setLoginForm({ email: '', password: '', showPw: false, error: '' });
  };

  const handleRegisterSubmit = () => {
    if (!registerForm.name || !registerForm.email || !registerForm.phone || !registerForm.password) {
      setRegisterForm(f => ({ ...f, error: 'Please fill all required fields.' }));
      return;
    }
    if (registerForm.password !== registerForm.confirm) {
      setRegisterForm(f => ({ ...f, error: 'Passwords do not match.' }));
      return;
    }
    setCurrentUser({ name: registerForm.name, email: registerForm.email });
    setShowRegisterModal(false);
    setRegisterForm({ name: '', email: '', phone: '', password: '', confirm: '', showPw: false, error: '' });
  };

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

  // 🟢 NEW: Dynamic Duration & Capacity Logic
 // 🟢 NEW: Precise Minute-Based Duration & Capacity Logic
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

    // treat end as next day if it's earlier or equal to start
    if (endMins <= startMins) endMins += 24 * 60;

    // if slot is before start (unlikely) normalize to same day
    let normalizedSlotMins = slotMins;
    if (slotMins < startMins) normalizedSlotMins += 24 * 60;

    const minsUntilClose = endMins - normalizedSlotMins;
    const hoursUntilClose = Math.floor(minsUntilClose / 60);
    const maxAllowed = reservationTerms?.maxHours || 6;

    return Math.max(1, Math.min(hoursUntilClose, maxAllowed));
  };

  const maxAllowedDuration = getMaxDuration();

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

  // Compute online booking display hours with a cutoff 1 hour before closing
  const bookingHoursDisplay = (() => {
    try {
      const start = rates?.reservationStartTime || '12:00';
      const end = rates?.reservationEndTime || '02:00';
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);

      let startMins = sh * 60 + (sm || 0);
      let endMins = eh * 60 + (em || 0);
      // If end <= start, treat end as next day
      if (endMins <= startMins) endMins += 24 * 60;

      const cutoffMins = endMins - 60; // 1 hour before closing
      if (cutoffMins <= startMins) return 'No online bookings';

      // format provided start time into 12-hour display as well
      const startDisplay = fmt12(start);
      return `${startDisplay} to ${fmt12(cutoffMins)}`;
    } catch (e) {
      return `${rates?.reservationStartTime || '12:00'} to ${rates?.reservationEndTime || '02:00'}`;
    }
  })();

  // Auto-shrink the duration if they select a late time
  useEffect(() => {
    if (resForm.duration > maxAllowedDuration) {
      setResForm(f => ({ ...f, duration: maxAllowedDuration }));
    }
  }, [maxAllowedDuration, resForm.timeSlot]);

  const validateTimeSlot = (time: string, duration: number) => {
    if(!time || !selectedDate) return 'invalid';

    const parseToMins = (t: string) => {
      const [hh = '0', mm = '0'] = (t || '').split(':');
      return Number(hh) * 60 + Number(mm || 0);
    };

    const slotMins = parseToMins(time);
    const startReserveMins = parseToMins(rates?.reservationStartTime || '12:00');
    let endReserveMins = parseToMins(rates?.reservationEndTime || '02:00');
    if (endReserveMins <= startReserveMins) endReserveMins += 24 * 60;

    let normalizedSlot = slotMins;
    if (slotMins < startReserveMins) normalizedSlot += 24 * 60;

    if (normalizedSlot < startReserveMins || normalizedSlot >= endReserveMins) return 'closed';

    if (rates?.isHappyHourActive) {
      const startHour = parseToMins(rates.happyHourStart || '18:00');
      const endHour = parseToMins(rates.happyHourEnd || '19:00');
      let s = startHour; let e = endHour;
      if (e <= s) e += 24 * 60;
      let slotNorm = slotMins;
      if (slotMins < s) slotNorm += 24 * 60;
      if (slotNorm >= s && slotNorm < e) return 'happyhour';
    }

    // 🟢 NEW: 70/30 Rule Overlap Checker
    const requestedStart = new Date(selectedDate);
    const [h, m] = time.split(':').map(Number);
    requestedStart.setHours(h, m, 0, 0);
    const requestedEnd = addMinutes(requestedStart, duration * 60);

    let overlapCount = 0;
    const sameDayRes = reservations.filter((r: any) => 
      r.status !== 'cancelled' && r.status !== 'completed' && isSameDay(new Date(r.date), requestedStart)
    );

    sameDayRes.forEach((r: any) => {
      const rStart = new Date(r.date);
      const rEnd = addMinutes(rStart, r.durationHours * 60);
      // Overlap math: Does the new request start before the existing ends, AND end after the existing starts?
      if (requestedStart < rEnd && requestedEnd > rStart) {
        overlapCount++;
      }
    });

    // Capacity limit is controlled by the admin policy editor slider
    const capacityLimit = Number(rates?.onlineCapacityLimit ?? 70);
    const maxOnlineCapacity = Math.max(1, Math.floor((tables.length || 10) * (capacityLimit / 100)));
    if (overlapCount >= maxOnlineCapacity) return 'full';

    return 'valid';
  };

  const timeValidation = validateTimeSlot(resForm.timeSlot, resForm.duration);



  const handleReservationSubmit = () => {
    if (!resForm.name || !resForm.phone || !selectedDate || !resForm.timeSlot || timeValidation !== 'valid') return;
    setReservationStep(2);
  };

  const handlePaymentConfirm = () => {
    setConfirmingPayment(true);
    setTimeout(() => {
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
        tableId: selectedTableId || undefined,
        status: 'pending',
        totalAmount,
        downPaymentAmount: downPayment,
        downPaymentPaid: true,
        balancePaid: false,
        promoCode: appliedPromo?.code,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        paymentRef: paymentRef,
        receiptImg: receiptImg, 
      });

      setGeneratedResId(newId || Math.random().toString(36).substring(2, 8).toUpperCase());
      setConfirmingPayment(false);
      // Clear saved draft since reservation is completed
      try { localStorage.removeItem(RES_DRAFT_KEY); } catch (e) {}
      setReservationStep(3);
    }, 1500);
  };

  const closeReservation = () => {
    // Persist current draft and simply close the modal so user inputs are preserved
    saveReservationDraft();
    setReservationStep(0);
    setAgreedToTerms(false);
    setGeneratedResId('');
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
    const val = validateTimeSlot(rescheduleData.timeSlot);
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
    
    addFeedback({ customerName: feedbackForm.name, contactInfo: feedbackForm.contact, rating: 0, feedbackType: feedbackForm.type as any, comment: feedbackForm.message, tags: [] });
    setFeedbackSent(true);
    setTimeout(() => { setFeedbackSent(false); setFeedbackForm({ name: '', contact: '', type: '', message: '' }); }, 3000);
  };

  const prevHeroSlide = () => { setHeroSlideDir(-1); setHeroSlideIdx(p => (p - 1 + heroSlides.length) % heroSlides.length); };
  const nextHeroSlide = () => { setHeroSlideDir(1); setHeroSlideIdx(p => (p + 1) % heroSlides.length); };

  const calculateAIWaitTime = () => {
    const waitingCustomers = queue.filter((q: any) => q.status === 'waiting').length;
    if (waitingCustomers === 0) return "No wait";

    const activeTables = tables.filter((t: any) => t.status === 'occupied' && t.session);
    if (activeTables.length === 0) return "Available immediately";

    const remainingTimes = activeTables.map((t: any) => {
      const endTime = addMinutes(new Date(t.session!.startTime), t.session!.durationMinutes || 0); 
      return Math.max(0, Math.floor(differenceInSeconds(endTime, now) / 60));
    }).sort((a: any, b: any) => a - b); 

    const baseWait = remainingTimes[0] !== undefined ? remainingTimes[0] : 0;
    const estimatedMinutes = baseWait + 2 + (waitingCustomers * 15);

    if (estimatedMinutes < 60) return `~${estimatedMinutes} mins`;
    const hrs = Math.floor(estimatedMinutes / 60);
    const mins = estimatedMinutes % 60;
    return `~${hrs}h ${mins}m`;
  };

  const publicEvents = events.filter((e: any) => e.type !== 'Holiday');
  const safeClosedDates = closedDates.map((c: any) => new Date(c.date));
  const reservedDates = reservations.filter((r: any) => r.status !== 'cancelled').map((r: any) => new Date(r.date));

  const allNavSections: { id: Section; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'reservations', label: 'Reservations' },
    { id: 'rates', label: 'Rates' },
    { id: 'events', label: 'Events' },
    { id: 'about', label: 'About Us' },
    { id: 'feedback', label: 'Feedback' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">

      {/* ── Top Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/60 flex items-center overflow-hidden">
        <div
          className="h-full flex items-center px-5 pr-12 bg-emerald-700 flex-shrink-0 relative z-10"
          style={{ clipPath: 'polygon(0 0, 100% 0, 82% 100%, 0 100%)', minWidth: 220 }}
        >
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="One Shot Bar & Billiards" className="h-9 w-9 object-contain rounded-lg flex-shrink-0" />
            <div>
              <p className="text-white font-black text-sm tracking-tight leading-tight">ONE SHOT</p>
              <p className="text-emerald-200 text-[9px] uppercase tracking-[0.2em] font-semibold">Bar & Billiards</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center overflow-hidden px-4">
          <div className="flex items-center gap-2 max-w-lg w-full">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
              <Megaphone size={10} className="text-emerald-400" />
            </div>
            <div className="flex-1 overflow-hidden text-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={announcementIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="text-xs text-neutral-300 truncate"
                >
                  {displayAnnouncements[announcementIdx]}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="flex gap-1 flex-shrink-0 hidden sm:flex">
              {displayAnnouncements.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setAnnouncementDir(i > announcementIdx ? 1 : -1); setAnnouncementIdx(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === announcementIdx ? 'bg-emerald-400 w-3' : 'bg-neutral-600 hover:bg-neutral-400'}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pr-4 flex-shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 bg-emerald-600/10 border border-emerald-600/25 rounded-full px-3 py-1.5 hover:bg-emerald-600/20 transition-colors">
                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] font-black text-white">{currentUser.name[0]}</div>
                <span className="text-xs text-emerald-300 font-medium hidden sm:block">{currentUser.name}</span>
              </button>
              <button onClick={() => { setCurrentUser(null); setTrackedReservations(null); }} className="text-[10px] text-neutral-500 hover:text-neutral-300 px-2 py-1.5 transition-colors">Logout</button>
            </div>
          ) : (
            <>
              <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 px-3 py-1.5 rounded-full transition-all">
                <LogIn size={12} /> <span className="hidden sm:inline">Login</span>
              </button>
              <button onClick={() => setShowRegisterModal(true)} className="flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-full transition-all">
                <UserPlus size={12} /> <span className="hidden sm:inline">Register</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Section Navigation ── */}
      <nav className="fixed top-16 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800/60 flex items-center justify-center gap-1 px-4 overflow-x-auto">
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
      <main className="flex-1 pt-32">
        <AnimatePresence mode="wait">
          
          {/* ════ HOME SECTION ════ */}
          {activeSection === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="relative h-[70vh] min-h-[480px] overflow-hidden group">
                <AnimatePresence mode="wait" custom={heroSlideDir}>
                  <motion.div
                    key={heroSlideIdx}
                    custom={heroSlideDir}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9 }}
                    className="absolute inset-0"
                  >
                    <ImageWithFallback src={heroSlides[heroSlideIdx].src} alt={heroSlides[heroSlideIdx].alt} className="w-full h-full object-cover" />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/55 to-transparent" />

                <button onClick={prevHeroSlide} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-10"><ChevronLeft size={18} /></button>
                <button onClick={nextHeroSlide} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-10"><ChevronRight size={18} /></button>

                <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 px-6 text-center z-10">
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="flex flex-col items-center">
                    <p className="text-emerald-400 text-xs uppercase tracking-[0.3em] font-semibold mb-3">{cms.heroTitle}</p>
                    <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">{cms.heroTitle}</h1>
                    <p className="text-emerald-300 text-xl font-light mb-5">{cms.heroSubtitle}</p>
                    <p className="text-neutral-400 text-sm max-w-md mx-auto mb-7 leading-relaxed">{cms.heroDescription}</p>
                    <div className="flex flex-wrap justify-center gap-3 mb-6">
                      <button onClick={() => setActiveSection('reservations')} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full text-sm font-semibold transition-all shadow-lg shadow-emerald-900/40 hover:shadow-emerald-800/60"><Calendar size={15} /> Book a Table</button>
                      <button onClick={() => setActiveSection('about')} className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-6 py-3 rounded-full text-sm font-semibold transition-all border border-neutral-700"><Info size={15} /> Learn More</button>
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
                    { value: '10', label: 'Billiard Tables', color: 'text-emerald-400' },
                    { value: `₱${effectiveHourly}`, label: 'Per Hour', color: 'text-amber-400' },
                    { value: '15+', label: 'Hours Open Daily', color: 'text-sky-400' },
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
                    { icon: Award, title: 'Premium Tables', desc: '10 tournament-grade billiard tables maintained to the highest standard.', color: 'emerald' },
                    { icon: Clock, title: 'Extended Hours', desc: 'Mon–Sat 12:00 PM – 3:00 AM · Sun 5:00 PM – 3:00 AM. Game night starts here!', color: 'amber' },
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
            </motion.div>
          )}

          {/* ════ RESERVATIONS SECTION ════ */}
          {activeSection === 'reservations' && (
            <motion.div key="reservations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="max-w-5xl mx-auto px-6 py-10">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-white mb-2">{currentUser ? `Welcome back, ${currentUser.name.split(' ')[0]}!` : 'Reservations'}</h2>
                <p className="text-neutral-400 text-sm">Secure your spot or track your booking.</p>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start relative pb-20">
                  {/* Custom Mini Calendar */}
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-3">Step 1 — Pick a Date</p>
                    <MiniCalendar
                      selectedDate={selectedDate}
                      onSelect={setSelectedDate}
                      reservedDates={reservedDates}
                      closedDates={safeClosedDates}
                    />
                    {selectedDate && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
                        <div className="bg-emerald-600/10 border border-emerald-600/25 rounded-xl p-3 flex items-center gap-2">
                          <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                          <span className="text-xs text-emerald-300">
                            Selected: <strong>{selectedDate.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                          </span>
                        </div>

                        <div className="rounded-xl border border-emerald-900/20 bg-emerald-950/20 p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Today's Activity Guide</p>
                            <span className="text-[8px] bg-neutral-800 px-1.5 py-0.5 rounded">Max {Number(rates?.onlineCapacityLimit ?? 70)}% Online Limit</span>
                          </div>
                          <div className="space-y-1.5">
                            {reservations
                              .filter((r: any) => r.status !== 'cancelled' && r.status !== 'completed' && isSameDay(new Date(r.date), new Date(selectedDate)))
                              .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                              .map((r: any) => (
                                <div key={r.id} className="flex items-center gap-2 text-[10px]">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                  <span className="text-neutral-400 w-24 flex-shrink-0">{r.timeSlot} — {format(addMinutes(new Date(`2000/01/01 ${r.timeSlot}`), r.durationHours * 60), 'HH:mm')}</span>
                                  <span className="text-neutral-600 truncate">{r.partySize} pax booking</span>
                                </div>
                              ))}
                            {reservations.filter((r: any) => r.status !== 'cancelled' && isSameDay(new Date(r.date), new Date(selectedDate))).length === 0 && (
                              <p className="text-[10px] text-emerald-500 italic flex items-center gap-1">
                                <CheckCircle size={10} /> Wide open! Plenty of tables available today.
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div>
                    {!selectedDate ? (
                      <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
                        <Calendar size={32} className="text-neutral-600" />
                        <p className="text-neutral-500 text-sm">Please select a date from the calendar to continue your reservation.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-3">Step 2 — Your Details</p>
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Full Name <span className="text-rose-500">*</span></label>
                            <input type="text" value={resForm.name} onChange={e => setResForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Juan dela Cruz" className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors" />
                          </div>
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Email Address {currentUser ? '' : <span className="text-neutral-600">(Optional)</span>}</label>
                            <input type="email" value={resForm.email} onChange={e => setResForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@email.com" className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors" />
                          </div>
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Contact Number <span className="text-rose-500">*</span></label>
                            <input type="tel" inputMode="numeric" value={resForm.phone} onChange={e => setResForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 13) }))} placeholder="09XX-XXX-XXXX" className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors" />
                            <p className="mt-1 text-[10px] text-neutral-500">Use 13 digits max, numbers only.</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-neutral-400 mb-1.5">No. of Persons</label>
                              <input type="number" min={1} max={20} value={resForm.pax} onChange={e => setResForm(f => ({ ...f, pax: parseInt(e.target.value) || 1 }))} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500 transition-colors" />
                            </div>
                            <div>
                          <label className="block text-xs text-neutral-400 mb-1.5 flex justify-between">
                            <span>Duration (hours)</span>
                            {resForm.timeSlot && <span className="text-[9px] text-amber-500">Max ~{maxAllowedDuration}h based on cut-off</span>}
                          </label>
                          <select value={resForm.duration} onChange={e => setResForm(f => ({ ...f, duration: parseInt(e.target.value) }))} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500 transition-colors">
                            {/* Dynamically render options up to the max allowed */}
                            {Array.from({ length: maxAllowedDuration }, (_, i) => i + 1).map(h => (
                              <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>
                            ))}
                          </select>
                          </div>
                          </div>
                          
                          {/* FLEXIBLE TIME INPUT */}
                          <div>
  <label className="block text-xs text-neutral-400 mb-1.5 flex items-center gap-1.5">
    <Clock size={13} className="text-white" />
    Preferred Time
  </label>
  <input
    type="time"
    style={{ colorScheme: 'dark' }}
    value={resForm.timeSlot}
    onChange={e => setResForm(f => ({ ...f, timeSlot: e.target.value }))}
    className={`w-full bg-neutral-800 border rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:outline-none transition-colors ${
      timeValidation === 'closed' || timeValidation === 'happyhour' || timeValidation === 'full' ? 'border-rose-500/50' : 'border-neutral-700 focus:border-emerald-500'
    }`}
  />
  
  <p className="text-[10px] text-amber-500/80 mt-2 font-semibold flex items-start gap-1">
    <AlertTriangle size={12} className="flex-shrink-0" />
    <span>Note: We observe a strict 15-minute grace period. Late arrivals may forfeit their table to waiting walk-ins.</span>
  </p>

  {timeValidation === 'closed' && (
    <p className="text-[10px] text-rose-400 mt-2 font-semibold flex items-center gap-1">
      <XCircle size={10} /> The establishment is not accepting bookings at this hour.
    </p>
  )}
  {timeValidation === 'happyhour' && (
    <p className="text-[10px] text-amber-500 mt-2 font-semibold flex items-center gap-1">
      <AlertTriangle size={10} /> Happy Hour is strictly walk-in only.
    </p>
  )}
  {timeValidation === 'full' && (
    <p className="text-[10px] text-rose-400 mt-2 font-bold flex items-center gap-1 bg-rose-950/30 p-2 rounded border border-rose-900/50">
      <Users size={12} /> Online reservation limit reached for this time slot. We reserve tables for walk-ins—try arriving in person!
    </p>
  )}

</div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-xs text-neutral-400">Preferred Table <span className="text-neutral-600">(optional)</span></label>
                              <button type="button" onClick={() => setIsPreferredTableExpanded(prev => !prev)} className="text-[10px] font-semibold text-neutral-400 hover:text-white transition-colors">
                                {isPreferredTableExpanded ? 'Minimize' : 'Expand'}
                              </button>
                            </div>
                            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                              {!isPreferredTableExpanded ? (
                                <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2">
                                  <div>
                                    <p className="text-xs font-semibold text-neutral-200">{selectedTableId ? tables.find((table: any) => table.id === selectedTableId)?.name || 'Selected Table' : 'Any available table'}</p>
                                    <p className="text-[10px] text-neutral-500">{selectedTableId ? 'Table selected. Expand to change it.' : 'No specific table selected. Expand to choose one.'}</p>
                                  </div>
                                  <button type="button" onClick={() => setIsPreferredTableExpanded(true)} className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">Expand</button>
                                </div>
                              ) : (
                                <>
                                  <button type="button" onClick={() => { setSelectedTableId(null); setIsPreferredTableExpanded(true); }} className={`w-full mb-4 py-3 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${!selectedTableId ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-emerald-600/40 hover:text-neutral-200'}`}>
                                    <CheckCircle size={16} /> Any Available Table <span className="opacity-60 font-normal ml-1 hidden sm:inline">(Recommended)</span>
                                  </button>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {tables.map((table: any) => {
                                      const isAvail = table.status === 'available';
                                      const isRes = table.status === 'reserved';
                                      const isOcc = table.status === 'occupied';
                                      const isSel = selectedTableId === table.id;
                                      const disabled = isOcc || isRes;
                                      const statusText = isAvail ? 'Available' : isRes ? 'Reserved' : 'In Use';
                                      const statusColor = isAvail ? 'text-emerald-400' : isRes ? 'text-amber-400' : 'text-rose-400';
                                      const dotColor = isAvail ? 'bg-emerald-500' : isRes ? 'bg-amber-500' : 'bg-rose-500';
                                      
                                      return (
                                        <button key={table.id} type="button" disabled={disabled} onClick={() => { const nextSelection = isSel ? null : table.id; setSelectedTableId(nextSelection); setIsPreferredTableExpanded(nextSelection ? false : true); }} className={`relative flex flex-col items-start p-3 rounded-lg border transition-all text-left ${isSel ? 'bg-emerald-600/10 border-emerald-500 shadow-sm shadow-emerald-900/20' : disabled ? 'bg-neutral-900/40 border-neutral-800/60 cursor-not-allowed opacity-60' : 'bg-neutral-900 border-neutral-700 hover:border-emerald-600/50 hover:bg-neutral-800'}`}>
                                          <div className="flex items-center justify-between w-full mb-1">
                                            <span className={`text-sm font-bold ${isSel ? 'text-emerald-400' : disabled ? 'text-neutral-500' : 'text-neutral-200'}`}>{table.name}</span>
                                            {isSel && <CheckCircle size={14} className="text-emerald-400" />}
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${isSel ? 'bg-emerald-400' : dotColor}`} />
                                            <span className={`text-xs font-medium ${isSel ? 'text-emerald-300' : disabled ? 'text-neutral-500' : statusColor}`}>{statusText}</span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Promo Code <span className="text-neutral-600">(optional)</span></label>
                            {appliedPromo ? (
                              <div className="flex items-center gap-2 bg-emerald-600/10 border border-emerald-600/30 rounded-lg px-3 py-2">
                                <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                                <span className="text-xs text-emerald-300 font-semibold flex-1">{appliedPromo.code} — {appliedPromo.discountPercent}% off applied!</span>
                                <button onClick={handleRemovePromo} className="text-neutral-500 hover:text-rose-400 transition-colors"><X size={13} /></button>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex gap-2">
                                  <input type="text" value={promoCodeInput} onChange={e => { setPromoCodeInput(e.target.value.toUpperCase()); setPromoError(''); }} placeholder="e.g. WELCOME20" className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 font-mono" />
                                  <button onClick={handleApplyPromo} disabled={!promoCodeInput.trim()} className="px-4 py-2 bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">Apply</button>
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
                            disabled={!resForm.name || !resForm.phone || !resForm.timeSlot || timeValidation !== 'valid'} 
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                          >
                            Proceed to Payment <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Guest Tracking View */}
              {resTab === 'track' && (
                <div className="max-w-3xl mx-auto">
                  {!currentUser && !trackedReservations ? (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md mx-auto">
                      <div className="text-center mb-6">
                        <Search size={32} className="text-emerald-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-white mb-1">Track Reservation</h3>
                        <p className="text-xs text-neutral-400">Enter your 6-character Reservation ID below or <button onClick={() => setShowLoginModal(true)} className="text-emerald-400 hover:underline font-semibold">log in</button>.</p>
                      </div>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const found = reservations.filter((r: any) => r.id.toUpperCase() === trackForm.reservationId.toUpperCase()).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        setTrackedReservations(found);
                      }} className="space-y-4">
                        <div>
                          <input type="text" required value={trackForm.reservationId} onChange={e => setTrackForm({ reservationId: e.target.value.toUpperCase() })} placeholder="e.g. X7B9QA" className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-center text-lg text-neutral-100 focus:border-emerald-500 font-mono tracking-[0.2em] uppercase" />
                        </div>
                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-900/30">Find Booking</button>
                      </form>
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
                        {myBookings.map((r: any) => (
                          <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4">
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
                            
                            {(r.status === 'pending' || r.status === 'confirmed') && (
                              <div className="border-t border-neutral-800/60 pt-3 flex justify-end gap-2">
                                <button onClick={() => { setReschedulingId(r.id); setRescheduleData({ date: new Date(r.date), timeSlot: r.timeSlot }); }} className="text-[10px] font-semibold text-neutral-400 hover:text-white bg-neutral-800 px-3 py-1.5 rounded transition-colors">Reschedule</button>
                                <button onClick={() => handleCancelBooking(r.id)} className="text-[10px] font-semibold text-rose-400 hover:text-white bg-rose-950/30 border border-rose-900/50 hover:bg-rose-900/50 px-3 py-1.5 rounded transition-colors">Cancel Booking</button>
                              </div>
                            )}

                            {reschedulingId === r.id && (
                              <div className="mt-2 p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-4">
                                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Select New Date & Time</h4>
                                <MiniCalendar selectedDate={rescheduleData.date} onSelect={(d) => setRescheduleData(prev => ({ ...prev, date: d }))} reservedDates={reservedDates} closedDates={safeClosedDates} />
                                <div>
                                   <label className="block text-xs text-neutral-400 mb-1.5">New Time</label>
                                   <input type="time" value={rescheduleData.timeSlot} onChange={e => setRescheduleData(prev => ({ ...prev, timeSlot: e.target.value }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500 transition-colors" />
                                </div>
                                <div className="flex gap-2 justify-end pt-2 border-t border-neutral-800/60">
                                   <button onClick={() => setReschedulingId(null)} className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors">Cancel</button>
                                   <button onClick={() => handleRescheduleSubmit(r.id)} disabled={!rescheduleData.date || !rescheduleData.timeSlot} className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 text-white rounded-lg transition-colors">Confirm Reschedule</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
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
                {[
                  { name: 'Standard Play', rate: `₱${effectiveHourly}`, unit: '/ hour', desc: 'Walk-in regular play on any available table.', features: ['First-Come First-Served', 'Any available table', 'Cue sticks included', 'Timer monitored'], badge: null, color: 'neutral' },
                  { name: 'Reserved Table', rate: `₱${effectiveHourly}`, unit: '/ hour', desc: 'Book a specific time slot and table in advance.', features: ['Guaranteed table slot', '25% down payment', 'Priority seating', 'Advance booking'], badge: 'Popular', color: 'emerald' },
                  { name: 'Happy Hour', rate: `₱${rates?.happyHourRate || 200}`, unit: '/ hour', desc: `Discounted walk-in rate every weekday ${rates?.happyHourStart || '18:00'}–${rates?.happyHourEnd || '19:00'}.`, features: ['Weekdays only', 'Walk-in ONLY - No reservations', 'Discounted standard rate', 'Subject to availability'], badge: 'Limited', color: 'amber' },
                ]
                .filter(card => card.name !== 'Happy Hour' || rates?.isHappyHourActive) // 🟢 NEW: Hides Happy Hour entirely if toggled off
                .map(({ name, rate, unit, desc, features, badge, color }) => (
                  <div key={name} className={`relative bg-neutral-900 border rounded-2xl p-6 flex flex-col ${color === 'emerald' ? 'border-emerald-600/50 shadow-lg shadow-emerald-950/50' : color === 'amber' ? 'border-amber-600/30' : 'border-neutral-800'}`}>
                    {badge && <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${color === 'emerald' ? 'bg-emerald-600 text-white' : color === 'amber' ? 'bg-amber-600 text-white' : 'bg-neutral-700 text-neutral-400'}`}>{badge}</span>}
                    <p className={`text-xs uppercase tracking-widest font-semibold mb-2 ${color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-neutral-500'}`}>{name}</p>
                    <div className="flex items-end gap-1 mb-3"><span className={`text-4xl font-black ${color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-white'}`}>{rate}</span><span className="text-neutral-500 text-sm mb-1">{unit}</span></div>
                    <p className="text-neutral-500 text-xs mb-5 leading-relaxed">{desc}</p>
                    <ul className="space-y-2 flex-1">
                      {features.map(f => <li key={f} className="flex items-center gap-2 text-xs text-neutral-400"><CheckCircle size={12} className={color === 'emerald' ? 'text-emerald-500' : color === 'amber' ? 'text-amber-500' : 'text-neutral-600'} />{f}</li>)}
                    </ul>
                    {name !== 'Happy Hour' ? (
                      <button onClick={() => setActiveSection('reservations')} className={`mt-5 w-full py-2.5 rounded-xl text-xs font-semibold transition-all ${color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'}`}>Book Now</button>
                    ) : (
                      <div className="mt-5 w-full py-2.5 rounded-xl text-xs font-semibold text-center bg-neutral-950/40 text-neutral-500 border border-neutral-800/40">🚶 Walk-in Only</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Reservation Policies & Terms</h3>
                <div className="flex gap-3 bg-emerald-950/40 border border-emerald-700/30 rounded-xl p-4 mb-5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600/20 flex items-center justify-center mt-0.5"><Info size={13} className="text-emerald-400" /></div>
                  <div>
                    <p className="text-emerald-300 text-xs font-semibold mb-1">Reservation Redemption Policy</p>
                    <p className="text-neutral-400 text-xs leading-relaxed">After completing your reservation and {rates?.downPaymentPercent || 25}% down payment, the <span className="text-white font-medium">remaining balance must be settled in full upon arrival</span> before your table time begins — payable via <span className="text-white font-medium">Cash or GCash</span>.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'Booking Cut-off', value: `Requires at least ${reservationTerms.cancellationHours} hours notice.` },
                    { label: 'Online Booking Hours', value: bookingHoursDisplay },
                    { label: 'Minimum Booking', value: `${reservationTerms.minHours} hour(s)` },
                    { label: 'Maximum Booking', value: `${reservationTerms.maxHours} hour(s)` },
                    { label: 'Grace Period', value: '15 minutes' },
                    { label: 'Cancellation', value: reservationTerms.cancellationPolicy },
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
                <h2 className="text-3xl font-black text-white tracking-tight uppercase mb-3">Upcoming Events</h2>
                <p className="text-neutral-400 max-w-sm mx-auto text-sm">Join our exclusive tournaments, leagues, and holiday promos.</p>
              </div>

              <div className="space-y-6">
                {publicEvents.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-neutral-800 rounded-xl"><p className="text-neutral-500">No upcoming events at the moment. Check back soon!</p></div>
                ) : (
                  publicEvents.map((event: any) => (
                    <div key={event.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden relative group transition-all hover:border-emerald-600/30 flex flex-col">
                      {event.attachments && event.attachments.length > 0 ? (
                        <div className="w-full h-48 sm:h-64 bg-neutral-800 overflow-hidden relative flex-shrink-0">
                          <img src={event.attachments[0]} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent" />
                        </div>
                      ) : (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                      )}
                      <div className="p-6 relative z-10 flex-1 flex flex-col">
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4">
                          <div><span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-md mb-2 inline-block">{event.type}</span><h3 className="text-xl font-bold text-neutral-100 mb-1">{event.title}</h3></div>
                          <div className="text-left sm:text-right shrink-0"><p className="text-sm font-black text-emerald-500 bg-emerald-950/30 border border-emerald-900/50 px-3 py-1 rounded-lg">{new Date(event.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
                        </div>
                        <p className="text-sm text-neutral-400 mb-6 leading-relaxed flex-1">{event.description}</p>
                        <div className="flex items-center justify-between border-t border-neutral-800/60 pt-4 mt-auto">
                          <div className="text-xs text-neutral-500 font-medium">{event.maxParticipants ? (event.slotsFull ? <span className="text-rose-400 font-bold bg-rose-950/30 px-2 py-1 rounded">Sold Out</span> : <span>Max {event.maxParticipants} participants</span>) : <span>Open to all</span>}</div>
                          {event.registrationLink ? <a href={event.registrationLink} target="_blank" rel="noopener noreferrer" className="text-xs bg-white text-black font-semibold px-4 py-2.5 rounded-full hover:bg-neutral-200 flex items-center gap-1.5">Register Now <ExternalLink size={12} strokeWidth={2.5} /></a> : <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">No Registration Required</div>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ════ ABOUT SECTION ════ */}
          {activeSection === 'about' && (
            <motion.div key="about" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="max-w-5xl mx-auto px-6 py-10">
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
              <div className="mb-12">
                <h3 className="text-center text-xl font-bold text-white mb-6">Our Location</h3>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden h-64 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-neutral-800/50" />
                  <div className="relative z-10 text-center"><MapPin size={32} className="text-emerald-500 mx-auto mb-2" /><p className="text-white font-semibold text-sm">One Shot Bar & Billiards</p><p className="text-neutral-400 text-xs">{cms.address}</p><a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs bg-emerald-600 text-white px-4 py-2 rounded-full hover:bg-emerald-500 transition-colors">Open in Google Maps</a></div>
                </div>
              </div>
              <div className="border-t border-neutral-800 pt-10">
                <div className="text-center mb-8"><h3 className="text-xl font-bold text-white mb-1">Contact Us</h3><p className="text-neutral-400 text-sm">We'd love to hear from you. Get in touch!</p></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="bg-neutral-900 border border-neutral-800 hover:border-emerald-600/30 rounded-xl p-5 transition-all flex gap-4">
                       <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center flex-shrink-0"><MapPin size={16} className="text-emerald-400" /></div>
                       <div><p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Address</p><p className="text-sm text-neutral-200 whitespace-pre-line">{cms.address}</p></div>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 hover:border-sky-600/30 rounded-xl p-5 transition-all flex gap-4">
                       <div className="w-10 h-10 rounded-xl bg-sky-600/10 border border-sky-600/20 flex items-center justify-center flex-shrink-0"><Phone size={16} className="text-sky-400" /></div>
                       <div><p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Phone / Viber</p><p className="text-sm text-neutral-200 whitespace-pre-line">{cms.phone}</p></div>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 hover:border-violet-600/30 rounded-xl p-5 transition-all flex gap-4">
                       <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-600/20 flex items-center justify-center flex-shrink-0"><Mail size={16} className="text-violet-400" /></div>
                       <div><p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Email</p><p className="text-sm text-neutral-200">{cms.email}</p></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5"><p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-3">Follow Us</p><div className="grid grid-cols-2 gap-3">{[{ platform: 'Facebook', handle: cms.facebook, icon: '📘' }, { platform: 'Instagram', handle: cms.instagram, icon: '📸' }, { platform: 'TikTok', handle: cms.tiktok, icon: '🎵' }, { platform: 'YouTube', handle: 'One Shot Billiards', icon: '📺' }].map(({ platform, handle, icon }) => (<div key={platform} className="flex items-center gap-2.5 bg-neutral-800/60 rounded-lg p-3"><span className="text-lg">{icon}</span><div><p className="text-[10px] text-neutral-500">{platform}</p><p className="text-xs text-neutral-300 truncate">{handle}</p></div></div>))}</div></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ FEEDBACK SECTION ════ */}
          {activeSection === 'feedback' && (
            <motion.div key="feedback" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="max-w-2xl mx-auto px-6 py-10">
              <div className="text-center mb-8"><h2 className="text-3xl font-black text-white mb-2">Send us Feedback</h2><p className="text-neutral-400 text-sm">We value your experience. Let us know how we can improve!</p></div>
              {feedbackSent ? (
                <div className="bg-sky-600/10 border border-sky-600/30 rounded-2xl p-10 text-center"><CheckCircle size={40} className="text-sky-400 mx-auto mb-3" /><p className="text-sky-300 font-semibold text-lg mb-1">Message Sent!</p><p className="text-neutral-500 text-sm">Our management team will review your message shortly. Thank you!</p></div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-5">
                  <div className="flex items-center gap-2 mb-1"><Mail className="text-sky-400" size={18} /><p className="text-sm font-semibold text-white">Direct Message to Management</p></div>
                  <div><label className="block text-xs text-neutral-400 mb-1.5">Your Name <span className="text-rose-500">*</span></label><input type="text" value={feedbackForm.name} onChange={e => setFeedbackForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Juan dela Cruz" required className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-sky-500" /></div>
                  <div><label className="block text-xs text-neutral-400 mb-1.5">Contact Information <span className="text-rose-500">*</span></label><input type="text" value={feedbackForm.contact} onChange={e => setFeedbackForm(f => ({ ...f, contact: e.target.value }))} placeholder="Email or Phone Number" required className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-sky-500" /></div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5">Type of Feedback <span className="text-rose-500">*</span></label>
                    <div className="relative"><select value={feedbackForm.type} onChange={e => setFeedbackForm(f => ({ ...f, type: e.target.value }))} required className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-sky-500 appearance-none"><option value="" disabled>Select a category...</option><option value="compliment">Compliment</option><option value="suggestion">Suggestion</option><option value="complaint">Concern / Complaint</option><option value="lost_item">Lost Item</option><option value="other">Other</option></select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" /></div>
                  </div>
                  <div><label className="block text-xs text-neutral-400 mb-1.5">Message <span className="text-rose-500">*</span></label><textarea value={feedbackForm.message} onChange={e => setFeedbackForm(f => ({ ...f, message: e.target.value }))} placeholder="Please provide details..." rows={4} required className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:border-sky-500 resize-none" /></div>
                  <button type="submit" disabled={!feedbackForm.name || !feedbackForm.contact || !feedbackForm.type || !feedbackForm.message} className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-neutral-800 text-white py-3 rounded-xl text-sm font-semibold">Submit Feedback</button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="bg-neutral-900 border-t border-neutral-800 mt-10 py-8 px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-center gap-2.5 mb-3"><img src={logoImg} alt="One Shot Bar & Billiards" className="h-8 w-8 object-contain" /><span className="text-white font-bold text-sm">One Shot Bar & Billiards</span></div>
            <p className="text-neutral-600 text-xs">Autobase OAX, Cainta, Rizal · Mon–Sat 12PM–3AM · Sun 5PM–3AM</p>
            <div className="flex justify-center gap-4 border-t border-neutral-800/60 pt-4 mt-4">
              <button onClick={() => { adminLogin('admin', 'admin123'); navigate('/admin'); }} className="text-[10px] text-neutral-600 hover:text-amber-400 transition-colors">Admin Login</button>
              <button onClick={() => { staffLogin('staff', 'staff123'); navigate('/staff'); }} className="text-[10px] text-neutral-600 hover:text-emerald-400 transition-colors">Staff Login</button>
            </div>
            <p className="text-neutral-700 text-[10px]">© 2026 One Shot Bar & Billiards. All rights reserved.</p>
          </div>
        </footer>
      </main>

      {/* ════ MODALS ════ */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowLoginModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} onClick={e => e.stopPropagation()} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-5"><div><h3 className="text-lg font-bold text-white">Customer Login</h3><p className="text-xs text-neutral-500">Welcome back!</p></div><button onClick={() => setShowLoginModal(false)} className="text-neutral-600 hover:text-white"><X size={18} /></button></div>
              {loginForm.error && <div className="bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs px-3 py-2 rounded-lg mb-4">{loginForm.error}</div>}
              <div className="space-y-3">
                <div><label className="block text-xs text-neutral-400 mb-1.5">Email</label><input type="email" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value, error: '' }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100" /></div>
                <div><label className="block text-xs text-neutral-400 mb-1.5">Password</label><div className="relative"><input type={loginForm.showPw ? 'text' : 'password'} value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value, error: '' }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-neutral-100" /><button onClick={() => setLoginForm(f => ({ ...f, showPw: !f.showPw }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600">{loginForm.showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></div>
              </div>
              <button onClick={handleLoginSubmit} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-semibold">Login</button>
              <p className="text-center text-xs text-neutral-600 mt-4">Don't have an account? <button onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); }} className="text-emerald-400 font-semibold">Register</button></p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRegisterModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRegisterModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} onClick={e => e.stopPropagation()} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5"><div><h3 className="text-lg font-bold text-white">Create Account</h3></div><button onClick={() => setShowRegisterModal(false)} className="text-neutral-600"><X size={18} /></button></div>
              {registerForm.error && <div className="bg-rose-950/40 text-rose-400 text-xs px-3 py-2 rounded-lg mb-4">{registerForm.error}</div>}
              <div className="space-y-3">
                {[ { key: 'name', label: 'Full Name', type: 'text' }, { key: 'email', label: 'Email', type: 'email' }, { key: 'phone', label: 'Contact Number', type: 'tel' }].map(({ key, label, type }) => (
                  <div key={key}><label className="block text-xs text-neutral-400 mb-1.5">{label}</label><input type={type} inputMode={key === 'phone' ? 'numeric' : undefined} value={(registerForm as any)[key]} onChange={e => setRegisterForm(f => ({ ...f, [key]: key === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 13) : e.target.value, error: '' }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100" /></div>
                ))}
                <div><label className="block text-xs text-neutral-400 mb-1.5">Password</label><div className="relative"><input type={registerForm.showPw ? 'text' : 'password'} value={registerForm.password} onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value, error: '' }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100" /><button onClick={() => setRegisterForm(f => ({ ...f, showPw: !f.showPw }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600">{registerForm.showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></div>
                <div><label className="block text-xs text-neutral-400 mb-1.5">Confirm Password</label><input type="password" value={registerForm.confirm} onChange={e => setRegisterForm(f => ({ ...f, confirm: e.target.value, error: '' }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100" /></div>
              </div>
              <button onClick={handleRegisterSubmit} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-semibold">Create Account</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reservationStep === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
              <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex items-center justify-between"><div><h3 className="text-base font-bold text-white">Down Payment</h3></div><button onClick={closeReservation} className="text-neutral-600 hover:text-white"><X size={18} /></button></div>
              <div className="p-6">
                <div className="bg-amber-950/30 border border-amber-800/30 rounded-xl p-4 mb-5 text-center">
                  <p className="text-xs text-amber-500 mb-1">Amount Due ({rates?.downPaymentPercent || 25}% Down Payment)</p>
                  <p className="text-4xl font-black text-amber-400">₱{downPayment}.00</p>
                  <p className="text-xs text-neutral-500 mt-1">Remaining balance <span className="text-neutral-300 font-semibold">₱{totalAmount - downPayment}.00</span> must be paid on arrival</p>
                </div>
                
                <div className="flex flex-col items-center gap-4">
                  <QRDisplay pattern={QR_GCASH} color="#1d4ed8" />
                  <div className="text-center"><p className="text-sm font-bold text-blue-400">GCash</p><p className="text-xs text-neutral-300 font-semibold">ONE SHOT BAR & BILLIARDS</p><p className="text-xs text-neutral-500">+63 917-123-4567</p></div>
                  <div className="w-full space-y-3 mt-2 text-left">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1.5">GCash Reference Number <span className="text-rose-500">*</span></label>
                      <input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value.replace(/\D/g, '').slice(0, 13))} placeholder="13-digit ref no." className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1.5">Upload Receipt Screenshot <span className="text-rose-500">*</span></label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 cursor-pointer bg-neutral-950 border border-dashed border-neutral-700 hover:border-blue-500 rounded-lg px-3 py-3 text-center transition-colors flex flex-col items-center justify-center gap-1">
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) setReceiptImg(URL.createObjectURL(file)); }} />
                          <Upload size={14} className="text-neutral-500" />
                          <span className="text-[10px] text-neutral-400">{receiptImg ? 'Change Image' : 'Tap to upload'}</span>
                        </label>
                        {receiptImg && <div className="w-14 h-14 rounded-lg border border-neutral-700 overflow-hidden flex-shrink-0 bg-neutral-900"><img src={receiptImg} alt="Receipt" className="w-full h-full object-cover" /></div>}
                      </div>
                    </div>
                  </div>
                </div>

                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mt-2 mb-5 max-h-44 overflow-y-auto">
                    <p className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
                      <BookOpen size={12} className="text-emerald-500" /> Reservation Terms & Conditions
                    </p>
                    <ul className="space-y-2 text-[10px] text-neutral-400 leading-relaxed">
                      <li>• Minimum booking duration is {reservationTerms.minHours} hour(s).</li>
                      <li>• Maximum booking duration (based on cut-off) is {maxAllowedDuration} hour(s).</li>
                      <li>• Online booking window: {fmt12(rates?.reservationStartTime || '12:00')} to {fmt12(((() => { const e = rates?.reservationEndTime || '02:00'; const [hh, mm] = e.split(':').map(Number); let em = hh*60 + (mm||0); const sm = (rates?.reservationStartTime||'12:00').split(':').map(Number); let smm = sm[0]*60 + (sm[1]||0); if (em <= smm) em += 24*60; return em - 60; })()))} (cutoff 1 hour before close)</li>
                      <li>• Store hours: {fmt12(rates?.reservationStartTime || '12:00')} — {fmt12(rates?.reservationEndTime || '02:00')}</li>
                      <li>• A {rates?.downPaymentPercent || 25}% down payment is required to secure your slot.</li>
                      <li>• Online capacity limit: {rates?.onlineCapacityLimit ?? 70}% of tables (admin-configured)</li>
                      <li>• {reservationTerms.cancellationPolicy}</li>
                      <li>• {reservationTerms.termsAndConditions}</li>
                    </ul>
                  </div>

                  <label className="flex items-start gap-2 text-[11px] text-neutral-400 cursor-pointer">
                    <input type="checkbox" checked={agreedToTerms} onChange={() => setAgreedToTerms(prev => !prev)} className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-emerald-500" />
                    <span>I have read and agree to the reservation terms and conditions.</span>
                  </label>

                <button onClick={handlePaymentConfirm} disabled={confirmingPayment || !paymentRef || paymentRef.length < 13 || !receiptImg || !agreedToTerms} className="w-full mt-5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                  {confirmingPayment ? 'Processing...' : <><CheckCircle size={15} /> I've Sent the Payment</>}
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

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Floating Live Monitor */}
        <AnimatePresence>
          {isLiveMonitorOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl shadow-black/60 w-72 max-h-[70vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-neutral-200">Live Status</span>
                </div>
                <button onClick={() => setIsLiveMonitorOpen(false)} className="text-neutral-600 hover:text-neutral-300 transition-colors"><X size={14} /></button>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Tables</p>
                    <div className="flex items-center gap-2">
                      {[{ c: 'bg-emerald-500', l: 'Free' }, { c: 'bg-amber-500', l: 'Rsv' }, { c: 'bg-rose-500', l: 'Busy' }].map(s => (
                        <span key={s.l} className="text-[9px] flex items-center gap-1 text-neutral-500">
                          <span className={`w-1.5 h-1.5 rounded-full ${s.c}`} />{s.l}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {tables.map((table: any) => {
                      const isAvail = table.status === 'available';
                      const isRes = table.status === 'reserved';
                      let statusLabel = isAvail ? 'Free' : isRes ? 'Reserved' : 'Occupied';
                      let dotColor = isAvail ? 'bg-emerald-500' : isRes ? 'bg-amber-500' : 'bg-rose-500';
                      let timeDetail = '';
                      
                      if (table.session) {
                        if (table.session.isOpenTime || table.session.durationMinutes === null) {
                           timeDetail = "Open Time";
                        } else {
                          const end = new Date(new Date(table.session.startTime).getTime() + table.session.durationMinutes * 60000);
                          const remMs = end.getTime() - now.getTime();
                          if (remMs < 0) {
                            const otMins = Math.floor(Math.abs(remMs) / 60000);
                            statusLabel = 'Overtime';
                            timeDetail = `+${otMins}m`;
                            dotColor = 'bg-rose-600 animate-pulse';
                          } else {
                            const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const rMins = Math.floor(remMs / 60000);
                            timeDetail = `${rMins < 60 ? `${rMins}m` : `${Math.floor(rMins/60)}h${rMins % 60 > 0 ? ` ${rMins % 60}m` : ''}`} · ends ${endStr}`;
                          }
                        }
                      }
                      
                      return (
                        <div key={table.id} className="flex items-center justify-between py-1.5 border-b border-neutral-900 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                            <span className="text-[10px] text-neutral-200 font-semibold">{table.name}</span>
                            <span className={`text-[9px] font-medium ${isAvail ? 'text-emerald-500' : isRes ? 'text-amber-500' : statusLabel === 'Overtime' ? 'text-rose-400' : 'text-neutral-500'}`}>{statusLabel}</span>
                          </div>
                          {timeDetail && (
                            <span className="text-[9px] text-neutral-600 text-right max-w-[90px] truncate">{timeDetail}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Walk-in Queue</p>
                    <span className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full font-bold">
                      {queue.filter((q: any) => q.status === 'waiting').length} waiting
                    </span>
                  </div>
                  
                  <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-emerald-400" />
                      <span className="text-xs text-emerald-300 font-semibold">AI Est. Wait Time</span>
                    </div>
                    <span className="text-sm font-black text-emerald-400">{calculateAIWaitTime()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={() => setIsLiveMonitorOpen(!isLiveMonitorOpen)} className="w-12 h-12 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-white shadow-xl transition-all">
          {isLiveMonitorOpen ? <X size={20} /> : <Users size={20} />}
        </button>
      </div>
    </div>
  );
}