import { useState } from 'react';
import { useAppContext, Announcement, AnnouncementType } from '../context/AppContext';
import { Plus, X, Pencil, Trash2, Megaphone, ToggleLeft, ToggleRight, CheckCircle, Info, AlertTriangle, Star, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const TYPE_CONFIG: Record<AnnouncementType, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  info:    { label: 'Info',    color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: Info },
  warning: { label: 'Warning', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: AlertTriangle },
  promo:   { label: 'Promo',   color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  icon: Star },
  event:   { label: 'Event',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Calendar },
};

type FormState = { title: string; content: string; type: AnnouncementType; isActive: boolean; hasExpiry: boolean; expiresAt: string; };
const blank: FormState = { title: '', content: '', type: 'info', isActive: true, hasExpiry: false, expiresAt: '' };

export function AdminAnnouncements() {
  const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement, toggleAnnouncement } = useAppContext();
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(blank);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast]         = useState<string | null>(null);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const openAdd  = () => { setEditingId(null); setForm(blank); setShowForm(true); };
  const openEdit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({ title: a.title, content: a.content, type: a.type, isActive: a.isActive, hasExpiry: !!a.expiresAt, expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0,16) : '' });
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) return;
    
    // 🟢 NEW: Expiry Date Validation
    if (form.hasExpiry && form.expiresAt) {
      const expiryDate = new Date(form.expiresAt);
      if (expiryDate <= new Date()) {
        alert("Expiry date cannot be in the past. Please select a future date.");
        return;
      }
    }

    const payload = { title: form.title, content: form.content, type: form.type, isActive: form.isActive, expiresAt: form.hasExpiry && form.expiresAt ? new Date(form.expiresAt) : undefined };
    if (editingId) { updateAnnouncement(editingId, payload); flash('Announcement updated!'); }
    else { addAnnouncement(payload); flash('Announcement posted!'); }
    setShowForm(false); setEditingId(null); setForm(blank);
  };

  const active = announcements.filter(a => a.isActive).length;

  // 🟢 NEW: Reusable Character Counter
  const CharCount = ({ current, max }: { current?: string, max: number }) => {
    const len = current?.length || 0;
    return (
      <span className={`text-[10px] ${len >= max ? 'text-rose-400 font-bold' : 'text-neutral-600'}`}>
        {len}/{max}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-700/40 text-emerald-400 text-sm px-4 py-3 rounded-xl">
          <CheckCircle size={14} /> {toast}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-white">{announcements.length}</p>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">Total</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-400">{active}</p>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">Active</p>
        </div>
        {(['promo', 'event'] as AnnouncementType[]).map(t => (
          <div key={t} className={`bg-neutral-950 border rounded-xl p-4 text-center ${TYPE_CONFIG[t].border}`}>
            <p className={`text-2xl font-black ${TYPE_CONFIG[t].color}`}>{announcements.filter(a=>a.type===t).length}</p>
            <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">{TYPE_CONFIG[t].label}s</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex justify-end">
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-sm px-4 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-amber-900/30">
          <Plus size={15} /> New Announcement
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-12 text-center">
            <Megaphone size={32} className="mx-auto text-neutral-700 mb-3" />
            <p className="text-neutral-500">No announcements yet</p>
          </div>
        ) : announcements.map(a => {
          const cfg = TYPE_CONFIG[a.type];
          const Icon = cfg.icon;
          const isExpired = a.expiresAt && new Date() > new Date(a.expiresAt);
          return (
            <div key={a.id} className={`bg-neutral-950 border rounded-xl p-5 transition-colors ${a.isActive && !isExpired ? cfg.border : 'border-neutral-800 opacity-60'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                  <Icon size={16} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-bold text-neutral-100">{a.title}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
                    {isExpired && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Expired</span>}
                    {!a.isActive && !isExpired && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700">Inactive</span>}
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">{a.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-neutral-600">
                    <span>Posted {format(new Date(a.createdAt), 'MMM d, yyyy')}</span>
                    {a.expiresAt && <span>Expires {format(new Date(a.expiresAt), 'MMM d, yyyy')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(a)} className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => toggleAnnouncement(a.id)} title={a.isActive ? 'Deactivate' : 'Activate'}
                    className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors">
                    {a.isActive ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} />}
                  </button>
                  {deleteConfirm === a.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { deleteAnnouncement(a.id); setDeleteConfirm(null); flash('Deleted.'); }}
                        className="px-2 py-1 text-[10px] bg-rose-700 hover:bg-rose-600 text-white rounded-lg font-semibold">Yes</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-[10px] bg-neutral-800 text-neutral-400 rounded-lg">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(a.id)} className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"><Trash2 size={13} /></button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-amber-900/30 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center flex-none">
              <h2 className="text-base font-bold text-neutral-100">{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg"><X size={16} /></button>
            </div>
            <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* 🟢 FIXED: Added char counts and limits */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-neutral-400 font-medium">Title *</label>
                  <CharCount current={form.title} max={50} />
                </div>
                <input type="text" maxLength={50} value={form.title} onChange={e => setForm(f=>({...f, title: e.target.value}))} required autoFocus
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors placeholder-neutral-600" placeholder="Announcement title" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-neutral-400 font-medium">Content *</label>
                  <CharCount current={form.content} max={300} />
                </div>
                <textarea value={form.content} maxLength={300} onChange={e => setForm(f=>({...f, content: e.target.value}))} required rows={4}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors placeholder-neutral-600 resize-none"
                  placeholder="Announcement details..." />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-2 block font-medium">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(TYPE_CONFIG) as [AnnouncementType, typeof TYPE_CONFIG[AnnouncementType]][]).map(([t, cfg]) => (
                    <button key={t} type="button" onClick={() => setForm(f=>({...f, type: t}))}
                      className={`flex items-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${form.type === t ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}>
                      <cfg.icon size={12} /> {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`w-9 h-5 rounded-full relative transition-colors ${form.hasExpiry ? 'bg-amber-600' : 'bg-neutral-700'}`}
                  onClick={() => setForm(f=>({...f, hasExpiry: !f.hasExpiry}))}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.hasExpiry ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-neutral-400">Set expiry date</span>
              </label>
              {form.hasExpiry && (
                <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f=>({...f, expiresAt: e.target.value}))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors" />
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`w-9 h-5 rounded-full relative transition-colors ${form.isActive ? 'bg-emerald-600' : 'bg-neutral-700'}`}
                  onClick={() => setForm(f=>({...f, isActive: !f.isActive}))}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-neutral-400">Publish immediately</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">Cancel</button>
                <button type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-xl font-semibold py-2.5 flex items-center justify-center gap-2">
                  {editingId ? <><Pencil size={14} /> Update</> : <><Plus size={14} /> Post</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
