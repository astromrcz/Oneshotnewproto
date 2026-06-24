import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, CheckCircle, Info, AlertCircle, X, LayoutTemplate, Image as ImageIcon, Lock, ShieldAlert } from 'lucide-react';

// Pre-loaded stunning billiard images for the client to shuffle through
const LOCAL_GALLERY = [
  "https://images.unsplash.com/photo-1741397112651-ee14e18f6b41?q=80&w=1080", // Wide Hall
  "https://images.unsplash.com/photo-1761335633357-04fab36b333f?q=80&w=1080", // Lounge
  "https://images.unsplash.com/photo-1698205461947-cc5ee3e40a02?q=80&w=1080", // Neon Table
  "https://images.unsplash.com/photo-1574762035308-410a8c278fb9?q=80&w=1080", // Rack
  "https://images.unsplash.com/photo-1595859702812-70b9ba0206cb?q=80&w=1080", // Break shot
  "https://images.unsplash.com/photo-1601646761285-65bfa67cd7a3?q=80&w=1080", // Balls close up
  "https://images.unsplash.com/photo-1516223725307-6f76b9ec8742?q=80&w=1080", // Dark aesthetic
  "https://images.unsplash.com/photo-1534158914592-062992fbe900?q=80&w=1080", // Drinks/Bar
];

export function AdminSiteSettings() {
  const { siteConfig, updateSiteConfig, staffUsers } = useAppContext() as any;
  const [form, setForm] = useState({ ...siteConfig });
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'hero' | 'about' | 'contact'>('hero');
  
  // Security Modal States
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState('');

  useEffect(() => {
    if (siteConfig) setForm({ ...siteConfig });
  }, [siteConfig]);

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
    setPassword('');
    setPassError('');
  };

  const handleConfirmSave = () => {
    // Basic security check: Validate against the admin account password
    const adminUser = staffUsers?.find((u: any) => u.username === 'admin');
    if (password !== (adminUser?.password || 'admin123')) {
      setPassError('Incorrect admin password.');
      return;
    }

    updateSiteConfig(form);
    setSaved(true);
    setShowConfirm(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleHeroImage = (url: string) => {
    setForm((prev: any) => {
      const current = prev.heroImages || [];
      if (current.includes(url)) return { ...prev, heroImages: current.filter((u: string) => u !== url) };
      if (current.length >= 5) { alert('Maximum 5 images allowed in Hero Slider.'); return prev; }
      return { ...prev, heroImages: [...current, url] };
    });
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {saved && (
        <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-700/40 text-emerald-400 text-sm px-4 py-3 rounded-xl">
          <CheckCircle size={15} /> Site content updated successfully! The homepage is now live with the new changes.
        </div>
      )}

      <div className="bg-sky-950/20 border border-sky-900/30 rounded-xl p-4 flex items-start gap-3">
        <LayoutTemplate size={15} className="text-sky-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-sky-400/80 leading-relaxed">
          <strong>Content Management System (CMS):</strong> Changes made here directly reflect on the customer-facing Homepage. You can shuffle imagery using the Local Gallery below.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-950 border border-neutral-800 rounded-xl p-1 max-w-sm">
        {([
          { id: 'hero', label: 'Hero Section' },
          { id: 'about', label: 'About Us' },
          { id: 'contact', label: 'Contact & Socials' },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSaveClick} className="space-y-5">
        
        {/* ════ HERO SECTION ════ */}
        {activeTab === 'hero' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
                <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold border-b border-neutral-800 pb-3 mb-4">Hero Text</h3>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Main Title</label>
                  <input type="text" value={form.heroTitle || ''} onChange={e => setForm(f => ({...f, heroTitle: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Subtitle</label>
                  <input type="text" value={form.heroSubtitle || ''} onChange={e => setForm(f => ({...f, heroSubtitle: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-sky-400 focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Description Paragraph</label>
                  <textarea rows={4} value={form.heroDescription || ''} onChange={e => setForm(f => ({...f, heroDescription: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-300 focus:border-sky-500 outline-none resize-none" />
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-3 mb-4">
                  <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Slider Gallery</h3>
                  <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md">{(form.heroImages || []).length}/5 Selected</span>
                </div>
                <p className="text-[10px] text-neutral-500 mb-3">Click an image to add or remove it from the homepage sliding carousel.</p>
                <div className="grid grid-cols-2 gap-2">
                  {LOCAL_GALLERY.map(img => {
                    const isSel = (form.heroImages || []).includes(img);
                    return (
                      <div key={img} onClick={() => toggleHeroImage(img)} className={`relative h-24 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${isSel ? 'border-sky-500 opacity-100' : 'border-transparent opacity-40 hover:opacity-80'}`}>
                        <img src={img} className="w-full h-full object-cover" />
                        {isSel && <div className="absolute top-1 right-1 bg-sky-500 rounded-full p-0.5"><CheckCircle size={12} className="text-white" /></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ ABOUT SECTION ════ */}
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold border-b border-neutral-800 pb-3 mb-4">About Us Copy</h3>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Header Title</label>
                <input type="text" value={form.aboutTitle || ''} onChange={e => setForm(f => ({...f, aboutTitle: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Paragraph 1 (The Hook)</label>
                <textarea rows={3} value={form.aboutP1 || ''} onChange={e => setForm(f => ({...f, aboutP1: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-300 focus:border-sky-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Paragraph 2 (The Facility)</label>
                <textarea rows={3} value={form.aboutP2 || ''} onChange={e => setForm(f => ({...f, aboutP2: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-300 focus:border-sky-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Paragraph 3 (The Closing)</label>
                <textarea rows={3} value={form.aboutP3 || ''} onChange={e => setForm(f => ({...f, aboutP3: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-300 focus:border-sky-500 outline-none resize-none" />
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
              <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold border-b border-neutral-800 pb-3 mb-4">About Image Gallery</h3>
              <p className="text-[10px] text-neutral-500 mb-3">Select the single feature image shown next to the "About Us" text.</p>
              <div className="grid grid-cols-2 gap-2">
                {LOCAL_GALLERY.map(img => {
                  const isSel = form.aboutImage === img;
                  return (
                    <div key={img} onClick={() => setForm(f=>({...f, aboutImage: img}))} className={`relative h-24 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${isSel ? 'border-emerald-500 opacity-100' : 'border-transparent opacity-40 hover:opacity-80'}`}>
                      <img src={img} className="w-full h-full object-cover" />
                      {isSel && <div className="absolute inset-0 bg-emerald-500/20 border-2 border-emerald-500 rounded-md" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════ CONTACT & SOCIALS ════ */}
        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold border-b border-neutral-800 pb-3 mb-4">Contact Details</h3>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Physical Address</label>
                <textarea rows={2} value={form.address || ''} onChange={e => setForm(f => ({...f, address: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-200 focus:border-sky-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Phone Numbers</label>
                <input type="text" value={form.phone || ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-200 focus:border-sky-500 outline-none" placeholder="e.g. 0917-XXX-XXXX | 0998-XXX-XXXX" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Email Address</label>
                <input type="text" value={form.email || ''} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-200 focus:border-sky-500 outline-none" />
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold border-b border-neutral-800 pb-3 mb-4">Social Media Handles</h3>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Facebook Handle</label>
                <input type="text" value={form.facebook || ''} onChange={e => setForm(f => ({...f, facebook: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-blue-400 focus:border-sky-500 outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Instagram Handle</label>
                <input type="text" value={form.instagram || ''} onChange={e => setForm(f => ({...f, instagram: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-rose-400 focus:border-sky-500 outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 font-medium">TikTok Handle</label>
                <input type="text" value={form.tiktok || ''} onChange={e => setForm(f => ({...f, tiktok: e.target.value}))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-200 focus:border-sky-500 outline-none font-mono" />
              </div>
            </div>
          </div>
        )}

        <button type="submit"
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-8 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-sky-900/30 w-full sm:w-auto">
          <Save size={15} /> Request Changes
        </button>
      </form>

      {/* ════ CONFIRMATION MODAL WITH SUMMARY & PASSWORD ════ */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center flex-none">
              <div className="flex items-center gap-3">
                <ShieldAlert size={20} className="text-sky-500" />
                <h2 className="text-base font-bold text-neutral-100">Review & Authorize</h2>
              </div>
              <button onClick={() => setShowConfirm(false)} className="p-2 text-neutral-500 hover:text-white rounded-lg"><X size={16} /></button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 space-y-3">
                <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold mb-2">Summary of Changes</p>
                
                {Object.keys(form).map((key) => {
                  const oldVal = (siteConfig as any)[key];
                  const newVal = (form as any)[key];
                  
                  // Compare Arrays natively
                  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
                    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                      return (
                        <div key={key} className="text-sm pb-2 border-b border-neutral-800 last:border-0 last:pb-0">
                          <span className="text-neutral-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                          <span className="text-sky-400 font-semibold block mt-1">Gallery Images Updated ({newVal.length} selected)</span>
                        </div>
                      );
                    }
                  } else if (oldVal !== newVal) {
                    return (
                      <div key={key} className="text-sm pb-2 border-b border-neutral-800 last:border-0 last:pb-0">
                        <span className="text-neutral-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                        <div className="mt-1 bg-neutral-950 p-2 rounded text-rose-400 line-through text-xs truncate opacity-70">{oldVal}</div>
                        <div className="mt-1 bg-sky-950/20 p-2 rounded text-sky-400 font-medium text-xs">{newVal}</div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4">
                <label className="flex items-center gap-2 text-xs text-amber-500 font-bold uppercase tracking-wider mb-2">
                  <Lock size={12} /> Admin Authorization Required
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPassError(''); }}
                  placeholder="Enter admin password to save" 
                  autoFocus
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" 
                />
                {passError && <p className="text-[10px] text-rose-400 font-semibold mt-2">{passError}</p>}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-800 flex gap-3 flex-none">
              <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">Cancel</button>
              <button onClick={handleConfirmSave} disabled={!password} className="flex-1 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                <CheckCircle size={14} /> Authorize & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}