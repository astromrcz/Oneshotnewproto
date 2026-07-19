import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, CheckCircle, X, LayoutTemplate, ShieldAlert, Lock, Upload, Trash2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { useOutletContext } from 'react-router';

export function AdminSiteSettings() {
  // 🟢 FIXED: Pulled in hashPassword and staffProfile for secure authentication
  const { siteConfig, updateSiteConfig, staffUsers, hashPassword, staffProfile } = useAppContext() as any;
  const [form, setForm] = useState(siteConfig || {});
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'hero' | 'about' | 'contact'>('hero');
  
  // Security Modal States
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const heroInputRef = useRef<HTMLInputElement>(null);
  const aboutInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (siteConfig) setForm({ ...siteConfig });
  }, [siteConfig]);

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
    setPassword('');
    setPassError('');
  };

  // 🟢 FIXED: Converted to async to handle the SHA-256 hashing
  const handleConfirmSave = async () => {
    setIsProcessing(true);
    setPassError('');

    const hashedInput = await hashPassword(password);
    const currentUser = staffUsers?.find((u: any) => u.username === staffProfile.username);

    if (!currentUser || currentUser.password !== hashedInput) {
      setPassError('Incorrect admin password.');
      setIsProcessing(false);
      return;
    }

    updateSiteConfig(form);
    setSaved(true);
    setShowConfirm(false);
    setIsProcessing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'hero' | 'about') => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('http://localhost:3001/api/images', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) throw new Error('Upload failed');
        
        const { url } = await res.json();
        
        if (target === 'hero') {
          setForm((prev: any) => {
            const current = prev.heroImages || [];
            if (current.length >= 5) return prev; 
            return { ...prev, heroImages: [...current, url] };
          });
        } else {
          setForm((prev: any) => ({ ...prev, aboutImage: url }));
        }
      }
    } catch (error) {
      console.error(error);
      alert("Image upload failed. Make sure your server is running.");
    } finally {
      setUploading(false);
      e.target.value = ''; 
    }
  };

  const removeHeroImage = (indexToRemove: number) => {
    setForm((prev: any) => ({
      ...prev,
      heroImages: (prev.heroImages || []).filter((_: string, idx: number) => idx !== indexToRemove)
    }));
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {saved && (
        <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-700/40 text-emerald-400 text-sm px-4 py-3 rounded-xl animate-in fade-in">
          <CheckCircle size={15} /> Site content updated successfully! The homepage is now live with the new changes.
        </div>
      )}

      <div className="bg-sky-950/20 border border-sky-900/30 rounded-xl p-4 flex items-start gap-3">
        <LayoutTemplate size={15} className="text-sky-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-sky-400/80 leading-relaxed">
          <strong>Content Management System (CMS):</strong> Changes made here directly reflect on the customer-facing Homepage. Upload images directly from your device.
        </p>
      </div>

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
        
        {activeTab === 'hero' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                  <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Hero Text</h3>
                  <span className="text-[9px] font-bold bg-neutral-900 text-neutral-600 px-2 py-1 rounded flex items-center gap-1"><Lock size={10}/> LOCKED</span>
                </div>
                {/* 🟢 FIXED: Disabled the core Hero text fields */}
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5 font-medium">Main Title</label>
                  <input type="text" disabled value={form.heroTitle || ''} className="w-full bg-neutral-950 border border-neutral-800/50 rounded-xl px-3 py-2 text-sm text-neutral-500 cursor-not-allowed outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5 font-medium">Subtitle</label>
                  <input type="text" disabled value={form.heroSubtitle || ''} className="w-full bg-neutral-950 border border-neutral-800/50 rounded-xl px-3 py-2 text-sm text-neutral-500 cursor-not-allowed outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1.5 font-medium">Description Paragraph</label>
                  <textarea rows={4} disabled value={form.heroDescription || ''} className="w-full bg-neutral-950 border border-neutral-800/50 rounded-xl px-3 py-2 text-sm text-neutral-500 cursor-not-allowed outline-none resize-none" />
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex flex-col">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-3 mb-4">
                  <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Slider Gallery</h3>
                  <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md">{(form.heroImages || []).length}/5 Uploaded</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
                  {(form.heroImages || []).map((imgUrl: string, idx: number) => (
                    <div key={idx} className="relative h-24 rounded-lg overflow-hidden border border-neutral-700 group bg-neutral-900">
                      <img src={imgUrl.startsWith('http') ? imgUrl : `http://localhost:3001${imgUrl}`} alt={`Hero ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => removeHeroImage(idx)} className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-colors shadow-lg">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {(form.heroImages || []).length < 5 && (
                    <button type="button" disabled={uploading} onClick={() => heroInputRef.current?.click()} className="h-24 rounded-lg border-2 border-dashed border-neutral-700 hover:border-sky-500/50 bg-neutral-900/50 flex flex-col items-center justify-center gap-1.5 transition-colors text-neutral-500 hover:text-sky-400 disabled:opacity-50 cursor-pointer">
                      <Upload size={16} />
                      <span className="text-[10px] font-semibold">{uploading ? 'Uploading...' : 'Upload Image'}</span>
                    </button>
                  )}
                </div>

                <input type="file" ref={heroInputRef} accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e, 'hero')} />
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
              <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold border-b border-neutral-800 pb-3 mb-4">About Featured Image</h3>
              <p className="text-[10px] text-neutral-500 mb-4">Upload the feature image shown next to the "About Us" text.</p>
              
              <div className="relative h-48 rounded-xl overflow-hidden border border-neutral-700 group bg-neutral-900 flex items-center justify-center">
                {form.aboutImage ? (
                  <>
                    <img src={form.aboutImage.startsWith('http') ? form.aboutImage : `http://localhost:3001${form.aboutImage}`} alt="About Us Feature" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      <button type="button" disabled={uploading} onClick={() => aboutInputRef.current?.click()} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50">
                        <ImageIcon size={14} /> {uploading ? 'Uploading...' : 'Change Image'}
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" disabled={uploading} onClick={() => aboutInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-sky-400 transition-colors w-full h-full disabled:opacity-50">
                    <Upload size={24} />
                    <span className="text-xs font-semibold">{uploading ? 'Uploading...' : 'Upload Feature Image'}</span>
                  </button>
                )}
              </div>
              <input type="file" ref={aboutInputRef} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'about')} />
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

      {/* ════ CONFIRMATION MODAL ════ */}
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
                  const oldVal = (siteConfig as any)?.[key];
                  const newVal = (form as any)[key];
                  
                  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
                    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                      return (
                        <div key={key} className="text-sm pb-2 border-b border-neutral-800 last:border-0 last:pb-0">
                          <span className="text-neutral-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                          <span className="text-sky-400 font-semibold block mt-1">Gallery Images Updated ({newVal.length} active)</span>
                        </div>
                      );
                    }
                  } else if (oldVal !== newVal) {
                    const isImageString = typeof newVal === 'string' && newVal.startsWith('http');
                    
                    return (
                      <div key={key} className="text-sm pb-2 border-b border-neutral-800 last:border-0 last:pb-0">
                        <span className="text-neutral-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                        {isImageString ? (
                          <div className="mt-1 bg-sky-950/20 p-2 rounded text-sky-400 font-medium text-xs">Custom Image Uploaded</div>
                        ) : (
                          <>
                            <div className="mt-1 bg-neutral-950 p-2 rounded text-rose-400 line-through text-xs truncate opacity-70">{oldVal}</div>
                            <div className="mt-1 bg-sky-950/20 p-2 rounded text-sky-400 font-medium text-xs">{newVal}</div>
                          </>
                        )}
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
                  disabled={isProcessing}
                  placeholder="Enter admin password to save" 
                  autoFocus
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" 
                />
                {passError && <p className="text-[10px] flex items-center gap-1 text-rose-400 font-semibold mt-2"><AlertTriangle size={10} /> {passError}</p>}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-800 flex gap-3 flex-none">
              <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">Cancel</button>
              <button type="button" onClick={handleConfirmSave} disabled={!password || isProcessing} className="flex-1 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                {isProcessing ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</> : <><CheckCircle size={14} /> Authorize & Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}