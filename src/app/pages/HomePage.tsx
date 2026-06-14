import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { addMinutes, differenceInSeconds, format, isToday } from 'date-fns';
import {
  ChevronLeft, ChevronRight, X, Star, Phone, MapPin,
  Clock, LogIn, UserPlus, Eye, EyeOff,
  Calendar, CheckCircle, ArrowRight, Users, ChevronDown,
  Megaphone, Info, Shield, Award, Mail, Tag, BookOpen,
  Sparkles, Upload, Search, Copy, ExternalLink
} from 'lucide-react';
import { useAppContext, HOURLY_RATE, DOWN_PAYMENT_RATE, generateReferralCode } from '../context/AppContext';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

import logoImg from 'figma:asset/40eb82831843e17a3c48a360fd80f0aaaa58ddc8.png';
import heroImg1 from 'figma:asset/15fb8dcab89448c8f2ad20fb9946631b1c246968.png';
import heroImg2 from 'figma:asset/f80be24577ead53e120a2e3792c660d627f94c6f.png';
import heroImg3 from 'figma:asset/622002b1a57eb609a09cacd650764fb95c911672.png';
import heroImg4 from 'figma:asset/759b04149309a4f38a99d59a2ef822b4e59fd5d3.png';
import heroImg5 from 'figma:asset/0784e9fa4728a17ea332ccf7dd013e304884f734.png';

const HERO_SLIDES = [
  { src: heroImg1, alt: 'One Shot Bar & Billiards – All It Takes Is One Shot' },
  { src: heroImg2, alt: 'One Shot Bar and Billiards' },
  { src: heroImg3, alt: 'One Shot Billiards Hall' },
  { src: heroImg4, alt: 'Tournament Play' },
  { src: heroImg5, alt: 'Precision Billiards' },
];

// ─── Constants ────────────────────────────────────────────────
const ANNOUNCEMENTS = [
  "🎱 Welcome to One Shot Bar & Billiards! Book your favorite table now!",
  "📍 Visit us at Autobase OAX, San Juan, Cainta, Rizal · Mon–Sat 12PM–3AM · Sun 5PM–3AM",
  "💸 Happy Hour: 6PM – 8PM – Get 20% off walk-in rates every weekday!",
  "📅 Reserve in advance and secure your preferred date & time slot!",
  "🏆 Tournament Night every Saturday! Cash prizes await champions!",
  "🎉 FREE pool lessons every Sunday evening — visit us at Autobase OAX!",
  "☎️ For inquiries: 0917-123-4567 | oneshot.billiards@gmail.com",
];

const TIME_SLOTS = [
  '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

type Section = 'home' | 'reservations' | 'rates' | 'events' | 'about' | 'feedback';

// ─── QR Code Component ────────────────────────────────────────
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
            <div
              key={`${ri}-${ci}`}
              style={{ backgroundColor: cell ? color : 'white', borderRadius: 1 }}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Mini Calendar Component ──────────────────────────────────
function MiniCalendar({
  selectedDate, onSelect, reservedDates
}: {
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
  reservedDates: Date[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: Array<{ day: number; currentMonth: boolean; date: Date }> = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrevMonth - i);
    cells.push({ day: daysInPrevMonth - i, currentMonth: false, date: d });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, date: new Date(year, month, d) });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, currentMonth: false, date: new Date(year, month + 1, d) });
  }

  const isReserved = (date: Date) =>
    reservedDates.some(rd => {
      const d = new Date(rd);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === date.getTime();
    });

  const isPast = (date: Date) => date < today;
  const isSelected = (date: Date) =>
    selectedDate
      ? date.getTime() === (() => { const s = new Date(selectedDate); s.setHours(0,0,0,0); return s.getTime(); })()
      : false;
  const isToday = (date: Date) => date.getTime() === today.getTime();

  const prevMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    setViewDate(d);
  };
  const nextMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    setViewDate(d);
  };

  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-700 p-4 select-none">
      {/* Month Nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-white">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {/* Day Headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS_OF_WEEK.map(d => (
          <div key={d} className="text-center text-[10px] text-neutral-500 font-semibold uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>
      {/* Day Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(({ day, currentMonth, date }, idx) => {
          const past = isPast(date);
          const selected = isSelected(date);
          const today_ = isToday(date);
          const reserved = isReserved(date) && currentMonth;
          const clickable = currentMonth && !past;
          return (
            <button
              key={idx}
              disabled={!clickable}
              onClick={() => clickable && onSelect(date)}
              className={`
                relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all
                ${!currentMonth ? 'opacity-20 cursor-default' : ''}
                ${past && currentMonth ? 'opacity-30 cursor-default text-neutral-600' : ''}
                ${selected ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : ''}
                ${!selected && today_ ? 'border border-emerald-500 text-emerald-400' : ''}
                ${!selected && clickable && !today_ ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white' : ''}
              `}
            >
              <span>{day}</span>
              {reserved && !selected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-neutral-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Has reservations</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Selected</span>
      </div>
    </div>
  );
}

// ─── Main HomePage ────────────────────────────────────────────
export function HomePage() {
  const navigate = useNavigate();
  const { tables, queue, reservations, events, addReservation, addFeedback, applyPromoCode, adminLogin, staffLogin } = useAppContext();

  // Announcement rotator
  const [announcementIdx, setAnnouncementIdx] = useState(0);
  const [announcementDir, setAnnouncementDir] = useState<1 | -1>(1);

  // Hero slideshow
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);
  const [heroSlideDir, setHeroSlideDir] = useState<1 | -1>(1);
  
  // Live clock for table timers
  const [now, setNow] = useState(new Date());

  // Active section
  const [activeSection, setActiveSection] = useState<Section>('home');

  // Modals
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Auth state (mock)
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; referralCode: string } | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Login form
  const [loginForm, setLoginForm] = useState({ email: '', password: '', showPw: false, error: '' });
  // Register form
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', referralCode: '', showPw: false, error: '' });

 // Reservation flow
  const [reservationStep, setReservationStep] = useState<0 | 1 | 2 | 3>(0); // 0=closed, 1=form, 2=payment, 3=confirmed
  const [resTab, setResTab] = useState<'new' | 'my-bookings'>('new');
  const [trackForm, setTrackForm] = useState({ reservationId: '' });
  const [trackedReservations, setTrackedReservations] = useState<any[] | null>(null);
  const [generatedResId, setGeneratedResId] = useState('');
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isLiveMonitorOpen, setIsLiveMonitorOpen] = useState(false);
  const [resForm, setResForm] = useState({
    name: '', email: '', phone: '', pax: 2, timeSlot: '18:00', duration: 2,
  });
  
  const [paymentMethod, setPaymentMethod] = useState<'gcash'>('gcash');
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  
  // GCash Receipt State
  const [paymentRef, setPaymentRef] = useState('');
  const [receiptImg, setReceiptImg] = useState<string | null>(null);

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoError, setPromoError] = useState('');

  // Feedback form state
  const [feedbackForm, setFeedbackForm] = useState({ name: '', contact: '', type: '', message: '' });
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Rotating announcements
  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncementDir(1);
      setAnnouncementIdx(prev => (prev + 1) % ANNOUNCEMENTS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Auto-advance hero slides
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroSlideDir(1);
      setHeroSlideIdx(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Live clock tick for table timers
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // When user logs in, pre-fill reservation form
  useEffect(() => {
    if (currentUser) {
      setResForm(f => ({ ...f, name: currentUser.name, email: currentUser.email }));
    }
  }, [currentUser]);

  const baseAmount = resForm.duration * HOURLY_RATE;
  const discountAmount = appliedPromo ? Math.floor(baseAmount * appliedPromo.discountPercent / 100) : 0;
  const totalAmount = baseAmount - discountAmount;
  const downPayment = Math.ceil(totalAmount * DOWN_PAYMENT_RATE);

  const handleLoginSubmit = () => {
    if (!loginForm.email || !loginForm.password) {
      setLoginForm(f => ({ ...f, error: 'Please fill all fields.' }));
      return;
    }
    // Mock login: any valid email/password
    const name = loginForm.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    setCurrentUser({ name, email: loginForm.email, referralCode: generateReferralCode(name) });
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
    const myReferralCode = generateReferralCode(registerForm.name);
    setCurrentUser({ name: registerForm.name, email: registerForm.email, referralCode: myReferralCode });
    setShowRegisterModal(false);
    setRegisterForm({ name: '', email: '', phone: '', password: '', confirm: '', referralCode: '', showPw: false, error: '' });
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

  const handleReservationSubmit = () => {
    if (!resForm.name || !resForm.email || !resForm.phone || !selectedDate) {
      return;
    }
    setReservationStep(2);
  };

  const handlePaymentConfirm = () => {
    setConfirmingPayment(true);
    setTimeout(() => {
      const reservationDate = new Date(selectedDate!);
      const [hours, minutes] = resForm.timeSlot.split(':').map(Number);
      reservationDate.setHours(hours, minutes, 0, 0);

      const newId = (addReservation as any)({
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
      setReservationStep(3);
    }, 1500);
  };

  const closeReservation = () => {
    setReservationStep(0);
    setSelectedDate(null);
    setResForm({ name: currentUser?.name || '', email: currentUser?.email || '', phone: '', pax: 2, timeSlot: '18:00', duration: 2 });
    setPaymentMethod('gcash');
    setPromoCodeInput('');
    setAppliedPromo(null);
    setPromoError('');
    setPaymentRef('');
    setReceiptImg(null);
    setGeneratedResId('');
    if (currentUser) setResTab('my-bookings');
  };

  const handleFeedbackSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!feedbackForm.name || !feedbackForm.contact || !feedbackForm.type || !feedbackForm.message) return;
    
    addFeedback({
      customerName: feedbackForm.name,
      contactInfo: feedbackForm.contact,
      rating: 0, 
      feedbackType: feedbackForm.type as any,
      comment: feedbackForm.message,
      tags: [],
    });
    
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      setFeedbackForm({ name: '', contact: '', type: '', message: '' });
    }, 3000);
  };

  const prevHeroSlide = () => { setHeroSlideDir(-1); setHeroSlideIdx(p => (p - 1 + HERO_SLIDES.length) % HERO_SLIDES.length); };
  const nextHeroSlide = () => { setHeroSlideDir(1); setHeroSlideIdx(p => (p + 1) % HERO_SLIDES.length); };

  // --- AI WAIT-TIME ESTIMATOR (PROTOTYPE LOGIC) ---
  const calculateAIWaitTime = () => {
    const waitingCustomers = queue.filter(q => q.status === 'waiting').length;
    if (waitingCustomers === 0) return "No wait";

    // Get all occupied tables and find how many minutes they have left
    const activeTables = tables.filter(t => t.status === 'occupied' && t.session);
    if (activeTables.length === 0) return "Available immediately";

    const remainingTimes = activeTables.map(t => {
      const endTime = addMinutes(new Date(t.session!.startTime), t.session!.durationMinutes);
      return Math.max(0, Math.floor(differenceInSeconds(endTime, now) / 60));
    }).sort((a, b) => a - b); // Sort from ending soonest to longest

    // Prototype "AI" Math: Grab the table ending soonest, add 2 mins for cleaning, 
    // and add 15 mins penalty for every person ahead in the queue.
    const baseWait = remainingTimes[0] !== undefined ? remainingTimes[0] : 0;
    const estimatedMinutes = baseWait + 2 + (waitingCustomers * 15);

    if (estimatedMinutes < 60) return `~${estimatedMinutes} mins`;
    const hrs = Math.floor(estimatedMinutes / 60);
    const mins = estimatedMinutes % 60;
    return `~${hrs}h ${mins}m`;
  };

  const reservedDates = reservations
    .filter(r => r.status !== 'cancelled')
    .map(r => new Date(r.date));

  const allNavSections: { id: Section; label: string; requiresAuth?: boolean }[] = [
    { id: 'home', label: 'Home' },
    { id: 'reservations', label: 'Reservations' },
    { id: 'rates', label: 'Rates' },
    { id: 'events', label: 'Events' },
    { id: 'about', label: 'About Us' },
    { id: 'feedback', label: 'Feedback' },
  ];
  const navSections = allNavSections.filter(s => !s.requiresAuth || currentUser !== null);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">

      {/* ── Top Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/60 flex items-center overflow-hidden">
        
        {/* Half-Parallelogram Logo */}
        <div
          className="h-full flex items-center px-5 pr-12 bg-emerald-700 flex-shrink-0 relative z-10"
          style={{ clipPath: 'polygon(0 0, 100% 0, 82% 100%, 0 100%)', minWidth: 220 }}
        >
          <div className="flex items-center gap-2.5">
            <img
              src={logoImg}
              alt="One Shot Bar & Billiards"
              className="h-9 w-9 object-contain rounded-lg flex-shrink-0"
            />
            <div>
              <p className="text-white font-black text-sm tracking-tight leading-tight">ONE SHOT</p>
              <p className="text-emerald-200 text-[9px] uppercase tracking-[0.2em] font-semibold">Bar & Billiards</p>
            </div>
          </div>
        </div>

        {/* Rotating Announcements */}
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
                  {ANNOUNCEMENTS[announcementIdx]}
                </motion.p>
              </AnimatePresence>
            </div>
            {/* Dots indicator */}
            <div className="flex gap-1 flex-shrink-0">
              {ANNOUNCEMENTS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setAnnouncementDir(i > announcementIdx ? 1 : -1); setAnnouncementIdx(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === announcementIdx ? 'bg-emerald-400 w-3' : 'bg-neutral-600 hover:bg-neutral-400'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-2 pr-4 flex-shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2 bg-emerald-600/10 border border-emerald-600/25 rounded-full px-3 py-1.5 hover:bg-emerald-600/20 transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] font-black text-white">
                  {currentUser.name[0]}
                </div>
                <span className="text-xs text-emerald-300 font-medium hidden sm:block">{currentUser.name}</span>
              </button>
              <button
                onClick={() => setCurrentUser(null)}
                className="text-[10px] text-neutral-500 hover:text-neutral-300 px-2 py-1.5 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 px-3 py-1.5 rounded-full transition-all"
              >
                <LogIn size={12} />
                <span className="hidden sm:inline">Login</span>
              </button>
              <button
                onClick={() => setShowRegisterModal(true)}
                className="flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-full transition-all"
              >
                <UserPlus size={12} />
                <span className="hidden sm:inline">Register</span>
              </button>
            </>
          )}

        </div>
      </header>

      {/* ── Section Navigation ── */}
      <nav className="fixed top-16 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800/60 flex items-center justify-center gap-1 px-4 overflow-x-auto">
        {navSections.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`relative px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all ${
              activeSection === id
                ? 'text-emerald-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {label}
            {activeSection === id && (
              <motion.span
                layoutId="navUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"
              />
            )}
          </button>
        ))}
      </nav>

      {/* ── Main Content ── */}
      <main className="flex-1 pt-32">
        <AnimatePresence mode="wait">
          {/* ════ HOME SECTION ════ */}
          {activeSection === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hero Slideshow */}
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
                    <img
                      src={HERO_SLIDES[heroSlideIdx].src}
                      alt={HERO_SLIDES[heroSlideIdx].alt}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/55 to-transparent" />

                {/* Prev / Next arrows */}
                <button
                  onClick={prevHeroSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-10"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={nextHeroSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-10"
                >
                  <ChevronRight size={18} />
                </button>

                <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 px-6 text-center z-10">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.5 }}
                    className="flex flex-col items-center"
                  >
                    <p className="text-emerald-400 text-xs uppercase tracking-[0.3em] font-semibold mb-3">Welcome to</p>
                    <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
                      One Shot
                    </h1>
                    <p className="text-emerald-300 text-xl font-light mb-5">Bar & Billiards</p>
                    <p className="text-neutral-400 text-sm max-w-md mx-auto mb-7 leading-relaxed">
                      Your premier billiard destination at Autobase OAX, Cainta, Rizal. 10 world-class tables, refreshing drinks, and an unbeatable atmosphere.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 mb-6">
                      <button
                        onClick={() => setActiveSection('reservations')}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full text-sm font-semibold transition-all shadow-lg shadow-emerald-900/40 hover:shadow-emerald-800/60"
                      >
                        <Calendar size={15} />
                        Book a Table
                      </button>
                      <button
                        onClick={() => setActiveSection('about')}
                        className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-6 py-3 rounded-full text-sm font-semibold transition-all border border-neutral-700"
                      >
                        <Info size={15} />
                        Learn More
                      </button>
                    </div>
                    {/* Slide dots — placed below CTA buttons */}
                    <div className="flex gap-2">
                      {HERO_SLIDES.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => { setHeroSlideDir(i > heroSlideIdx ? 1 : -1); setHeroSlideIdx(i); }}
                          className={`h-1.5 rounded-full transition-all ${i === heroSlideIdx ? 'bg-emerald-400 w-5' : 'bg-white/35 w-1.5 hover:bg-white/60'}`}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="bg-neutral-900 border-y border-neutral-800">
                <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-neutral-800">
                  {[
                    { value: '10', label: 'Billiard Tables', color: 'text-emerald-400' },
                    { value: '₱250', label: 'Per Hour', color: 'text-amber-400' },
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

              {/* Features */}
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

              {/* Second Image */}
              <div className="relative h-72 overflow-hidden">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1741397112651-ee14e18f6b41?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaWxsaWFyZHMlMjBoYWxsJTIwaW50ZXJpb3IlMjBuZW9uJTIwbGlnaHRzfGVufDF8fHx8MTc3NDk1MTMxNXww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="One Shot Billiards Hall"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-neutral-950/60 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-white text-2xl font-black mb-3">Ready for a Game?</p>
                    <button
                      onClick={() => setActiveSection('reservations')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-full text-sm font-semibold transition-all inline-flex items-center gap-2"
                    >
                      Reserve Now <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ RESERVATIONS SECTION ════ */}
          {activeSection === 'reservations' && (
            <motion.div
              key="reservations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-5xl mx-auto px-6 py-10"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-white mb-2">Reservations</h2>
                <p className="text-neutral-400 text-sm">Secure your spot or view your booking history.</p>
              </div>

              {/* Sub-Navigation ALWAYS VISIBLE */}
              <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1 mb-8 max-w-sm mx-auto">
                <button
                  onClick={() => setResTab('new')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                    resTab === 'new' ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <Calendar size={14} /> New Booking
                </button>
                <button
                  onClick={() => setResTab('my-bookings')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                    resTab === 'my-bookings' ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {currentUser ? <BookOpen size={14} /> : <Search size={14} />} 
                  {currentUser ? 'My Bookings' : 'Track Booking'}
                </button>
              </div>

              {/* TAB 1: NEW BOOKING FLOW */}
              {resTab === 'new' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start relative pb-20">
                  {/* Calendar */}
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-3">
                      Step 1 — Pick a Date
                    </p>
                    <MiniCalendar
                      selectedDate={selectedDate}
                      onSelect={setSelectedDate}
                      reservedDates={reservedDates}
                    />
                    {selectedDate && (
                      <div className="mt-3 bg-emerald-600/10 border border-emerald-600/25 rounded-xl p-3 flex items-center gap-2">
                        <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                        <span className="text-xs text-emerald-300">
                          Selected: <strong>{selectedDate.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Form */}
                  <div>
                    {!selectedDate ? (
                      <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
                        <Calendar size={32} className="text-neutral-600" />
                        <p className="text-neutral-500 text-sm">Please select a date from the calendar to continue your reservation.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-3">
                          Step 2 — Your Details
                        </p>
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                          {/* Name */}
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Full Name <span className="text-rose-500">*</span></label>
                            <input
                              type="text"
                              value={resForm.name}
                              onChange={e => setResForm(f => ({ ...f, name: e.target.value }))}
                              placeholder="e.g. Juan dela Cruz"
                              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                          </div>
                          {/* Email */}
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Email Address <span className="text-rose-500">*</span></label>
                            <input
                              type="email"
                              value={resForm.email}
                              onChange={e => setResForm(f => ({ ...f, email: e.target.value }))}
                              placeholder="juan@email.com"
                              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                          </div>
                          {/* Contact */}
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Contact Number <span className="text-rose-500">*</span></label>
                            <input
                              type="tel"
                              value={resForm.phone}
                              onChange={e => setResForm(f => ({ ...f, phone: e.target.value }))}
                              placeholder="09XX-XXX-XXXX"
                              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                          </div>
                          {/* Pax & Duration */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-neutral-400 mb-1.5">No. of Persons</label>
                              <input
                                type="number"
                                min={1} max={20}
                                value={resForm.pax}
                                onChange={e => setResForm(f => ({ ...f, pax: parseInt(e.target.value) || 1 }))}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-neutral-400 mb-1.5">Duration (hours)</label>
                              <select
                                value={resForm.duration}
                                onChange={e => setResForm(f => ({ ...f, duration: parseInt(e.target.value) }))}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500 transition-colors"
                              >
                                {[1, 2, 3, 4, 5, 6].map(h => (
                                  <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {/* Time Slot */}
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1.5">Preferred Time</label>
                            <div className="grid grid-cols-4 gap-1.5">
                              {TIME_SLOTS.map(t => {
                                const isHappyHour = t === '18:00' || t === '19:00';
                                return (
                                  <button
                                    key={t}
                                    disabled={isHappyHour}
                                    onClick={() => setResForm(f => ({ ...f, timeSlot: t }))}
                                    className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                                      isHappyHour 
                                        ? 'bg-neutral-800/50 text-neutral-600 cursor-not-allowed border border-neutral-800' 
                                        : resForm.timeSlot === t
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
                                    }`}
                                    title={isHappyHour ? "Happy Hour (Walk-in Only)" : ""}
                                  >
                                    {t}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-amber-500 mt-2">
                              * 18:00 and 19:00 are Happy Hour (Strictly walk-in only). These time slots cannot be booked online.
                            </p>
                          </div>

                          {/* Table Selection */}
                          <div>
                            <label className="block text-xs text-neutral-400 mb-2">Preferred Table <span className="text-neutral-600">(optional)</span></label>
                            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                              <button
                                type="button"
                                onClick={() => setSelectedTableId(null)}
                                className={`w-full mb-4 py-3 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
                                  !selectedTableId
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-emerald-600/40 hover:text-neutral-200'
                                }`}
                              >
                                <CheckCircle size={16} />
                                Any Available Table <span className="opacity-60 font-normal ml-1 hidden sm:inline">(Recommended)</span>
                              </button>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {tables.map(table => {
                                  const isAvail = table.status === 'available';
                                  const isRes = table.status === 'reserved';
                                  const isOcc = table.status === 'occupied';
                                  const isSel = selectedTableId === table.id;
                                  const disabled = isOcc || isRes;

                                  const statusText = isAvail ? 'Available' : isRes ? 'Reserved' : 'In Use';
                                  const statusColor = isAvail ? 'text-emerald-400' : isRes ? 'text-amber-400' : 'text-rose-400';
                                  const dotColor = isAvail ? 'bg-emerald-500' : isRes ? 'bg-amber-500' : 'bg-rose-500';
                                  
                                  return (
                                    <button
                                      key={table.id}
                                      type="button"
                                      disabled={disabled}
                                      onClick={() => setSelectedTableId(isSel ? null : table.id)}
                                      className={`relative flex flex-col items-start p-3 rounded-lg border transition-all text-left ${
                                        isSel
                                          ? 'bg-emerald-600/10 border-emerald-500 shadow-sm shadow-emerald-900/20'
                                          : disabled
                                          ? 'bg-neutral-900/40 border-neutral-800/60 cursor-not-allowed opacity-60'
                                          : 'bg-neutral-900 border-neutral-700 hover:border-emerald-600/50 hover:bg-neutral-800'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between w-full mb-1">
                                        <span className={`text-sm font-bold ${isSel ? 'text-emerald-400' : disabled ? 'text-neutral-500' : 'text-neutral-200'}`}>
                                          {table.name}
                                        </span>
                                        {isSel && <CheckCircle size={14} className="text-emerald-400" />}
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${isSel ? 'bg-emerald-400' : dotColor}`} />
                                        <span className={`text-xs font-medium ${isSel ? 'text-emerald-300' : disabled ? 'text-neutral-500' : statusColor}`}>
                                          {statusText}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>

                              {selectedTableId && (
                                <div className="mt-4 flex items-center gap-2 bg-emerald-600/10 border border-emerald-600/20 rounded-lg px-3 py-2.5">
                                  <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                                  <span className="text-xs text-emerald-300 leading-relaxed">
                                    Preferred: <strong>{tables.find(t => t.id === selectedTableId)?.name}</strong> — staff will confirm availability upon arrival.
                                  </span>
                                </div>
                              )}
                              <p className="text-[10px] text-neutral-600 mt-3">Your table preference is a request, not a guarantee. Staff will do their best to honor it.</p>
                            </div>
                          </div>

                          {/* Promo Code */}
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
                                  <input
                                    type="text"
                                    value={promoCodeInput}
                                    onChange={e => { setPromoCodeInput(e.target.value.toUpperCase()); setPromoError(''); }}
                                    placeholder="e.g. WELCOME20"
                                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 font-mono"
                                  />
                                  <button
                                    onClick={handleApplyPromo}
                                    disabled={!promoCodeInput.trim()}
                                    className="px-4 py-2 bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                  >
                                    Apply
                                  </button>
                                </div>
                                {promoError && <p className="text-[11px] text-rose-400">{promoError}</p>}
                              </div>
                            )}
                          </div>

                          {/* Summary */}
                          <div className="bg-neutral-800/60 rounded-xl p-4 border border-neutral-700/50">
                            <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-semibold">Booking Summary</p>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-neutral-400">Date</span>
                                <span className="text-neutral-200">{selectedDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-400">Time</span>
                                <span className="text-neutral-200">{resForm.timeSlot}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-400">Duration</span>
                                <span className="text-neutral-200">{resForm.duration}h × ₱{HOURLY_RATE}/hr</span>
                              </div>
                              {appliedPromo && (
                                <div className="flex justify-between text-emerald-400">
                                  <span>Promo ({appliedPromo.code})</span>
                                  <span>−₱{discountAmount}.00</span>
                                </div>
                              )}
                              <div className="border-t border-neutral-700 pt-1.5 mt-1.5 flex justify-between">
                                <span className="text-neutral-400">Total Amount</span>
                                <span className="text-white font-semibold">₱{totalAmount}.00</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-amber-400">Down Payment (25%)</span>
                                <span className="text-amber-300 font-semibold">₱{downPayment}.00</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={handleReservationSubmit}
                            disabled={!resForm.name || !resForm.email || !resForm.phone}
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

              {/* TAB 2: MY BOOKINGS LIST / TRACKER */}
              {resTab === 'my-bookings' && (
                <div className="max-w-3xl mx-auto">
                  {!currentUser && !trackedReservations ? (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md mx-auto">
                      <div className="text-center mb-6">
                        <Search size={32} className="text-emerald-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-white mb-1">Track Reservation</h3>
                        <p className="text-xs text-neutral-400">Enter your details to find your booking, or <button onClick={() => setShowLoginModal(true)} className="text-emerald-400 hover:underline font-semibold">log in</button>.</p>
                      </div>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const found = reservations.filter((r: any) => 
                          r.id.toUpperCase() === trackForm.reservationId.toUpperCase()
                        ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        setTrackedReservations(found);
                      }} className="space-y-4">
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1.5">Reservation ID <span className="text-rose-500">*</span></label>
                          <input 
                            type="text" 
                            required 
                            value={trackForm.reservationId} 
                            onChange={e => setTrackForm({ reservationId: e.target.value.toUpperCase() })} 
                            placeholder="e.g. TEST" 
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono tracking-widest uppercase" 
                          />
                        </div>
                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-900/30">
                          Find Booking
                        </button>
                      </form>
                    </div>
                  ) : (() => {
                    const myBookings = currentUser 
                      ? reservations.filter((r: any) => r.email && r.email.toLowerCase() === currentUser.email.toLowerCase()).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      : (trackedReservations || []);

                    const statusColors: Record<string, string> = {
                      pending: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
                      confirmed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
                      'checked-in': 'bg-sky-500/15 text-sky-400 border-sky-500/25',
                      completed: 'bg-neutral-700/50 text-neutral-400 border-neutral-700',
                      cancelled: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
                    };

                    if (myBookings.length === 0) {
                      return (
                        <div className="bg-neutral-900 border border-dashed border-neutral-700 rounded-2xl p-12 text-center">
                          <BookOpen size={36} className="text-neutral-700 mx-auto mb-3" />
                          <p className="text-neutral-400 font-semibold mb-1">No bookings found</p>
                          <p className="text-neutral-600 text-sm mb-5">We couldn't find any reservations matching those details.</p>
                          <div className="flex justify-center gap-3">
                            {!currentUser && (
                              <button onClick={() => setTrackedReservations(null)} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all border border-neutral-700">
                                Try Again
                              </button>
                            )}
                            <button
                              onClick={() => setResTab('new')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-2"
                            >
                              <Calendar size={14} /> Book Now
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {!currentUser && trackedReservations && (
                          <div className="flex justify-between items-center mb-2 px-1">
                            <p className="text-xs text-neutral-400">Showing results for ID: <strong className="text-neutral-200">{trackForm.reservationId}</strong></p>
                            <button onClick={() => setTrackedReservations(null)} className="text-xs text-emerald-400 hover:underline">New Search</button>
                          </div>
                        )}
                        {myBookings.map((r: any) => (
                          <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-wrap items-center gap-4">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-neutral-200">
                                  {new Date(r.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                <span className="text-neutral-600">·</span>
                                <p className="text-sm text-neutral-400">{r.timeSlot}</p>
                                <span className="text-neutral-600">·</span>
                                <p className="text-sm text-neutral-400">{r.durationHours}h</p>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
                                <span>{r.partySize} person{r.partySize > 1 ? 's' : ''}</span>
                                {r.promoCode && (
                                  <span className="flex items-center gap-1 text-emerald-500">
                                    <Tag size={9} /> {r.promoCode}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-bold text-white">₱{r.totalAmount.toLocaleString()}</p>
                                <p className="text-[10px] text-neutral-600">Total</p>
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusColors[r.status] || statusColors.pending}`}>
                                {r.status.replace('-', ' ')}
                              </span>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => setResTab('new')}
                          className="w-full py-2.5 mt-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                        >
                          <Calendar size={14} /> Make Another Booking
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </motion.div>
          )}

          {/* ════ RATES SECTION ════ */}
          {activeSection === 'rates' && (
            <motion.div
              key="rates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto px-6 py-10"
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-white mb-2">Table Rates</h2>
                <p className="text-neutral-400 text-sm">Transparent and affordable pricing for everyone.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {[
                  {
                    name: 'Standard Play',
                    rate: '₱250',
                    unit: '/ hour',
                    desc: 'Walk-in regular play on any available table Upon.',
                    features: ['First-Come First-Served', 'Any available table', 'Cue sticks included', 'Timer monitored'],
                    badge: null,
                    color: 'neutral',
                  },
                  {
                    name: 'Reserved Table',
                    rate: '₱250',
                    unit: '/ hour',
                    desc: 'Book a specific time slot and table in advance.',
                    features: ['Guaranteed table slot', '25% down payment', 'Priority seating', 'Advance booking'],
                    badge: 'Popular',
                    color: 'emerald',
                  },
                  {
                    name: 'Happy Hour',
                    rate: '₱200',
                    unit: '/ hour',
                    desc: 'Discounted walk-in rate every weekday 6PM–8PM.',
                    features: ['Weekdays only (6–8PM)', 'Walk-in ONLY - No reservations', '20% off standard rate', 'Subject to availability'],
                    badge: 'Limited',
                    color: 'amber',
                  },
                ].map(({ name, rate, unit, desc, features, badge, color }) => (
                  <div
                    key={name}
                    className={`relative bg-neutral-900 border rounded-2xl p-6 flex flex-col ${
                      color === 'emerald' ? 'border-emerald-600/50 shadow-lg shadow-emerald-950/50' : color === 'amber' ? 'border-amber-600/30' : 'border-neutral-800'
                    }`}
                  >
                    {badge && (
                      <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                        color === 'emerald' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                      }`}>
                        {badge}
                      </span>
                    )}
                    <p className={`text-xs uppercase tracking-widest font-semibold mb-2 ${
                      color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-neutral-500'
                    }`}>{name}</p>
                    <div className="flex items-end gap-1 mb-3">
                      <span className={`text-4xl font-black ${color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-white'}`}>{rate}</span>
                      <span className="text-neutral-500 text-sm mb-1">{unit}</span>
                    </div>
                    <p className="text-neutral-500 text-xs mb-5 leading-relaxed">{desc}</p>
                    <ul className="space-y-2 flex-1">
                      {features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-neutral-400">
                          <CheckCircle size={12} className={color === 'emerald' ? 'text-emerald-500' : color === 'amber' ? 'text-amber-500' : 'text-neutral-600'} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {name !== 'Happy Hour' ? (
                      <button
                        onClick={() => setActiveSection('reservations')}
                        className={`mt-5 w-full py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                          'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                        }`}
                      >
                        Book Now
                      </button>
                    ) : (
                      <div className="mt-5 w-full py-2.5 rounded-xl text-xs font-semibold text-center bg-amber-950/40 text-amber-600 border border-amber-800/40">
                        🚶 Walk-in Only — No Online Booking
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Additional Info */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">Additional Information</h3>

                {/* Redemption notice */}
                <div className="flex gap-3 bg-emerald-950/40 border border-emerald-700/30 rounded-xl p-4 mb-5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600/20 flex items-center justify-center mt-0.5">
                    <Info size={13} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-emerald-300 text-xs font-semibold mb-1">Reservation Redemption Policy</p>
                    <p className="text-neutral-400 text-xs leading-relaxed">
                      After completing your reservation and 25% down payment, the <span className="text-white font-medium">remaining balance must be settled in full upon arrival</span> before your table time begins — payable via <span className="text-white font-medium">Cash or GCash</span>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'Minimum booking time', value: '1 hour' },
                    { label: 'Down payment required', value: '25% of total' },
                    { label: 'Remaining balance', value: 'Paid on-site before play begins' },
                    { label: 'Cancellation policy', value: '24 hours before reservation' },
                    { label: 'Payment methods', value: 'GCash, Cash' },
                    { label: 'Walk-in queue', value: 'First Come, First Served — when tables are available' },
                    { label: 'Extension charges', value: 'Regular rate applies' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-2 border-b border-neutral-800/60">
                      <span className="text-neutral-500">{label}</span>
                      <span className="text-neutral-200 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ EVENTS SECTION ════ */}
          {activeSection === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-screen-md mx-auto px-5 pb-20"
            >
              <div className="text-center mb-10 mt-6">
                <h2 className="text-3xl font-black text-white tracking-tight uppercase mb-3">Upcoming Events</h2>
                <p className="text-neutral-400 max-w-sm mx-auto text-sm">Join our exclusive tournaments, leagues, and holiday promos.</p>
              </div>

              <div className="space-y-6">
                {events.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-neutral-800 rounded-xl">
                    <p className="text-neutral-500">No upcoming events at the moment. Check back soon!</p>
                  </div>
                ) : (
                  events.map(event => (
                    <div key={event.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden relative group transition-all hover:border-emerald-600/30 flex flex-col">
                      
                      {/* Image Banner (if exists), else fallback gradient blur */}
                      {event.attachments && event.attachments.length > 0 ? (
                        <div className="w-full h-48 sm:h-64 bg-neutral-800 overflow-hidden relative flex-shrink-0">
                          <img 
                            src={event.attachments[0]} 
                            alt={event.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent" />
                        </div>
                      ) : (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-colors pointer-events-none" />
                      )}
                      
                      <div className="p-6 relative z-10 flex-1 flex flex-col">
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4">
                          <div>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-md mb-2 inline-block">
                              {event.type}
                            </span>
                            <h3 className="text-xl font-bold text-neutral-100 mb-1">{event.title}</h3>
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <p className="text-sm font-black text-emerald-500 bg-emerald-950/30 border border-emerald-900/50 px-3 py-1 rounded-lg">
                              {new Date(event.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        
                        <p className="text-sm text-neutral-400 mb-6 leading-relaxed flex-1">
                          {event.description}
                        </p>
                        
                        <div className="flex items-center justify-between border-t border-neutral-800/60 pt-4 mt-auto">
                          <div className="text-xs text-neutral-500 font-medium">
                            {event.maxParticipants ? (
                              event.slotsFull 
                                ? <span className="text-rose-400 font-bold bg-rose-950/30 px-2 py-1 rounded">Sold Out</span> 
                                : <span>Max {event.maxParticipants} participants</span>
                            ) : <span>Open to all</span>}
                          </div>
                          
                          {event.registrationLink ? (
                            <a 
                              href={event.registrationLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs bg-white text-black font-semibold px-4 py-2.5 rounded-full hover:bg-neutral-200 transition-colors flex items-center gap-1.5 shadow-lg shadow-white/10"
                            >
                              Register Now <ExternalLink size={12} strokeWidth={2.5} />
                            </a>
                          ) : (
                            <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">
                              No Registration Required
                            </div>
                          )}
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
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-5xl mx-auto px-6 py-10"
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-white mb-2">About One Shot</h2>
                <p className="text-neutral-400 text-sm">The story behind your favorite billiards destination</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-12">
                <div>
                  <p className="text-emerald-400 text-xs uppercase tracking-widest font-semibold mb-3">Our Story</p>
                  <h3 className="text-2xl font-bold text-white mb-4">A Passion for the Game</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                    One Shot Bar & Billiards was founded with a simple mission: to create the ultimate billiard experience in Cainta, Rizal. What started as a small hobby shop has grown into the premier billiards destination in Eastern Rizal.
                  </p>
                  <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                    Our 10 tournament-grade tables are maintained with precision, and our staff are passionate players themselves who understand what makes a great game environment.
                  </p>
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    Whether you're a seasoned champion or picking up a cue for the first time, One Shot welcomes you. Come in, relax, and take your shot!
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden h-72">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1761335633357-04fab36b333f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXIlMjBsb3VuZ2UlMjBkYXJrJTIwYW1iaWFuY2V8ZW58MXx8fHwxNzc0OTUxMzE1fDA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="One Shot Bar & Billiards"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Location Map — moved above Facilities */}
              <div className="mb-12">
                <h3 className="text-center text-xl font-bold text-white mb-6">Our Location</h3>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden h-64 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-neutral-800/50" />
                  <div className="relative z-10 text-center">
                    <MapPin size={32} className="text-emerald-500 mx-auto mb-2" />
                    <p className="text-white font-semibold text-sm">One Shot Bar & Billiards</p>
                    <p className="text-neutral-400 text-xs">Autobase OAX, San Juan, Cainta, Rizal 1900</p>
                    <a
                      href="https://maps.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-xs bg-emerald-600 text-white px-4 py-2 rounded-full hover:bg-emerald-500 transition-colors"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              </div>

              {/* ── Contact & Socials ── */}
              <div className="border-t border-neutral-800 pt-10">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-white mb-1">Contact Us</h3>
                  <p className="text-neutral-400 text-sm">We'd love to hear from you. Get in touch!</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    {[
                      { icon: MapPin, label: 'Address', value: 'Autobase OAX\nSan Juan, Cainta, Rizal 1900', color: 'emerald' },
                      { icon: Phone, label: 'Phone / Viber', value: '0917-123-4567\n0998-765-4321', color: 'sky' },
                      { icon: Mail, label: 'Email', value: 'oneshot.billiards@gmail.com', color: 'violet' },
                      { icon: Clock, label: 'Operating Hours', value: 'Mon – Sat: 12:00 PM – 3:00 AM\nSunday: 5:00 PM – 3:00 AM', color: 'amber' },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className={`bg-neutral-900 border border-neutral-800 hover:border-${color}-600/30 rounded-xl p-5 transition-all flex gap-4`}>
                        <div className={`w-10 h-10 rounded-xl bg-${color}-600/10 border border-${color}-600/20 flex items-center justify-center flex-shrink-0`}>
                          <Icon size={16} className={`text-${color}-400`} />
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
                          {value.split('\n').map((line, i) => (
                            <p key={i} className="text-sm text-neutral-200">{line}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-3">Follow Us</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { platform: 'Facebook', handle: '@OneShotBilliards', icon: '📘' },
                          { platform: 'Instagram', handle: '@oneshot_billiards', icon: '📸' },
                          { platform: 'TikTok', handle: '@oneshotbilliards', icon: '🎵' },
                          { platform: 'YouTube', handle: 'One Shot Billiards', icon: '📺' },
                        ].map(({ platform, handle, icon }) => (
                          <div key={platform} className="flex items-center gap-2.5 bg-neutral-800/60 rounded-lg p-3">
                            <span className="text-lg">{icon}</span>
                            <div>
                              <p className="text-[10px] text-neutral-500">{platform}</p>
                              <p className="text-xs text-neutral-300">{handle}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ FEEDBACK SECTION ════ */}
          {activeSection === 'feedback' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto px-6 py-10"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-white mb-2">Send us Feedback</h2>
                <p className="text-neutral-400 text-sm">We value your experience. Let us know how we can improve!</p>
              </div>

              {feedbackSent ? (
                <div className="bg-sky-600/10 border border-sky-600/30 rounded-2xl p-10 text-center">
                  <CheckCircle size={40} className="text-sky-400 mx-auto mb-3" />
                  <p className="text-sky-300 font-semibold text-lg mb-1">Message Sent!</p>
                  <p className="text-neutral-500 text-sm">Our management team will review your message shortly. Thank you!</p>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="text-sky-400" size={18} />
                    <p className="text-sm font-semibold text-white">Direct Message to Management</p>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5">Your Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={feedbackForm.name}
                      onChange={e => setFeedbackForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Juan dela Cruz"
                      required
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5">Contact Information <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={feedbackForm.contact}
                      onChange={e => setFeedbackForm(f => ({ ...f, contact: e.target.value }))}
                      placeholder="Email or Phone Number"
                      required
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5">Type of Feedback <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <select
                        value={feedbackForm.type}
                        onChange={e => setFeedbackForm(f => ({ ...f, type: e.target.value }))}
                        required
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-sky-500 transition-colors appearance-none pr-9"
                      >
                        <option value="" disabled>Select a category...</option>
                        <option value="compliment">Compliment</option>
                        <option value="suggestion">Suggestion</option>
                        <option value="complaint">Concern / Complaint</option>
                        <option value="lost_item">Lost Item</option>
                        <option value="other">Other</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5">Message <span className="text-rose-500">*</span></label>
                    <textarea
                      value={feedbackForm.message}
                      onChange={e => setFeedbackForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Please provide details..."
                      rows={4}
                      required
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500 transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!feedbackForm.name || !feedbackForm.contact || !feedbackForm.type || !feedbackForm.message}
                    className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    Submit Feedback
                  </button>
                </form>
              )}
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Footer ── */}
        <footer className="bg-neutral-900 border-t border-neutral-800 mt-10 py-8 px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <img
                src={logoImg}
                alt="One Shot Bar & Billiards"
                className="h-8 w-8 object-contain"
              />
              <span className="text-white font-bold text-sm">One Shot Bar & Billiards</span>
            </div>
            <p className="text-neutral-600 text-xs mb-2">Autobase OAX, Cainta, Rizal · Mon–Sat 12PM–3AM · Sun 5PM–3AM</p>
            <p className="text-neutral-700 text-[10px]">© 2026 One Shot Bar & Billiards. All rights reserved.</p>
          </div>
        </footer>
      </main>

      {/* ════ MODALS ════ */}

      {/* Customer Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white">Customer Login</h3>
                  <p className="text-xs text-neutral-500">Welcome back!</p>
                </div>
                <button onClick={() => setShowLoginModal(false)} className="text-neutral-600 hover:text-neutral-300 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {loginForm.error && (
                <div className="bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs px-3 py-2 rounded-lg mb-4">
                  {loginForm.error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={e => setLoginForm(f => ({ ...f, email: e.target.value, error: '' }))}
                    placeholder="your@email.com"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={loginForm.showPw ? 'text' : 'password'}
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value, error: '' }))}
                      placeholder="••••••••"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      onClick={() => setLoginForm(f => ({ ...f, showPw: !f.showPw }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400"
                    >
                      {loginForm.showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLoginSubmit}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-semibold transition-all"
              >
                Login
              </button>

              <p className="text-center text-xs text-neutral-600 mt-4">
                Don't have an account?{' '}
                <button
                  onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); }}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Register
                </button>
              </p>

              {/* Prototype Logins */}
              <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-center gap-4">
                <button
                  onClick={() => {
                    adminLogin('admin', 'admin123');
                    navigate('/admin');
                  }}
                  className="text-xs text-neutral-400 hover:text-amber-400 transition-colors"
                >
                  Admin Prototype Login
                </button>
                <button
                  onClick={() => {
                    staffLogin('staff', 'staff123');
                    navigate('/staff');
                  }}
                  className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors"
                >
                  Staff Prototype Login
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer Register Modal */}
      <AnimatePresence>
        {showRegisterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowRegisterModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white">Create Account</h3>
                  <p className="text-xs text-neutral-500">Join One Shot today</p>
                </div>
                <button onClick={() => setShowRegisterModal(false)} className="text-neutral-600 hover:text-neutral-300 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {registerForm.error && (
                <div className="bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs px-3 py-2 rounded-lg mb-4">
                  {registerForm.error}
                </div>
              )}

              <div className="space-y-3">
                {[
                  { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Juan dela Cruz' },
                  { key: 'email', label: 'Email', type: 'email', placeholder: 'juan@email.com' },
                  { key: 'phone', label: 'Contact Number', type: 'tel', placeholder: '09XX-XXX-XXXX' },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-neutral-400 mb-1.5">{label} <span className="text-rose-500">*</span></label>
                    <input
                      type={type}
                      value={(registerForm as any)[key]}
                      onChange={e => setRegisterForm(f => ({ ...f, [key]: e.target.value, error: '' }))}
                      placeholder={placeholder}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Password <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input
                      type={registerForm.showPw ? 'text' : 'password'}
                      value={registerForm.password}
                      onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value, error: '' }))}
                      placeholder="••••••••"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      onClick={() => setRegisterForm(f => ({ ...f, showPw: !f.showPw }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400"
                    >
                      {registerForm.showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Referral Code <span className="text-neutral-600">(optional)</span></label>
                  <input
                    type="text"
                    value={registerForm.referralCode}
                    onChange={e => setRegisterForm(f => ({ ...f, referralCode: e.target.value.toUpperCase(), error: '' }))}
                    placeholder="e.g. JUAN-AB12"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                  <p className="text-[10px] text-neutral-600 mt-1">Enter a friend's referral code to get a bonus!</p>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={registerForm.confirm}
                    onChange={e => setRegisterForm(f => ({ ...f, confirm: e.target.value, error: '' }))}
                    placeholder="••••••••"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleRegisterSubmit}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-semibold transition-all"
              >
                Create Account
              </button>

              <p className="text-center text-xs text-neutral-600 mt-4">
                Already have an account?{' '}
                <button
                  onClick={() => { setShowRegisterModal(false); setShowLoginModal(true); }}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Login
                </button>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && currentUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white">My Profile</h3>
                  <p className="text-xs text-neutral-500">Your account details</p>
                </div>
                <button onClick={() => setShowProfileModal(false)} className="text-neutral-600 hover:text-neutral-300 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center text-xl font-black text-white">
                  {currentUser.name[0]}
                </div>
                <div>
                  <p className="text-base font-bold text-white">{currentUser.name}</p>
                  <p className="text-xs text-neutral-500">{currentUser.email}</p>
                </div>
              </div>
              {(() => {
                const referralUses = reservations.filter(r => r.promoCode === currentUser.referralCode);
                const totalDiscount = referralUses.reduce((s, r) => s + (r.discountAmount || 0), 0);
                return (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4 space-y-3">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Your Referral Code</p>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-lg font-black text-emerald-400 font-mono tracking-widest">{currentUser.referralCode}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(currentUser.referralCode).catch(() => {})}
                        className="p-2 rounded-lg text-neutral-500 hover:text-emerald-400 hover:bg-neutral-800 transition-colors"
                        title="Copy referral code"
                      >
                        <Award size={15} />
                      </button>
                    </div>
                    <p className="text-[10px] text-neutral-600">Share this code with friends. They can enter it during reservation!</p>
                    <div className="border-t border-neutral-800 pt-3 grid grid-cols-2 gap-3">
                      <div className="bg-neutral-800/60 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-black text-emerald-400">{referralUses.length}</p>
                        <p className="text-[10px] text-neutral-500">People used your code</p>
                      </div>
                      <div className="bg-neutral-800/60 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-black text-amber-400">₱{totalDiscount.toLocaleString()}</p>
                        <p className="text-[10px] text-neutral-500">Total discount given</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <button
                onClick={() => { setCurrentUser(null); setShowProfileModal(false); }}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors"
              >
                Logout
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {reservationStep === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Down Payment</h3>
                  <p className="text-xs text-neutral-500">Step 2 of 2 · Secure your reservation</p>
                </div>
                <button onClick={closeReservation} className="text-neutral-600 hover:text-neutral-300">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6">
                {/* Amount */}
                <div className="bg-amber-950/30 border border-amber-800/30 rounded-xl p-4 mb-5 text-center">
                  <p className="text-xs text-amber-500 mb-1">Amount Due (25% Down Payment)</p>
                  <p className="text-4xl font-black text-amber-400">₱{downPayment}.00</p>
                  <p className="text-xs text-neutral-500 mt-1">Remaining balance <span className="text-neutral-300 font-semibold">₱{totalAmount - downPayment}.00</span> must be paid on arrival</p>
                  <p className="text-[10px] text-neutral-600 mt-0.5">Remaining balance is due before your table time starts — Cash or GCash</p>
                </div>

                {/* Booking summary */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-5 text-xs space-y-1.5">
                  <div className="flex justify-between"><span className="text-neutral-500">Name</span><span className="text-neutral-200">{resForm.name}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Date</span><span className="text-neutral-200">{selectedDate?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Time</span><span className="text-neutral-200">{resForm.timeSlot} ({resForm.duration}h)</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Pax</span><span className="text-neutral-200">{resForm.pax} person{resForm.pax > 1 ? 's' : ''}</span></div>
                </div>

                {/* Payment Method — GCash only */}
                <div className="flex items-center justify-center gap-2 mb-5 bg-blue-950/30 border border-blue-700/30 rounded-xl py-2.5">
                  <span className="text-base">💙</span>
                  <span className="text-sm font-semibold text-blue-300">GCash Down Payment</span>
                </div>

                {/* QR Code & Upload */}
                <div className="flex flex-col items-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <QRDisplay
                      pattern={QR_GCASH}
                      color="#1d4ed8"
                    />
                    <div className="text-center">
                      <p className="text-sm font-bold text-blue-400">GCash</p>
                      <p className="text-xs text-neutral-300 font-semibold">ONE SHOT BAR & BILLIARDS</p>
                      <p className="text-xs text-neutral-500">+63 917-123-4567</p>
                    </div>
                  </div>

                  <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-neutral-500">Scan the QR code using your GCash app</p>
                    <p className="text-xs text-neutral-600 mt-0.5">Send exactly <span className="text-amber-400 font-semibold">₱{downPayment}.00</span></p>
                  </div>

                  {/* Upload Receipt & Ref No */}
                  <div className="w-full space-y-3 mt-2 text-left">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1.5">GCash Reference Number <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        value={paymentRef}
                        onChange={e => setPaymentRef(e.target.value.replace(/\D/g, '').slice(0, 13))}
                        placeholder="13-digit reference no."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1.5">Upload Receipt Screenshot <span className="text-rose-500">*</span></label>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 cursor-pointer bg-neutral-950 border border-dashed border-neutral-700 hover:border-blue-500 rounded-lg px-3 py-3 text-center transition-colors flex flex-col items-center justify-center gap-1">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) setReceiptImg(URL.createObjectURL(file));
                            }} 
                          />
                          <Upload size={14} className="text-neutral-500" />
                          <span className="text-[10px] text-neutral-400">
                            {receiptImg ? 'Change Image' : 'Tap to upload'}
                          </span>
                        </label>
                        {receiptImg && (
                          <div className="w-14 h-14 rounded-lg border border-neutral-700 overflow-hidden flex-shrink-0 bg-neutral-900">
                            <img src={receiptImg} alt="Receipt" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePaymentConfirm}
                  disabled={confirmingPayment || !paymentRef || paymentRef.length < 13 || !receiptImg}
                  className="w-full mt-5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {confirmingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={15} />
                      I've Sent the Payment
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-neutral-700 mt-3">
                  By confirming, you agree that payment has been sent. Staff will verify your payment before confirming your reservation.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ FLOATING LIVE MONITOR ════ */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {isLiveMonitorOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl shadow-black/60 w-72 max-h-[70vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-neutral-200">Live Status</span>
                </div>
                <button onClick={() => setIsLiveMonitorOpen(false)} className="text-neutral-600 hover:text-neutral-300 transition-colors">
                  <X size={14} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {/* Tables */}
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
                    {tables.map(table => {
                      const isAvail = table.status === 'available';
                      const isRes = table.status === 'reserved';
                      let statusLabel = isAvail ? 'Free' : isRes ? 'Reserved' : 'Occupied';
                      let dotColor = isAvail ? 'bg-emerald-500' : isRes ? 'bg-amber-500' : 'bg-rose-500';
                      let timeDetail = '';
                      if (table.session) {
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

                {/* Queue */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Walk-in Queue</p>
                    <span className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full font-bold">
                      {queue.filter(q => q.status === 'waiting').length} waiting
                    </span>
                  </div>
                  
                  {/* 🔴 NEW AI WAIT TIME CARD */}
                  <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3 mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-emerald-400" />
                      <span className="text-xs text-emerald-300 font-semibold">AI Est. Wait Time</span>
                    </div>
                    <span className="text-sm font-black text-emerald-400">{calculateAIWaitTime()}</span>
                  </div>

                  <p className="text-[9px] text-amber-500/80 font-semibold mb-2 flex items-center gap-1">
                    <Info size={9} /> Reservations skip this queue
                  </p>
                  {queue.filter(q => q.status === 'waiting').length === 0 ? (
                    <div className="text-center py-4 border border-dashed border-neutral-800 rounded-lg">
                      <p className="text-[10px] text-neutral-600">No one waiting</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {queue.filter(q => q.status === 'waiting').slice(0, 5).map((q, i) => (
                        <div key={q.id} className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-2">
                          <span className="text-[9px] font-black text-neutral-500 w-3">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-neutral-300 truncate">{q.customerName || 'Walk-in'}</p>
                            <p className="text-[9px] text-neutral-600">{q.partySize} pax · {new Date(q.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      ))}
                      {queue.filter(q => q.status === 'waiting').length > 5 && (
                        <p className="text-[10px] text-neutral-600 text-center">+{queue.filter(q => q.status === 'waiting').length - 5} more</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <button
          onClick={() => setIsLiveMonitorOpen(p => !p)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
            isLiveMonitorOpen
              ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 shadow-black/40'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50'
          }`}
          title="Live Tables & Queue"
        >
          {isLiveMonitorOpen ? <X size={18} /> : <Users size={18} />}
        </button>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {reservationStep === 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 rounded-full bg-emerald-600/15 border border-emerald-600/30 flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle size={32} className="text-emerald-400" />
              </motion.div>
              <h3 className="text-xl font-black text-white mb-2">Reservation Submitted!</h3>
              <p className="text-neutral-500 text-sm mb-4 leading-relaxed">
                Your reservation for <strong className="text-neutral-200">{selectedDate?.toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })}</strong> at <strong className="text-neutral-200">{resForm.timeSlot}</strong> has been submitted. Our staff will verify your payment and confirm shortly.
              </p>

              <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 mb-5 text-center">
                <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold mb-1">Your Reservation ID</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black text-white tracking-[0.2em] font-mono">{generatedResId}</span>
                  <button onClick={() => navigator.clipboard.writeText(generatedResId)} className="text-emerald-400 hover:text-emerald-300 p-1 bg-emerald-600/20 rounded-md" title="Copy ID">
                    <Copy size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Please save this ID. You can use it to track your booking status.</p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-5 text-xs space-y-1.5 text-left">
                <div className="flex justify-between"><span className="text-neutral-500">Name</span><span className="text-neutral-200">{resForm.name}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Email</span><span className="text-neutral-200">{resForm.email}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Down Payment</span><span className="text-emerald-400 font-semibold">₱{downPayment}.00 ✓</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Status</span><span className="text-amber-400">Pending Verification</span></div>
              </div>
              <button
                onClick={closeReservation}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-semibold transition-all"
              >
                Back to Home
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      
    </div>
      
  );
}