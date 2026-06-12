import { useState, useRef } from 'react';
import {
  Calendar as CalendarIcon, Plus, Trash2, Edit2, Tag, Paperclip, X, Link,
  Users, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Wand2, Copy, CheckCircle, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAppContext, generateRandomPromoCode } from '../context/AppContext';
import type { Event, PromoCode } from '../context/AppContext';
import { format } from 'date-fns';

const PROMO_TYPES = ['Promo', 'Holiday Promo'];

type FormState = {
  title: string;
  date: string;
  type: string;
  description: string;
  registrationLink: string;
  maxParticipants: string;
  slotsFull: boolean;
  attachments: string[];
  promoCodeId: string;
};

type PromoForm = {
  code: string;
  discountPercent: number;
  description: string;
  maxUsage: number;
  isActive: boolean;
  hasExpiry: boolean;
  expiresAt: string;
};

const emptyForm: FormState = {
  title: '',
  date: '',
  type: 'Tournament',
  description: '',
  registrationLink: '',
  maxParticipants: '',
  slotsFull: false,
  attachments: [],
  promoCodeId: '',
};

const emptyPromoForm: PromoForm = {
  code: '',
  discountPercent: 10,
  description: '',
  maxUsage: 100,
  isActive: true,
  hasExpiry: false,
  expiresAt: '',
};

function eventToForm(ev: Event): FormState {
  return {
    title: ev.title,
    date: ev.date,
    type: ev.type,
    description: ev.description,
    registrationLink: ev.registrationLink ?? '',
    maxParticipants: ev.maxParticipants?.toString() ?? '',
    slotsFull: ev.slotsFull ?? false,
    attachments: ev.attachments ?? [],
    promoCodeId: ev.promoCodeId ?? '',
  };
}

function promoToForm(p: PromoCode): PromoForm {
  return {
    code: p.code,
    discountPercent: p.discountPercent,
    description: p.description,
    maxUsage: p.maxUsage,
    isActive: p.isActive,
    hasExpiry: !!p.expiresAt,
    expiresAt: p.expiresAt ? format(new Date(p.expiresAt), "yyyy-MM-dd'T'HH:mm") : '',
  };
}

export function AdminEvents() {
  const { events, addEvent, updateEvent, deleteEvent, promoCodes, addPromoCode, updatePromoCode, togglePromoCode, deletePromoCode } = useAppContext();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [promoForm, setPromoForm] = useState<PromoForm>(emptyPromoForm);
  const [promoMode, setPromoMode] = useState<'none' | 'create' | 'edit' | 'pick'>('none');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedAttachments, setExpandedAttachments] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPromoType = PROMO_TYPES.includes(form.type);
  const linkedPromo = promoCodes.find(p => p.id === form.promoCodeId);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPromoForm(emptyPromoForm);
    setPromoMode('none');
    setShowModal(true);
  };

  const openEdit = (ev: Event) => {
    setEditingId(ev.id);
    const f = eventToForm(ev);
    setForm(f);
    const linked = promoCodes.find(p => p.id === ev.promoCodeId);
    if (linked) {
      setPromoForm(promoToForm(linked));
      setPromoMode('edit');
    } else {
      setPromoForm(emptyPromoForm);
      setPromoMode('none');
    }
    setShowModal(true);
  };

  const handleTypeChange = (type: string) => {
    setForm(prev => ({ ...prev, type }));
    if (!PROMO_TYPES.includes(type)) {
      setPromoMode('none');
    } else if (promoMode === 'none') {
      setPromoMode('none');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setForm(prev => ({ ...prev, attachments: [...prev.attachments, reader.result as string] }));
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
  };

  const handleSave = () => {
    if (!form.title || !form.date) return;
    let promoCodeId = form.promoCodeId;

    if (isPromoType && (promoMode === 'create' || promoMode === 'edit')) {
      if (!promoForm.code || !promoForm.description) return;
      const payload = {
        code: promoForm.code.toUpperCase(),
        discountPercent: promoForm.discountPercent,
        description: promoForm.description,
        isActive: promoForm.isActive,
        maxUsage: promoForm.maxUsage,
        expiresAt: promoForm.hasExpiry && promoForm.expiresAt ? new Date(promoForm.expiresAt) : undefined,
      };
      if (promoMode === 'edit' && form.promoCodeId) {
        updatePromoCode(form.promoCodeId, payload);
      } else {
        promoCodeId = addPromoCode(payload);
      }
    }

    const payload: Omit<Event, 'id'> = {
      title: form.title,
      date: form.date,
      type: form.type,
      description: form.description,
      registrationLink: form.registrationLink || undefined,
      maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : undefined,
      slotsFull: form.slotsFull,
      attachments: form.attachments.length ? form.attachments : undefined,
      promoCodeId: promoCodeId || undefined,
    };
    if (editingId) {
      updateEvent(editingId, payload);
    } else {
      addEvent(payload);
    }
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleAttachmentExpand = (id: string) => {
    setExpandedAttachments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getFileName = (dataUrl: string, index: number) => {
    const match = dataUrl.match(/^data:([^;]+);/);
    const ext = match?.[1]?.split('/')[1] ?? 'bin';
    return `attachment-${index + 1}.${ext}`;
  };

  const isImage = (dataUrl: string) => dataUrl.startsWith('data:image/');

  const getPromoStatus = (p: PromoCode) => {
    if (!p.isActive) return { label: 'Inactive', color: 'bg-neutral-700/40 text-neutral-500 border-neutral-700' };
    if (p.usageCount >= p.maxUsage) return { label: 'Exhausted', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    if (p.expiresAt && new Date() > new Date(p.expiresAt)) return { label: 'Expired', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    return { label: 'Active', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  };

  // Standalone promo codes panel (all codes not linked to an event, plus linked ones)
  const unlinkedPromoCodes = promoCodes.filter(p => !events.some(e => e.promoCodeId === p.id));
  const linkedPromoCodes = promoCodes.filter(p => events.some(e => e.promoCodeId === p.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
            <CalendarIcon className="text-amber-500" size={24} />
            Events & Promo Codes
          </h2>
          <p className="text-xs text-neutral-400 mt-1">Manage tournaments, leagues, and promo events. Promo-type events can have linked discount codes.</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-500 text-white gap-2" onClick={openCreate}>
          <Plus size={16} /> New Event
        </Button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map(ev => {
          const isExpanded = expandedAttachments.has(ev.id);
          const attachments = ev.attachments ?? [];
          const imageAttachments = attachments.filter(isImage);
          const fileAttachments = attachments.filter(a => !isImage(a));
          const linked = promoCodes.find(p => p.id === ev.promoCodeId);
          const promoStatus = linked ? getPromoStatus(linked) : null;

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
                    {ev.slotsFull && (
                      <span className="text-[10px] bg-rose-900/50 text-rose-400 border border-rose-800/40 px-2 py-1 rounded-full font-bold whitespace-nowrap">FULL</span>
                    )}
                  </div>
                </div>
                <CardDescription className="text-xs text-amber-500 font-medium">{new Date(ev.date).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <p className="text-sm text-neutral-400 mb-3 line-clamp-3">{ev.description}</p>

                {ev.maxParticipants && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
                    <Users size={11} />
                    <span>Max {ev.maxParticipants} participants</span>
                  </div>
                )}

                {ev.registrationLink && (
                  <a href={ev.registrationLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mb-3 truncate">
                    <Link size={11} className="flex-shrink-0" />
                    <span className="truncate">Registration Link</span>
                  </a>
                )}

                {/* Linked Promo Code Badge */}
                {linked && (
                  <div className="flex items-center gap-2 bg-violet-950/30 border border-violet-800/40 rounded-lg px-3 py-2 mb-3">
                    <Tag size={11} className="text-violet-400 flex-shrink-0" />
                    <span className="text-xs font-black text-white tracking-wider flex-1 truncate">{linked.code}</span>
                    <span className="text-xs text-violet-400 font-bold">{linked.discountPercent}% OFF</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${promoStatus?.color}`}>{promoStatus?.label}</span>
                    <button onClick={() => handleCopyCode(linked.code)} className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors flex-shrink-0">
                      {copiedCode === linked.code ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className="mb-3">
                    <button onClick={() => toggleAttachmentExpand(ev.id)}
                      className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
                      <Paperclip size={11} />
                      <span>{attachments.length} attachment{attachments.length > 1 ? 's' : ''}</span>
                      {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-1.5">
                        {imageAttachments.slice(1).map((att, i) => (
                          <img key={i} src={att} alt="" className="w-full h-20 object-cover rounded-lg opacity-80" />
                        ))}
                        {fileAttachments.map((att, i) => (
                          <a key={i} href={att} download={getFileName(att, i)}
                            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800 rounded-lg px-2.5 py-1.5 truncate">
                            <Paperclip size={10} className="flex-shrink-0" />
                            {getFileName(att, i)}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-auto">
                  <Button variant="ghost" size="sm" className="h-8 text-neutral-500 hover:text-blue-400 hover:bg-blue-950/30" onClick={() => openEdit(ev)}>
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
            <Tag size={32} className="mx-auto text-neutral-600 mb-3" />
            <p className="text-neutral-400 font-medium">No events planned</p>
            <p className="text-xs text-neutral-500 mt-1">Click New Event to create one.</p>
          </div>
        )}
      </div>

      {/* ── Standalone Promo Codes Panel ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-300 flex items-center gap-2">
            <Tag size={15} className="text-violet-400" /> All Promo Codes
            <span className="text-[10px] bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">{promoCodes.length}</span>
          </h3>
        </div>

        {promoCodes.length === 0 ? (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-8 text-center">
            <Tag size={28} className="mx-auto text-neutral-700 mb-2" />
            <p className="text-sm text-neutral-500">No promo codes yet. Create a Promo-type event to generate one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {promoCodes.map(pc => {
              const status = getPromoStatus(pc);
              const linkedEvent = events.find(e => e.promoCodeId === pc.id);
              return (
                <div key={pc.id} className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-neutral-700 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-violet-600/15 border border-violet-600/25 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-sm font-black text-violet-400">{pc.discountPercent}%</span>
                    <span className="text-[9px] text-violet-600 font-semibold">OFF</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-white tracking-wider">{pc.code}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
                      {linkedEvent && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                          {linkedEvent.title}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">{pc.description}</p>
                    <p className="text-[10px] text-neutral-700 mt-0.5">Used {pc.usageCount}/{pc.maxUsage}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleCopyCode(pc.code)} title="Copy code"
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors">
                      {copiedCode === pc.code ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                    <button onClick={() => togglePromoCode(pc.id)} title={pc.isActive ? 'Deactivate' : 'Activate'}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors">
                      {pc.isActive ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                    </button>
                    <button onClick={() => deletePromoCode(pc.id)} title="Delete"
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Event Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50 flex-none">
              <h3 className="font-bold text-neutral-200">{editingId ? 'Edit Event' : 'Create Event'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors">
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1.5">Event Title *</label>
                <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Halloween Tournament" className="bg-neutral-950 border-neutral-800" />
              </div>

              {/* Date + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-400 block mb-1.5">Date *</label>
                  <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="bg-neutral-950 border-neutral-800" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-400 block mb-1.5">Type</label>
                  <select
                    className="w-full h-10 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-200 focus:outline-none focus:border-amber-500"
                    value={form.type}
                    onChange={e => handleTypeChange(e.target.value)}
                  >
                    <option>Tournament</option>
                    <option>League</option>
                    <option>Holiday Promo</option>
                    <option>Promo</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-3 text-sm text-neutral-200 h-20 focus:outline-none focus:border-amber-500 resize-none"
                  placeholder="Details about the event..."
                />
              </div>

              {/* Registration Link */}
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1.5 flex items-center gap-1.5">
                  <Link size={11} /> Registration Link
                </label>
                <Input value={form.registrationLink} onChange={e => setForm({...form, registrationLink: e.target.value})}
                  placeholder="https://forms.google.com/..." className="bg-neutral-950 border-neutral-800" />
              </div>

              {/* Max Participants + Slots Full */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-400 block mb-1.5 flex items-center gap-1.5">
                    <Users size={11} /> Max Participants
                  </label>
                  <Input type="number" value={form.maxParticipants} onChange={e => setForm({...form, maxParticipants: e.target.value})}
                    placeholder="e.g. 32" min="1" className="bg-neutral-950 border-neutral-800" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-400 block mb-1.5">Slots Full</label>
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, slotsFull: !prev.slotsFull }))}
                    className={`flex items-center gap-2 w-full h-10 px-3 rounded-md border text-sm font-semibold transition-all ${
                      form.slotsFull ? 'bg-rose-950/40 border-rose-700/50 text-rose-400' : 'bg-neutral-950 border-neutral-800 text-neutral-500'
                    }`}>
                    {form.slotsFull ? <ToggleRight size={18} className="text-rose-400" /> : <ToggleLeft size={18} />}
                    {form.slotsFull ? 'Slots Full' : 'Open'}
                  </button>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1.5 flex items-center gap-1.5">
                  <Paperclip size={11} /> Attachments
                </label>
                <div className="space-y-2">
                  {form.attachments.length > 0 && (
                    <div className="space-y-1.5">
                      {form.attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2">
                          {isImage(att) ? (
                            <img src={att} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />
                          ) : (
                            <Paperclip size={14} className="text-neutral-500 flex-shrink-0" />
                          )}
                          <span className="text-xs text-neutral-400 truncate flex-1">{getFileName(att, i)}</span>
                          <button type="button" onClick={() => removeAttachment(i)} className="p-1 text-neutral-600 hover:text-rose-400 transition-colors flex-shrink-0">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-neutral-700 rounded-lg text-xs text-neutral-500 hover:border-amber-600/50 hover:text-amber-500 transition-colors">
                    <Paperclip size={13} /> Attach File
                  </button>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                </div>
              </div>

              {/* ── Promo Code Section (only for Promo types) ── */}
              {isPromoType && (
                <div className="border border-violet-800/40 rounded-xl bg-violet-950/10 overflow-hidden">
                  <div className="px-4 py-3 border-b border-violet-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag size={13} className="text-violet-400" />
                      <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">Promo Code</span>
                    </div>
                    {linkedPromo ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white tracking-wider">{linkedPromo.code}</span>
                        <span className="text-[10px] text-violet-400">{linkedPromo.discountPercent}% off</span>
                        <button onClick={() => { setPromoMode('edit'); setPromoForm(promoToForm(linkedPromo)); }}
                          className="text-[10px] text-neutral-500 hover:text-blue-400 transition-colors">
                          <Edit2 size={11} />
                        </button>
                        <button onClick={() => { setForm(prev => ({ ...prev, promoCodeId: '' })); setPromoMode('none'); }}
                          className="text-[10px] text-neutral-500 hover:text-rose-400 transition-colors">
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPromoMode(promoMode === 'create' ? 'none' : 'create')}
                          className="text-[10px] bg-violet-600/20 hover:bg-violet-600/30 border border-violet-600/30 text-violet-400 px-2.5 py-1 rounded-lg transition-colors font-semibold">
                          + New Code
                        </button>
                        {promoCodes.length > 0 && (
                          <button onClick={() => setPromoMode(promoMode === 'pick' ? 'none' : 'pick')}
                            className="text-[10px] bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-400 px-2.5 py-1 rounded-lg transition-colors font-semibold">
                            Link Existing
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Create / Edit inline form */}
                  {(promoMode === 'create' || promoMode === 'edit') && (
                    <div className="p-4 space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Code *</label>
                          <div className="flex gap-1.5">
                            <input
                              value={promoForm.code}
                              onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g,'') }))}
                              placeholder="e.g. SUMMER20"
                              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-violet-500/40 placeholder-neutral-600"
                            />
                            <button type="button" onClick={() => setPromoForm(f => ({ ...f, code: generateRandomPromoCode() }))}
                              className="px-2.5 bg-violet-600/20 border border-violet-600/30 text-violet-400 rounded-lg hover:bg-violet-600/30 transition-colors">
                              <Wand2 size={13} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Discount</label>
                          <div className="flex items-center gap-2">
                            <input type="range" min={5} max={50} step={5} value={promoForm.discountPercent}
                              onChange={e => setPromoForm(f => ({ ...f, discountPercent: parseInt(e.target.value) }))}
                              className="w-20 accent-violet-500" />
                            <span className="text-sm font-black text-violet-400 w-9 text-right">{promoForm.discountPercent}%</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Description *</label>
                        <input value={promoForm.description} onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="e.g. 20% off for event attendees"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 placeholder-neutral-600" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Max Uses</label>
                          <input type="number" min={1} value={promoForm.maxUsage}
                            onChange={e => setPromoForm(f => ({ ...f, maxUsage: parseInt(e.target.value)||1 }))}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">Status</label>
                          <button type="button" onClick={() => setPromoForm(f => ({ ...f, isActive: !f.isActive }))}
                            className={`w-full flex items-center justify-center gap-2 h-9 rounded-lg border text-xs font-semibold transition-all ${
                              promoForm.isActive ? 'bg-emerald-950/30 border-emerald-700/40 text-emerald-400' : 'bg-neutral-950 border-neutral-800 text-neutral-500'
                            }`}>
                            {promoForm.isActive ? <ToggleRight size={15} className="text-emerald-400" /> : <ToggleLeft size={15} />}
                            {promoForm.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className={`w-9 h-5 rounded-full relative transition-colors ${promoForm.hasExpiry ? 'bg-violet-600' : 'bg-neutral-700'}`}
                          onClick={() => setPromoForm(f => ({ ...f, hasExpiry: !f.hasExpiry }))}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${promoForm.hasExpiry ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Set Expiry Date</span>
                      </label>
                      {promoForm.hasExpiry && (
                        <input type="datetime-local" value={promoForm.expiresAt}
                          onChange={e => setPromoForm(f => ({ ...f, expiresAt: e.target.value }))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                      )}
                      {promoForm.code && (
                        <div className="bg-neutral-900 border border-violet-600/20 rounded-xl p-3 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-violet-600/20 flex flex-col items-center justify-center flex-shrink-0">
                            <span className="text-xs font-black text-violet-400">{promoForm.discountPercent}%</span>
                          </div>
                          <div>
                            <p className="text-sm font-black text-white tracking-wider">{promoForm.code}</p>
                            <p className="text-xs text-neutral-500">{promoForm.description || 'No description'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pick existing */}
                  {promoMode === 'pick' && (
                    <div className="p-3 space-y-1.5 max-h-40 overflow-y-auto">
                      {promoCodes.map(pc => (
                        <button key={pc.id} type="button"
                          onClick={() => { setForm(prev => ({ ...prev, promoCodeId: pc.id })); setPromoMode('edit'); setPromoForm(promoToForm(pc)); }}
                          className="w-full flex items-center gap-3 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-violet-700/40 rounded-lg transition-all text-left">
                          <Tag size={12} className="text-violet-400 flex-shrink-0" />
                          <span className="text-sm font-black text-white tracking-wider flex-1">{pc.code}</span>
                          <span className="text-xs text-violet-400">{pc.discountPercent}% off</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* No interaction state */}
                  {promoMode === 'none' && !linkedPromo && (
                    <div className="px-4 py-3 text-xs text-neutral-600 italic">
                      No promo code linked. Click "+ New Code" to create one for this event.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-800 flex justify-end gap-3 bg-neutral-950/50 flex-none">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-500 text-white" onClick={handleSave}>
                {editingId ? 'Save Changes' : 'Create Event'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
