import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ShieldCheck, User, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import logoImg from 'figma:asset/40eb82831843e17a3c48a360fd80f0aaaa58ddc8.png';

export function OfflineLogin() {
  const navigate = useNavigate();
  const { staffLogin, adminLogin, siteConfig } = useAppContext();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Pull images from site settings, fallback to high-quality billiard/bar stock photos
  const sliderImages = siteConfig?.heroImages && siteConfig.heroImages.length > 0 
    ? siteConfig.heroImages 
    : [
        'https://images.unsplash.com/photo-1595079676339-1534801ad6cb?q=80&w=2000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=2000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1575037614876-c38e4d44f5b8?q=80&w=2000&auto=format&fit=crop'
      ];

  // Auto-play slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [sliderImages.length]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Check if it's the Admin
    if (adminLogin(username, password)) {
      navigate('/admin');
      return;
    }

    // 2. Check if it's Staff
    if (staffLogin(username, password)) {
      navigate('/staff');
      return;
    }

    // 3. If neither, show error
    setError('Invalid username or password.');
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col lg:flex-row font-sans overflow-hidden">
      
      {/* ─── LEFT COLUMN: LOGIN FORM ─── */}
      <div className="w-full lg:w-[480px] xl:w-[540px] flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-12 z-20 bg-neutral-950 shadow-[20px_0_50px_rgba(0,0,0,0.5)] relative">
        <div className="w-full max-w-sm mx-auto">
          
          <div className="mb-10">
            <img src={logoImg} alt="One Shot Logo" className="w-16 h-16 object-contain mb-5 rounded-2xl shadow-lg shadow-emerald-900/20" />
            <h1 className="text-3xl font-black text-white tracking-tight leading-tight">ONE SHOT BAR</h1>
            <p className="text-[11px] text-emerald-500 font-bold uppercase tracking-[0.2em] mt-2">Offline Management System</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-emerald-500" size={18} />
              <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Authorized Access Only</h2>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-2">
                <AlertTriangle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-widest pl-1">Username</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"><User size={16} /></div>
                  <input 
                    type="text" 
                    autoFocus
                    value={username} 
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all placeholder-neutral-600"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-widest pl-1">Password</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"><Lock size={16} /></div>
                  <input 
                    type={showPw ? "text" : "password"} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl pl-11 pr-12 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all placeholder-neutral-600"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 group">
              <span>Secure Login</span>
              <ShieldCheck size={16} className="opacity-70 group-hover:opacity-100 transition-opacity" />
            </button>
          </form>
          
          <div className="mt-12 pt-6 border-t border-neutral-800/50">
            <p className="text-[10px] text-neutral-600 font-medium">© {new Date().getFullYear()} One Shot Bar & Billiards. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* ─── RIGHT COLUMN: IMAGE SLIDER ─── */}
      <div className="hidden lg:block relative flex-1 bg-neutral-900 overflow-hidden">
        {/* Gradient Overlay for smooth blending */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/20 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-neutral-950/30 z-10" />

        {/* Slider Images */}
        {sliderImages.map((img: string, index: number) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            }`}
          >
            <img 
              src={img} 
              alt={`Slide ${index + 1}`} 
              className="w-full h-full object-cover object-center"
            />
          </div>
        ))}

        {/* Custom Paginator Dots */}
        <div className="absolute bottom-10 right-10 z-20 flex gap-2">
          {sliderImages.map((_: any, index: number) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentSlide 
                  ? 'w-8 h-1.5 bg-emerald-500' 
                  : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}