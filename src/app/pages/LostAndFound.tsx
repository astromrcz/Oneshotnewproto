import { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Package, Search, Plus, UploadCloud, Archive, CheckCircle, Clock, Check } from 'lucide-react';
import { format } from 'date-fns';

export function LostAndFound() {
  const { lostItems, addLostItem, updateLostItem, deleteLostItem } = useAppContext();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'found' | 'claimed' | 'archived' | 'all'>('all');
  
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ itemName: '', description: '', image: '' });

  const [claimModalId, setClaimModalId] = useState<string | null>(null);
  const [claimName, setClaimName] = useState('');

  const filtered = lostItems.filter(item => {
    const matchSearch = item.itemName.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase());
    if (filter === 'archived') return matchSearch && item.isArchived;
    if (item.isArchived && filter !== 'all') return false;
    if (filter === 'all') return matchSearch && !item.isArchived;
    return matchSearch && item.status === filter && !item.isArchived;
  });

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setForm({ ...form, image: URL.createObjectURL(file) });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.itemName) return;
    addLostItem({ itemName: form.itemName, description: form.description, image: form.image, foundDate: new Date(), status: 'found' });
    setShowModal(false);
    setForm({ itemName: '', description: '', image: '' });
  };

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimName || !claimModalId) return;
    updateLostItem(claimModalId, { status: 'claimed', claimedBy: claimName, claimedDate: new Date() });
    setClaimModalId(null);
    setClaimName('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-950 p-6 rounded-2xl border border-neutral-800">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2"><Package className="text-emerald-500" /> Lost & Found</h2>
          <p className="text-sm text-neutral-500 mt-1">Manage items left behind by customers.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:border-emerald-500 outline-none" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value as any)} className="bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none">
            <option value="all">All Active</option>
            <option value="found">Unclaimed</option>
            <option value="claimed">Claimed</option>
            <option value="archived">History (Archived)</option>
          </select>
          <button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors">
            <Plus size={16} /> Log Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-neutral-800 rounded-2xl">
            <Package size={32} className="mx-auto text-neutral-600 mb-3" />
            <p className="text-neutral-400 font-medium">No items found in the registry.</p>
          </div>
        ) : filtered.map(item => (
          <div key={item.id} className={`bg-neutral-950 border rounded-2xl overflow-hidden flex flex-col transition-all ${item.status === 'claimed' || item.isArchived ? 'border-neutral-800 opacity-70' : 'border-emerald-900/50 hover:border-emerald-500/50'}`}>
            <div className="h-48 bg-neutral-900 relative">
              {item.image ? (
                 <img src={item.image} alt={item.itemName} className="w-full h-full object-cover" />
              ) : (
                 <div className="w-full h-full flex items-center justify-center text-neutral-700"><Package size={48} /></div>
              )}
              <div className="absolute top-3 right-3 flex gap-1.5">
                {item.isArchived && <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border bg-neutral-800 text-neutral-400 border-neutral-700">Archived</span>}
                {!item.isArchived && (
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${item.status === 'claimed' ? 'bg-neutral-800 text-neutral-400 border-neutral-700' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-lg'}`}>
                    {item.status}
                  </span>
                )}
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-1">{item.itemName}</h3>
              <p className="text-xs text-neutral-500 mb-4 line-clamp-2">{item.description}</p>
              
              <div className="mt-auto space-y-2 text-[10px] text-neutral-400">
                <div className="flex items-center gap-2"><Clock size={12}/> Found: {format(new Date(item.foundDate), 'MMM d, yyyy h:mm a')}</div>
                {item.status === 'claimed' && item.claimedBy && (
                  <div className="flex items-center gap-2 text-emerald-500"><Check size={12}/> Claimed by: {item.claimedBy} on {format(new Date(item.claimedDate!), 'MMM d')}</div>
                )}
              </div>
            </div>
            {!item.isArchived && (
              <div className="border-t border-neutral-800 p-3 flex gap-2 bg-neutral-900/50">
                {item.status === 'found' ? (
                  <button onClick={() => setClaimModalId(item.id)} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors">Mark as Claimed</button>
                ) : (
                  <button onClick={() => updateLostItem(item.id, { status: 'found', claimedBy: '', claimedDate: undefined })} className="flex-1 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white text-xs font-semibold py-2 rounded-lg transition-colors">Revert to Unclaimed</button>
                )}
                <button onClick={() => deleteLostItem(item.id)} className="px-3 bg-neutral-900 hover:bg-rose-900/50 border border-neutral-800 text-neutral-500 hover:text-rose-500 rounded-lg transition-colors" title="Move to History/Archive"><Archive size={14}/></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Log Found Item</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Item Name *</label>
                <input required type="text" value={form.itemName} onChange={e => setForm({...form, itemName: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" placeholder="e.g. Black Wallet" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Description *</label>
                <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 resize-none h-20" placeholder="Contents, color, brand..." />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5">Photo</label>
                <label className="flex items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-neutral-700 rounded-xl cursor-pointer hover:border-emerald-500 bg-neutral-900 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                  {form.image ? <img src={form.image} className="h-full object-contain" /> : <span className="text-xs text-neutral-500 flex items-center gap-2"><UploadCloud size={16}/> Click to upload image</span>}
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-neutral-800 text-white py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-semibold">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {claimModalId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
             <h3 className="text-lg font-bold text-white mb-2">Claim Item</h3>
             <p className="text-xs text-neutral-400 mb-4">Record the name or details of the person claiming this item for security purposes.</p>
             <form onSubmit={handleClaim} className="space-y-4">
               <input required type="text" value={claimName} onChange={e => setClaimName(e.target.value)} autoFocus className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" placeholder="Customer Name or ID..." />
               <div className="flex gap-2">
                 <button type="button" onClick={() => setClaimModalId(null)} className="flex-1 bg-neutral-800 text-white py-2.5 rounded-xl text-sm font-semibold">Cancel</button>
                 <button type="submit" className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold">Confirm Claim</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}