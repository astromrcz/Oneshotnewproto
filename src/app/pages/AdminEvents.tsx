import { useState, useRef } from 'react';
import {
  Calendar as CalendarIcon, Plus, Trash2, Edit2, Tag, Paperclip, X, Link,
  Users, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Wand2, Copy, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight,
  RefreshCw, CalendarX2, List, Network, Clock, Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAppContext, generateRandomPromoCode } from '../context/AppContext';
import type { Event, PromoCode, ClosedDate, Reservation } from '../context/AppContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, addMonths, subMonths } from 'date-fns';

const EVENT_TYPES = ['Tournament', 'League', 'Other'];
const todayStart = startOfDay(new Date());

// ── Types ────────────────────────────────────────────────────────
type FormState = {
  title: string; dates: string[]; type: string; description: string;
  startTime: string; endTime: string;
  registrationLink: string; bracketLink: string; maxParticipants: string; slotsFull: boolean;
  attachments: string[];
};

type PromoForm = {
  code: string; discountPercent: number; description: string;
  isLimitedUses: boolean; maxUsage: number; deleteWhenDepleted: boolean;
  isActive: boolean; hasExpiry: boolean; expiresAt: string;
};

type ClosureForm = { reason: string; isFullDay: boolean; openTime: string; closeTime: string; };

const emptyEventForm: FormState = { title: '', dates: [], type: 'Tournament', description: '', startTime: '18:00', endTime: '22:00', registrationLink: '', bracketLink: '', maxParticipants: '', slotsFull: false, attachments: [] };
const emptyPromoForm: PromoForm = { code: '', discountPercent: 10, description: '', isLimitedUses: true, maxUsage: 100, deleteWhenDepleted: false, isActive: true, hasExpiry: false, expiresAt: '' };
const emptyClosureForm: ClosureForm = { reason: '', isFullDay: true, openTime: '12:00', closeTime: '22:00' };

export function AdminEvents() {
  const { 
    events, addEvent, updateEvent, deleteEvent, 
    promoCodes, addPromoCode, updatePromoCode, togglePromoCode, deletePromoCode,
    closedDates, addClosedDate, removeClosedDate, updateClosedDate,
    reservations
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'calendar' | 'events' | 'promos'>('calendar');

  // Calendar State
  const [viewMonth, setViewMonth] = useState(new Date());
  
  // Modals State
  const [dayActionDate, setDayActionDate] = useState<Date | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Event Form State
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<FormState>(emptyEventForm);
  const [modalMonth, setModalMonth] = useState(new Date()); // For the inline multi-select calendar
  const [expandedAttachments, setExpandedAttachments] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Promo Form State
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState<PromoForm>(emptyPromoForm);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Closure Form State
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [editingClosureId, setEditingClosureId] = useState<string | null>(null);
  const [closureForm, setClosureForm] = useState<ClosureForm>(emptyClosureForm);
  const [closureDateStr, setClosureDateStr] = useState('');

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // ── Mappers & Helpers ──────────────────────────────────────────
  const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');
  
  const closedMap = new Map(closedDates.map(c => [c.date, c]));
  
  // Map reservations by date
  const resMap = reservations.reduce((acc, r) => {
    if (r.status !== 'cancelled') {
      const d = dateKey(new Date(r.date));
      if (!acc[d]) acc[d] = [];
      acc[d].push(r);
    }
    return acc;
  }, {} as Record<string, Reservation[]>);

  // Map events that span multiple dates (comma separated)
  const eventsMap = events.reduce((acc, e) => {
    if (!e.date) return acc;
    const datesArray = e.date.split(',');
    datesArray.forEach(d => {
      const key = d.trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
    });
    return acc;
  }, {} as Record<string, Event[]>);
  
  const promosMap = promoCodes.reduce((acc, p) => {
    if(p.expiresAt) {
      const d = format(new Date(p.expiresAt), 'yyyy-MM-dd');
      if (!acc[d]) acc[d] = [];
      acc[d].push(p);
    }
    return acc;
  }, {} as Record<string, PromoCode[]>);

  const getPromoStatus = (p: any) => {
    if (!p.isActive) return { label: 'Inactive', color: 'bg-neutral-700/40 text-neutral-500 border-neutral-700' };
    if (p.isLimitedUses && p.usageCount >= p.maxUsage) return { label: 'Exhausted', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    if (p.expiresAt && new Date() > new Date(p.expiresAt)) return { label: 'Expired', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    return { label: 'Active', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  };

  // ── Opening Modals ──────────────────────────────────────────────
  const openEventCreate = (prefillDate?: Date) => {
    setEditingEventId(null);
    const initialDates = prefillDate ? [dateKey(prefillDate)] : [];
    setEventForm({ ...emptyEventForm, dates: initialDates });
    setModalMonth(prefillDate || new Date());
    setDayActionDate(null);
    setShowEventModal(true);
  };

  const openEventEdit = (ev: any) => {
    setEditingEventId(ev.id);
    const durationParts = ev.duration ? ev.duration.split(' - ') : [];
    const savedDates = ev.date ? ev.date.split(',') : [];
    
    setEventForm({
      title: ev.title, 
      dates: savedDates, 
      type: ev.type, 
      description: ev.description,
      startTime: durationParts[0] || '18:00',
      endTime: durationParts[1] || '22:00',
      registrationLink: ev.registrationLink ?? '', 
      bracketLink: ev.bracketLink ?? '', 
      maxParticipants: ev.maxParticipants?.toString() ?? '',
      slotsFull: ev.slotsFull ?? false, 
      attachments: ev.attachments ?? []
    });
    
    if (savedDates.length > 0) setModalMonth(new Date(savedDates[0]));
    setDayActionDate(null); setShowEventModal(true);
  };

  const openClosureCreate = (d: Date) => {
    setEditingClosureId(null); setClosureForm(emptyClosureForm);
    setClosureDateStr(dateKey(d)); setDayActionDate(null); setShowClosureModal(true);
  };
  const openClosureEdit = (c: ClosedDate) => {
    setEditingClosureId(c.id); setClosureForm({ reason: c.reason, isFullDay: c.isFullDay, openTime: c.openTime || '12:00', closeTime: c.closeTime || '22:00' });
    setClosureDateStr(c.date); setDayActionDate(null); setShowClosureModal(true);
  };

  const openPromoCreate = (prefillDate?: Date) => {
    setEditingPromoId(null);
    setPromoForm({ ...emptyPromoForm, hasExpiry: !!prefillDate, expiresAt: prefillDate ? `${dateKey(prefillDate)}T23:59` : '' });
    setDayActionDate(null); setShowPromoModal(true);
  };
  const openPromoEdit = (p: any) => {
    setEditingPromoId(p.id);
    setPromoForm({ 
      code: p.code, discountPercent: p.discountPercent, description: p.description, 
      isLimitedUses: p.isLimitedUses !== false, maxUsage: p.maxUsage, deleteWhenDepleted: p.deleteWhenDepleted || false,
      isActive: p.isActive, hasExpiry: !!p.expiresAt, expiresAt: p.expiresAt ? format(new Date(p.expiresAt), "yyyy-MM-dd'T'HH:mm") : '' 
    });
    setDayActionDate(null); setShowPromoModal(true);
  };

  // ── Saving Modals ───────────────────────────────────────────────
  const saveEvent = () => {
    if (!eventForm.title || eventForm.dates.length === 0) {
      alert("Please provide a title and select at least one date.");
      return;
    }

    const payload: any = {
      title: eventForm.title, 
      date: eventForm.dates.join(','), // Saves array of dates as a comma-separated string
      type: eventForm.type, 
      description: eventForm.description,
      duration: `${eventForm.startTime} - ${eventForm.endTime}`, // Joins time inputs into duration string
      registrationLink: eventForm.registrationLink || undefined,
      bracketLink: eventForm.bracketLink || undefined,
      maxParticipants: eventForm.maxParticipants ? parseInt(eventForm.maxParticipants) : undefined,
      slotsFull: eventForm.slotsFull, 
      attachments: eventForm.attachments.length ? eventForm.attachments : undefined,
    };
    if (editingEventId) updateEvent(editingEventId, payload);
    else addEvent(payload);
    
    setShowEventModal(false); flash('Event saved successfully!');
  };

  const saveClosure = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClosureId) updateClosedDate(editingClosureId, closureForm);
    else addClosedDate({ date: closureDateStr, ...closureForm });
    setShowClosureModal(false); flash('Closure saved successfully!');
  };

  const savePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.code || !promoForm.description) return;
    const payload: any = {
      code: promoForm.code.toUpperCase(), discountPercent: promoForm.discountPercent, description: promoForm.description, 
      isActive: promoForm.isActive, isLimitedUses: promoForm.isLimitedUses,
      maxUsage: promoForm.isLimitedUses ? promoForm.maxUsage : 999999,
      deleteWhenDepleted: promoForm.isLimitedUses ? promoForm.deleteWhenDepleted : false,
      expiresAt: promoForm.hasExpiry && promoForm.expiresAt ? new Date(promoForm.expiresAt) : undefined,
    };
    if (editingPromoId) updatePromoCode(editingPromoId, payload);
    else addPromoCode(payload);
    setShowPromoModal(false); flash('Promo code saved successfully!');
  };

  // ── Utils ────────────────────────────────────────────────────────
  const isImage = (dataUrl: string) => dataUrl.startsWith('data:image/');
  const getFileName = (dataUrl: string, index: number) => {
    const match = dataUrl.match(/^data:([^;]+);/);
    return `attachment-${index + 1}.${match?.[1]?.split('/')[1] ?? 'bin'}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setEventForm(prev => ({ ...prev, attachments: [...prev.attachments, reader.result as string] }));
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setEventForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
  };

  // ── Render Helpers ───────────────────────────────────────────────
  const renderCalendar = () => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd   = endOfMonth(viewMonth);
    const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startPad   = monthStart.getDay();

    return (
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
        {/* Month nav */}
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
              <div key={d} className="text-center text-[10px] text-neutral-600 uppercase tracking-wider font-semibold py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const key = dateKey(day);
              const isPast = isBefore(day, todayStart);
              const isToday = isSameDay(day, new Date());
              
              const dayCls = closedMap.get(key);
              const dayEvs = eventsMap[key] || [];
              const dayPrs = promosMap[key] || [];
              const dayRes = resMap[key] || [];

              return (
                <button
                  key={key}
                  onClick={() => setDayActionDate(day)}
                  className={`relative aspect-square rounded-xl p-1.5 flex flex-col items-start transition-all border
                    ${isPast ? 'bg-neutral-900/40 border-neutral-800/40 text-neutral-700 cursor-default' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-600 cursor-pointer'}
                    ${isToday ? 'ring-1 ring-amber-500/50' : ''}
                    ${dayCls ? 'bg-rose-950/20 border-rose-900/30' : ''}
                  `}
                >
                  <span className={`font-semibold text-xs ${isToday ? 'text-amber-400' : isPast ? 'text-neutral-600' : 'text-neutral-300'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* Indicators Container */}
                  <div className="mt-auto w-full space-y-0.5 overflow-hidden">
                    {dayCls && <div className="w-full text-[8px] bg-rose-500/20 text-rose-400 rounded px-1 truncate font-semibold">Closed</div>}
                    
                    {!dayCls && dayRes.length > 0 && (
                      <div className="w-full text-[8px] bg-blue-500/20 text-blue-400 rounded px-1 truncate font-semibold border border-blue-500/30">
                        {dayRes.length} Rsv
                      </div>
                    )}
                    
                    {!dayCls && dayEvs.map(e => (
                      <div key={e.id} className="w-full text-[8px] bg-amber-500/20 text-amber-400 rounded px-1 truncate font-semibold">{e.title}</div>
                    ))}
                    {!dayCls && dayPrs.map(p => (
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

  const renderModalCalendar = () => {
    const monthStart = startOfMonth(modalMonth);
    const monthEnd   = endOfMonth(modalMonth);
    const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startPad   = monthStart.getDay();

    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 select-none">
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => setModalMonth(m => subMonths(m, 1))} className="p-1 text-neutral-400 hover:text-white"><ChevronLeft size={14}/></button>
          <span className="text-xs font-bold text-neutral-200">{format(modalMonth, 'MMMM yyyy')}</span>
          <button type="button" onClick={() => setModalMonth(m => addMonths(m, 1))} className="p-1 text-neutral-400 hover:text-white"><ChevronRight size={14}/></button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-center text-[9px] text-neutral-500 font-bold">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const key = dateKey(day);
            const isSelected = eventForm.dates.includes(key);
            const isPast = isBefore(day, todayStart);
            return (
              <button
                type="button"
                key={key}
                disabled={isPast}
                onClick={() => {
                  setEventForm(prev => {
                    const dates = prev.dates.includes(key) ? prev.dates.filter(d => d !== key) : [...prev.dates, key];
                    return { ...prev, dates };
                  });
                }}
                className={`aspect-square rounded-md text-[10px] font-semibold flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-amber-500 text-neutral-950' : isPast ? 'text-neutral-700 cursor-not-allowed border border-neutral-800' : 'bg-neutral-950 border border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEventsGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((ev: any) => {
        const isExpanded = expandedAttachments.has(ev.id);
        const attachments = ev.attachments ?? [];
        const imageAttachments = attachments.filter(isImage);
        const fileAttachments = attachments.filter(a => !isImage(a));
        
        // Show first date and how many additional dates it spans
        const eventDates = ev.date ? ev.date.split(',') : [];
        const dateDisplay = eventDates.length > 1 
          ? `${new Date(eventDates[0]).toLocaleDateString()} (+${eventDates.length - 1} days)` 
          : eventDates.length === 1 
            ? new Date(eventDates[0]).toLocaleDateString() 
            : 'No date';

        return (
          <Card key={ev.id} className="bg-neutral-900 border-neutral-800 overflow-hidden flex flex-col">
            {imageAttachments.length > 0 && (
              <div className="h-32 w-full overflow-hidden bg-neutral-950">
                <img src={imageAttachments[0]} alt={ev.title} className="w-full h-full object-cover opacity-80" />
              </div>
            )}
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-base text-neutral-200">{ev.title}</CardTitle>
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-1 rounded-full whitespace-nowrap">{ev.type}</span>
                  {ev.slotsFull && <span className="text-[10px] bg-rose-900/50 text-rose-400 border border-rose-800/40 px-2 py-1 rounded-full font-bold whitespace-nowrap">FULL</span>}
                </div>
              </div>
              <CardDescription className="text-xs text-amber-500 font-medium flex items-center gap-2">
                <CalendarIcon size={12}/> {dateDisplay}
                {ev.duration && <><span className="text-neutral-600">·</span><Clock size={12}/> {ev.duration}</>}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <p className="text-sm text-neutral-400 mb-3 line-clamp-3">{ev.description}</p>

              {ev.maxParticipants && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
                  <Users size={11} /><span>Max {ev.maxParticipants} participants</span>
                </div>
              )}

              {ev.registrationLink && (
                <a href={ev.registrationLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mb-2 truncate">
                  <Link size={11} className="flex-shrink-0" /><span className="truncate">Registration Form</span>
                </a>
              )}
              
              {ev.bracketLink && (
                <a href={ev.bracketLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 mb-3 truncate">
                  <Network size={11} className="flex-shrink-0" /><span className="truncate">View Brackets</span>
                </a>
              )}

              {attachments.length > 0 && (
                <div className="mb-3">
                  <button onClick={() => setExpandedAttachments(s => { const ns = new Set(s); if(ns.has(ev.id)) ns.delete(ev.id); else ns.add(ev.id); return ns; })}
                    className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
                    <Paperclip size={11} /><span>{attachments.length} attachment{attachments.length > 1 ? 's' : ''}</span>
                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 space-y-1.5">
                      {imageAttachments.slice(1).map((att, i) => <img key={i} src={att} alt="" className="w-full h-20 object-cover rounded-lg opacity-80" />)}
                      {fileAttachments.map((att, i) => (
                        <a key={i} href={att} download={getFileName(att, i)} className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800 rounded-lg px-2.5 py-1.5 truncate">
                          <Paperclip size={10} className="flex-shrink-0" />{getFileName(att, i)}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-auto pt-4">
                <Button variant="ghost" size="sm" className="h-8 text-neutral-500 hover:text-blue-400 hover:bg-blue-950/30" onClick={() => openEventEdit(ev)}>
                  <Edit2 size={14} />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-neutral-500 hover:text-rose-400 hover:bg-rose-950/30" onClick={() => deleteEvent(ev.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {events.length === 0 && (
        <div className="col-span-full py-12 text-center border-2 border-dashed border-neutral-800 rounded-xl">
          <CalendarIcon size={32} className="mx-auto text-neutral-600 mb-3" />
          <p className="text-neutral-400 font-medium">No events yet</p>
        </div>
      )}
    </div>
  );

  const renderPromosList = () => (
    <div className="space-y-3">
      {promoCodes.length === 0 ? (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-12 text-center">
          <Tag size={32} className="mx-auto text-neutral-700 mb-3" />
          <p className="text-neutral-500">No promo codes yet.</p>
        </div>
      ) : promoCodes.map((pc: any) => {
        const status = getPromoStatus(pc);
        return (
          <div key={pc.id} className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-neutral-700 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-violet-600/15 border border-violet-600/25 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-sm font-black text-violet-400">{pc.discountPercent}%</span>
              <span className="text-[9px] text-violet-600 font-semibold">OFF</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <div className="flex items-center gap-1.5 bg-neutral-800 rounded-lg px-2.5 py-1">
                  <Tag size={10} className="text-neutral-400" />
                  <span className="text-xs font-black text-white tracking-wider">{pc.code}</span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
              </div>
              <p className="text-xs text-neutral-400 mb-1">{pc.description}</p>
              <div className="flex items-center gap-3 text-[10px] text-neutral-600">
                {pc.isLimitedUses !== false ? (
                  <span>Uses: <strong className="text-neutral-400">{pc.usageCount}</strong>/{pc.maxUsage} {pc.deleteWhenDepleted && '(Auto-delete)'}</span>
                ) : (
                  <span>Uses: <strong className="text-neutral-400">{pc.usageCount}</strong> / Unlimited</span>
                )}
                {pc.expiresAt && <span>Expires: <strong className="text-neutral-400">{format(new Date(pc.expiresAt), 'MMM d, yyyy')}</strong></span>}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => { navigator.clipboard.writeText(pc.code); setCopiedCode(pc.code); setTimeout(()=>setCopiedCode(null),2000); }} title="Copy code"
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors">
                {copiedCode === pc.code ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
              <button onClick={() => openPromoEdit(pc)} className="p-1.5 rounded-lg text-neutral-500 hover:text-blue-400 hover:bg-neutral-800 transition-colors">
                <Edit2 size={14} />
              </button>
              <button onClick={() => togglePromoCode(pc.id)} title={pc.isActive ? 'Deactivate' : 'Activate'}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors">
                {pc.isActive ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
              </button>
              <button onClick={() => deletePromoCode(pc.id)} className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
            <CalendarX2 className="text-amber-500" size={24} />
            Events & Calendar
          </h2>
          <p className="text-xs text-neutral-400 mt-1">Manage schedules, tournaments, holidays, and promo codes.</p>
        </div>
        <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl p-1">
          {[
            { id: 'calendar', label: 'Calendar', icon: CalendarX2 },
            { id: 'events', label: 'Events List', icon: List },
            { id: 'promos', label: 'Promo Codes', icon: Tag },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === t.id ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'text-neutral-500 hover:text-neutral-300'
              }`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-700/40 text-emerald-400 text-sm px-4 py-3 rounded-xl">
          <CheckCircle size={14} /> {toast}
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {renderCalendar()}
          </div>
          <div className="space-y-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-neutral-200 mb-4">Quick Actions</h3>
              <div className="space-y-2 text-xs">
                <button onClick={() => openEventCreate()} className="w-full flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg transition-colors font-semibold">
                  <Plus size={14} /> Create Event
                </button>
                <button onClick={() => openPromoCreate()} className="w-full flex items-center gap-2 px-3 py-2.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 rounded-lg transition-colors font-semibold">
                  <Plus size={14} /> Create Promo Code
                </button>
              </div>
            </div>

            {/* Upcoming Agenda */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden flex flex-col max-h-[400px]">
              <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-900/50">
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Upcoming Agenda</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {events.filter(e => e.date && !isBefore(new Date(e.date.split(',')[0]), todayStart)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5).map(e => (
                  <div key={e.id} className="flex gap-3">
                    <div className="w-1 bg-amber-500 rounded-full" />
                    <div>
                      <p className="text-xs font-semibold text-neutral-200">{format(new Date(e.date.split(',')[0]), 'MMM d, yyyy')}</p>
                      <p className="text-[11px] text-amber-400 font-medium">{e.title}</p>
                    </div>
                  </div>
                ))}
                {closedDates.filter(c => !isBefore(new Date(c.date), todayStart)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5).map(c => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-1 bg-rose-500 rounded-full" />
                    <div>
                      <p className="text-xs font-semibold text-neutral-200">{format(new Date(c.date), 'MMM d, yyyy')}</p>
                      <p className="text-[11px] text-rose-400 font-medium">Closed: {c.reason}</p>
                    </div>
                  </div>
                ))}
                {promoCodes.filter(p => p.expiresAt && !isBefore(new Date(p.expiresAt), todayStart)).sort((a:any,b:any)=>a.expiresAt!.localeCompare(b.expiresAt!)).slice(0,3).map(p => (
                  <div key={p.id} className="flex gap-3">
                    <div className="w-1 bg-violet-500 rounded-full" />
                    <div>
                      <p className="text-xs font-semibold text-neutral-200">{format(new Date(p.expiresAt!), 'MMM d, yyyy')}</p>
                      <p className="text-[11px] text-violet-400 font-medium">Promo Expiring: {p.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'events' && renderEventsGrid()}
      {activeTab === 'promos' && renderPromosList()}

      {/* ════ MODALS ════ */}

      {/* 1. Day Action Modal (Clicking on Calendar) */}
      {dayActionDate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
              <h3 className="font-bold text-neutral-200">{format(dayActionDate, 'MMMM d, yyyy')}</h3>
              <button onClick={() => setDayActionDate(null)} className="p-1.5 text-neutral-500 hover:text-white rounded-lg transition-colors"><X size={15}/></button>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Show existing items on this day */}
              {(() => {
                const key = dateKey(dayActionDate);
                const dayEvs = eventsMap[key] || [];
                const dayPrs = promosMap[key] || [];
                const dayCls = closedMap.get(key);
                const hasItems = dayEvs.length || dayPrs.length || dayCls;

                return hasItems ? (
                  <div className="space-y-2 mb-4 bg-neutral-900/50 rounded-lg p-3 border border-neutral-800">
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-2">Existing Agenda</p>
                    {dayCls && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-rose-400 font-semibold truncate pr-2">Closed: {dayCls.reason}</span>
                        <button onClick={() => openClosureEdit(dayCls)} className="text-neutral-500 hover:text-white flex-shrink-0"><Edit2 size={12}/></button>
                      </div>
                    )}
                    {dayEvs.map(e => (
                      <div key={e.id} className="flex items-center justify-between text-xs mt-2">
                        <span className="text-amber-400 font-semibold truncate pr-2">Event: {e.title}</span>
                        <button onClick={() => openEventEdit(e)} className="text-neutral-500 hover:text-white flex-shrink-0"><Edit2 size={12}/></button>
                      </div>
                    ))}
                    {dayPrs.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs mt-2">
                        <span className="text-violet-400 font-semibold truncate pr-2">Promo Expiry: {p.code}</span>
                        <button onClick={() => openPromoEdit(p)} className="text-neutral-500 hover:text-white flex-shrink-0"><Edit2 size={12}/></button>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Add New</p>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => openEventCreate(dayActionDate)} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900 hover:bg-amber-500/10 border border-neutral-800 hover:border-amber-500/30 text-left transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500/20"><CalendarIcon size={14}/></div>
                  <div><p className="text-xs font-bold text-neutral-200">Event</p><p className="text-[10px] text-neutral-500">Tournament, league, etc.</p></div>
                </button>
                <button onClick={() => openClosureCreate(dayActionDate)} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900 hover:bg-rose-500/10 border border-neutral-800 hover:border-rose-500/30 text-left transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:bg-rose-500/20"><AlertTriangle size={14}/></div>
                  <div><p className="text-xs font-bold text-neutral-200">Mark Closed</p><p className="text-[10px] text-neutral-500">Stop reservations.</p></div>
                </button>
                <button onClick={() => openPromoCreate(dayActionDate)} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900 hover:bg-violet-500/10 border border-neutral-800 hover:border-violet-500/30 text-left transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500 group-hover:bg-violet-500/20"><Tag size={14}/></div>
                  <div><p className="text-xs font-bold text-neutral-200">Promo Code</p><p className="text-[10px] text-neutral-500">Set expiry for this day.</p></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50 flex-none">
              <h3 className="font-bold text-neutral-200">{editingEventId ? 'Edit Event' : 'Create Event'}</h3>
              <button onClick={() => setShowEventModal(false)} className="p-1.5 text-neutral-500 hover:text-white"><X size={15}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left Column: Calendar & Times */}
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-2">Select Event Date(s) *</label>
                    {renderModalCalendar()}
                    {eventForm.dates.length > 0 && (
                      <p className="text-[10px] text-amber-500 mt-2 text-center font-semibold">
                        {eventForm.dates.length} day{eventForm.dates.length > 1 && 's'} selected
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-semibold text-neutral-400 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5"><Clock size={11}/> Start Time</label>
                      <input type="time" value={eventForm.startTime} onChange={e => setEventForm({...eventForm, startTime: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-neutral-400 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5"><Clock size={11}/> End Time</label>
                      <input type="time" value={eventForm.endTime} onChange={e => setEventForm({...eventForm, endTime: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50" />
                    </div>
                  </div>
                </div>

                {/* Right Column: Event Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-1.5">Event Title *</label>
                    <Input value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} placeholder="e.g. 8-Ball Championship" className="bg-neutral-950 border-neutral-800" />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-1.5">Event Type</label>
                    <select className="w-full h-10 px-3 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-200 focus:outline-none focus:border-amber-500" value={eventForm.type} onChange={e => setEventForm({...eventForm, type: e.target.value})}>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-1.5">Description</label>
                    <textarea value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-3 text-sm text-neutral-200 h-24 resize-none focus:outline-none focus:border-amber-500" placeholder="Event details..." />
                  </div>

                  {eventForm.type === 'Tournament' && (
                    <div className="p-4 rounded-xl border border-emerald-900/30 bg-emerald-950/10 space-y-3">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Tournament Links (Optional)</p>
                      <div>
                        <label className="text-[10px] font-semibold text-neutral-400 block mb-1.5 flex items-center gap-1.5"><Link size={10} /> Registration / Form Link</label>
                        <Input value={eventForm.registrationLink} onChange={e => setEventForm({...eventForm, registrationLink: e.target.value})} placeholder="https://forms.google.com/..." className="bg-neutral-950 border-neutral-800 h-8 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-neutral-400 block mb-1.5 flex items-center gap-1.5"><Network size={10} /> Live Bracket Link</label>
                        <Input value={eventForm.bracketLink} onChange={e => setEventForm({...eventForm, bracketLink: e.target.value})} placeholder="https://challonge.com/..." className="bg-neutral-950 border-neutral-800 h-8 text-xs" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-neutral-400 block mb-1.5 flex items-center gap-1.5"><Users size={11} /> Max Participants</label>
                      <Input type="number" value={eventForm.maxParticipants} onChange={e => setEventForm({...eventForm, maxParticipants: e.target.value})} placeholder="e.g. 32" min="1" className="bg-neutral-950 border-neutral-800" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-neutral-400 block mb-1.5">Slots Status</label>
                      <button type="button" onClick={() => setEventForm(prev => ({ ...prev, slotsFull: !prev.slotsFull }))} className={`flex items-center gap-2 w-full h-10 px-3 rounded-md border text-sm font-semibold transition-all ${eventForm.slotsFull ? 'bg-rose-950/40 border-rose-700/50 text-rose-400' : 'bg-neutral-950 border-neutral-800 text-neutral-500'}`}>
                        {eventForm.slotsFull ? <ToggleRight size={18} className="text-rose-400" /> : <ToggleLeft size={18} />} {eventForm.slotsFull ? 'Slots Full' : 'Open'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-2 flex items-center gap-1.5">
                      <Paperclip size={11} /> Attachments / Images
                    </label>
                    <div className="space-y-2">
                      {eventForm.attachments.length > 0 && (
                        <div className="space-y-1.5">
                          {eventForm.attachments.map((att, i) => (
                            <div key={i} className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2">
                              {isImage(att) ? <img src={att} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" /> : <Paperclip size={14} className="text-neutral-500 flex-shrink-0" />}
                              <span className="text-xs text-neutral-400 truncate flex-1">{getFileName(att, i)}</span>
                              <button type="button" onClick={() => removeAttachment(i)} className="p-1 text-neutral-600 hover:text-rose-400"><X size={12} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-neutral-700 rounded-lg text-xs text-neutral-500 hover:border-amber-600/50 hover:text-amber-500 transition-colors">
                        <Paperclip size={13} /> Upload File
                      </button>
                      <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                    </div>
                  </div>

                </div>
              </div>
            </div>
            <div className="p-4 border-t border-neutral-800 flex justify-end gap-3 bg-neutral-950/50 flex-none">
              <Button variant="ghost" onClick={() => setShowEventModal(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-500 text-white" onClick={saveEvent}>{editingEventId ? 'Save Changes' : 'Create Event'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Closure Modal */}
      {showClosureModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-rose-900/30 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-neutral-100">{editingClosureId ? 'Edit Closure' : 'Mark as Closed'}</h2>
                <p className="text-xs text-neutral-500">{format(new Date(closureDateStr), 'EEEE, MMMM d, yyyy')}</p>
              </div>
              <button onClick={() => setShowClosureModal(false)} className="p-2 text-neutral-500 hover:text-white"><X size={16} /></button>
            </div>
            <form onSubmit={saveClosure} className="p-6 space-y-4">
              
              {/* Conflict Warning block */}
              {(() => {
                const conflicts = resMap[closureDateStr] || [];
                if (conflicts.length > 0) {
                  return (
                    <div className="bg-rose-950/40 border border-rose-800/50 rounded-xl p-4 space-y-3 mb-2">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                        <AlertTriangle size={16} />
                        <span>{conflicts.length} Reservation{conflicts.length > 1 ? 's' : ''} Affected</span>
                      </div>
                      <p className="text-xs text-rose-300/80 leading-relaxed">
                        Closing this date conflicts with active customer reservations. 
                      </p>
                      <button 
                        type="button" 
                        className="w-full bg-neutral-900 border border-rose-800/40 hover:border-rose-600 hover:bg-neutral-800 text-neutral-200 text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
                      >
                        <Mail size={13} className="text-rose-400" /> Email Customers to Reschedule
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block font-medium">Reason *</label>
                <input type="text" value={closureForm.reason} onChange={e => setClosureForm(f=>({...f,reason:e.target.value}))} required autoFocus className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-rose-500" placeholder="e.g. Holiday, Private Event" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-5 rounded-full relative transition-colors ${closureForm.isFullDay ? 'bg-rose-700' : 'bg-neutral-700'}`} onClick={() => setClosureForm(f=>({...f, isFullDay: !f.isFullDay}))}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${closureForm.isFullDay ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-neutral-300 font-medium">Full day closure</span>
              </label>
              {!closureForm.isFullDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block mb-1">Open Time</label>
                    <input type="time" value={closureForm.openTime} onChange={e => setClosureForm(f=>({...f,openTime:e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block mb-1">Close Time</label>
                    <input type="time" value={closureForm.closeTime} onChange={e => setClosureForm(f=>({...f,closeTime:e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-rose-500" />
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowClosureModal(false)} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-sm rounded-xl font-semibold py-2.5 transition-colors">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Promo Code Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-violet-900/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
              <div>
                <h2 className="text-base font-bold text-neutral-100">{editingPromoId ? 'Edit Promo' : 'Create Promo Code'}</h2>
                <p className="text-xs text-neutral-500">Standalone discount code</p>
              </div>
              <button onClick={() => setShowPromoModal(false)} className="p-2 text-neutral-500 hover:text-white"><X size={16} /></button>
            </div>
            <form onSubmit={savePromo} className="p-6 space-y-5">
              
              <div className="flex gap-2">
                <input required value={promoForm.code} onChange={e => setPromoForm(f=>({...f, code: e.target.value.toUpperCase()}))} placeholder="CODE (e.g. SUMMER20)" className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 font-mono tracking-wider focus:outline-none focus:border-violet-500" />
                <button type="button" onClick={() => setPromoForm(f=>({...f, code: generateRandomPromoCode()}))} className="px-3 bg-violet-600/20 text-violet-400 rounded-lg hover:bg-violet-600/30"><Wand2 size={15} /></button>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1.5">Discount Percentage *</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={5} max={50} step={5} value={promoForm.discountPercent} onChange={e => setPromoForm(f=>({...f, discountPercent: parseInt(e.target.value)}))} className="flex-1 accent-violet-500" />
                  <span className="text-xl font-black text-violet-400 w-12 text-right">{promoForm.discountPercent}%</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1.5">Description *</label>
                <input required value={promoForm.description} onChange={e => setPromoForm(f=>({...f, description: e.target.value}))} placeholder="e.g. 20% off weekend nights" className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-violet-500" />
              </div>

              <div className="p-4 rounded-xl border border-violet-900/30 bg-violet-950/10 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${promoForm.isLimitedUses ? 'bg-violet-600' : 'bg-neutral-700'}`} onClick={() => setPromoForm(f=>({...f, isLimitedUses: !f.isLimitedUses}))}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${promoForm.isLimitedUses ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-xs text-neutral-300 font-medium">Limit number of uses</span>
                </label>
                
                {promoForm.isLimitedUses && (
                  <div className="pl-12 space-y-3">
                    <div>
                      <label className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold block mb-1">Max Uses</label>
                      <input type="number" min={1} value={promoForm.maxUsage} onChange={e => setPromoForm(f=>({...f, maxUsage: parseInt(e.target.value)||1}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-200 focus:outline-none focus:border-violet-500" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${promoForm.deleteWhenDepleted ? 'bg-rose-600 border-rose-500' : 'bg-neutral-900 border-neutral-700'}`} onClick={() => setPromoForm(f=>({...f, deleteWhenDepleted: !f.deleteWhenDepleted}))}>
                        {promoForm.deleteWhenDepleted && <CheckCircle size={10} className="text-white" />}
                      </div>
                      <span className="text-[11px] text-neutral-400 font-medium">Auto-delete when depleted</span>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer mb-2">
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${promoForm.hasExpiry ? 'bg-violet-600' : 'bg-neutral-700'}`} onClick={() => setPromoForm(f=>({...f, hasExpiry: !f.hasExpiry}))}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${promoForm.hasExpiry ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-xs text-neutral-300 font-medium">Set Expiry Date</span>
                </label>
                {promoForm.hasExpiry && (
                  <input type="datetime-local" value={promoForm.expiresAt} onChange={e => setPromoForm(f=>({...f, expiresAt: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-violet-500" />
                )}
              </div>

              <div className="flex gap-3 pt-2 border-t border-neutral-800">
                <button type="button" onClick={() => setShowPromoModal(false)} className="px-4 py-2.5 bg-neutral-800 text-neutral-300 text-sm rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-xl font-semibold py-2.5 shadow-lg shadow-violet-900/30 transition-colors">Save Promo</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}