import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ShieldAlert, Search, Plus, X, AlertTriangle, Scale, Archive, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';

const REASON_CFG = {
  debt:   { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Unpaid Debt' },
  theft:  { color: 'text-rose-500',  bg: 'bg-rose-500/10',  border: 'border-rose-500/20',  label: 'Theft / Damage' },
  banned: { color: 'text-red-500',   bg: 'bg-red-500/10',   border: 'border-red-500/30',   label: 'Banned' },
  other:  { color: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  label: 'Other Concern' },
};

export function Watchlist() {
  const { watchlist, addWatchlistItem, updateWatchlistItem, deleteWatchlistItem } = useAppContext();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'active' | 'resolved' | 'archived' | 'all'>('active');
  
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', reason: 'debt', description: '', evidenceLink: '' });

  const filtered = watchlist.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase());
    if (filter === 'archived') return matchSearch && item.isArchived;
    if (item.isArchived && filter !== 'all') return false; 
    if (filter === 'all') return matchSearch && !item.isArchived;
    return matchSearch && item.status === filter && !item.isArchived;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    addWatchlistItem({ name: form.name, reason: form.reason as any, description: form.description, evidenceLink: form.evidenceLink, dateAdded: new Date(), status: 'active' });
    setShowModal(false);
    setForm({ name: '', reason: 'debt', description: '', evidenceLink: '' });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-950 p-6 rounded-2xl border border-rose-900/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white flex items-center gap-2"><ShieldAlert className="text-rose-500" /> Security Watchlist</h2>
          <p className="text-sm text-neutral-500 mt-1">Confidential internal registry for security and debt tracking.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input type="text" placeholder="Search individuals..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:border-rose-500 outline-none" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value as any)} className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
            <option value="active">Active Alerts</option>
            <option value="resolved">Resolved</option>
            <option value="all">All Active & Resolved</option>
            <option value="archived">History (Archived)</option>
          </select>
          <button onClick={() => setShowModal(true)} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors">
            <Plus size={16} /> Add Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-neutral-800 rounded-2xl">
            <ShieldAlert size={32} className="mx-auto text-neutral-600 mb-3" />
            <p className="text-neutral-400 font-medium">No watchlist records found.</p>
          </div>
        ) : filtered.map(item => {
          const cfg = REASON_CFG[item.reason as keyof typeof REASON_CFG] || REASON_CFG.other;
          return (
          <div key={item.id} className={`bg-neutral-950 border rounded-2xl overflow-hidden flex flex-col transition-all ${item.status === 'resolved' || item.isArchived ? 'border-neutral-800 opacity-60' : `border-${cfg.color.split('-')[1]}-900/50`}`}>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {item.name} 
                  {item.isArchived && <span className="text-[10px] bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded uppercase font-black tracking-widest border border-neutral-700">Archived</span>}
                </h3>
                {!item.isArchived && (
                  item.status === 'resolved' ? (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border bg-neutral-800 text-neutral-400 border-neutral-700">Resolved</span>
                  ) : (
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
                  )
                )}
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">{item.description}</p>
              
              {item.evidenceLink && (
                <a href={item.evidenceLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-950/20 w-fit px-3 py-1.5 rounded-lg border border-blue-900/30 mb-4 transition-colors">
                  <LinkIcon size={12} /> View Evidence Link
                </a>
              )}
              
              <div className="mt-auto space-y-3">
                <div className="flex items-center justify-between text-[10px] text-neutral-500 border-t border-neutral-800 pt-3">
                  <span>Added: {format(new Date(item.dateAdded), 'MMM d, yyyy')}</span>
                  {item.resolvedDate && <span className="text-emerald-500">Resolved: {format(new Date(item.resolvedDate), 'MMM d, yyyy')}</span>}
                </div>
                {!item.isArchived && (
                  <div className="flex gap-2">
                    {item.status === 'active' ? (
                      <button onClick={() => updateWatchlistItem(item.id, { status: 'resolved', resolvedDate: new Date() })} className="flex-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 text-xs font-semibold py-2 rounded-lg transition-colors flex justify-center items-center gap-1.5"><Scale size={14}/> Resolve Case</button>
                    ) : (
                      <button onClick={() => updateWatchlistItem(item.id, { status: 'active', resolvedDate: undefined })} className="flex-1 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white text-xs font-semibold py-2 rounded-lg transition-colors">Re-open Case</button>
                    )}
                    <button onClick={() => deleteWatchlistItem(item.id)} className="px-3 bg-neutral-900 hover:bg-rose-900/50 border border-neutral-800 text-neutral-400 hover:text-rose-500 rounded-lg transition-colors" title="Move to History/Archive"><Archive size={14}/></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )})}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-rose-900/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-rose-500 flex items-center gap-2 mb-4"><AlertTriangle size={18}/> New Watchlist Entry</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Individual Name / Alias *</label>
                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-rose-500" placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Reason Category *</label>
                <select value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-rose-500">
                  <option value="debt">Unpaid Debt / Bill</option>
                  <option value="theft">Theft / Property Damage</option>
                  <option value="banned">Banned for Misconduct</option>
                  <option value="other">Other Concern</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Description & Evidence *</label>
                <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-rose-500 resize-none h-24" placeholder="Detail the incident, amount owed, or reason for banning..." />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Evidence Link (Google Drive, Docs, etc.)</label>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input type="url" value={form.evidenceLink} onChange={e => setForm({...form, evidenceLink: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-rose-500" placeholder="https://drive.google.com/..." />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-neutral-800 text-white py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-sm font-semibold">Log Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}