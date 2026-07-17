import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, User, Lock, Eye, EyeOff, AlertTriangle, ArrowLeft, KeyRound, CheckCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import logoImg from 'figma:asset/40eb82831843e17a3c48a360fd80f0aaaa58ddc8.png';

type FormView = 'login' | 'reset';

export function OfflineLogin() {
  const navigate = useNavigate();
  const { staffLogin, adminLogin, siteConfig, resetPasswordWithPin } = useAppContext() as any;
  
  // UI States
  const [view, setView] = useState<FormView>('login');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Reset Form State
  const [resetUsername, setResetUsername] = useState('');
  const [resetPin, setResetPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const sliderImages = siteConfig?.heroImages && siteConfig.heroImages.length > 0 
    ? siteConfig.heroImages 
    : [
        'https://images.unsplash.com/photo-1595079676339-1534801ad6cb?q=80&w=2000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=2000&auto=format&fit=crop',
      ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % sliderImages.length), 5000);
    return () => clearInterval(timer);
  }, [sliderImages.length]);

  const switchView = (newView: FormView) => {
    setError('');
    setSuccessMsg('');
    setView(newView);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);

    const isAdmin = await adminLogin(username, password);
    if (isAdmin) { navigate('/admin'); return; }

    const isStaff = await staffLogin(username, password);
    if (isStaff) { navigate('/staff'); return; }

    setError('Invalid username or password.');
    setIsProcessing(false);
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (resetPin.length !== 4) {
      setError('Recovery PIN must be exactly 4 digits.');
      return;
    }

    setIsProcessing(true);
    const res = await resetPasswordWithPin(resetUsername, resetPin, newPassword);
    
    if (res.success) {
      setSuccessMsg('Password successfully changed! Returning to login...');
      setTimeout(() => {
        setUsername(resetUsername);
        setPassword('');
        setResetUsername('');
        setResetPin('');
        setNewPassword('');
        setConfirmPassword('');
        switchView('login');
      }, 3000);
    } else {
      setError(res.message);
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col lg:flex-row font-sans overflow-hidden relative">
      
      {/* ─── LEFT COLUMN: FORMS ─── */}
      <div className="w-full lg:w-[480px] xl:w-[540px] flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-12 z-20 bg-neutral-950 shadow-[20px_0_50px_rgba(0,0,0,0.5)] relative">
        <div className="w-full max-w-sm mx-auto relative overflow-hidden">
          
          <div className="mb-8">
            <img src={logoImg} alt="One Shot Logo" className="w-16 h-16 object-contain mb-5 rounded-2xl shadow-lg shadow-emerald-900/20" />
            <h1 className="text-3xl font-black text-white tracking-tight leading-tight">ONE SHOT BAR</h1>
            <p className="text-[11px] text-emerald-500 font-bold uppercase tracking-[0.2em] mt-2">Offline Management System</p>
          </div>

          <div className="relative min-h-[350px]">
            <AnimatePresence mode="wait">
              
              {/* ── LOGIN VIEW ── */}
              {view === 'login' && (
                <motion.div key="login" initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="text-emerald-500" size={18} />
                      <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Authorized Access Only</h2>
                    </div>

                    {error && <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs px-4 py-3 rounded-xl"><AlertTriangle size={14} className="flex-shrink-0" />{error}</div>}
                    {successMsg && <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-xs px-4 py-3 rounded-xl"><CheckCircle size={14} className="flex-shrink-0" />{successMsg}</div>}

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-widest pl-1">Username</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"><User size={16} /></div>
                          <input type="text" autoFocus value={username} onChange={e => setUsername(e.target.value)} disabled={isProcessing} className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder-neutral-600" placeholder="Enter your username" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center pr-1">
                          <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-widest pl-1">Password</label>
                          <button type="button" onClick={() => switchView('reset')} className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold transition-colors">Forgot Password?</button>
                        </div>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"><Lock size={16} /></div>
                          <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} disabled={isProcessing} className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl pl-11 pr-12 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder-neutral-600" placeholder="••••••••" />
                          <button type="button" disabled={isProcessing} onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 disabled:opacity-50 transition-colors">
                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button type="submit" disabled={isProcessing} className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                      {isProcessing ? 'Authenticating...' : 'Secure Login'}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ── RESET PASSWORD VIEW (PIN) ── */}
              {view === 'reset' && (
                <motion.div key="reset" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                  <form onSubmit={handleConfirmReset} className="space-y-4">
                    <button type="button" onClick={() => switchView('login')} className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white mb-2 transition-colors"><ArrowLeft size={14} /> Back to Login</button>
                    <h2 className="text-xl font-bold text-white mb-4">Set New Password</h2>

                    {error && <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs px-4 py-3 rounded-xl"><AlertTriangle size={14} className="flex-shrink-0" />{error}</div>}
                    {successMsg && <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-xs px-4 py-3 rounded-xl"><CheckCircle size={14} className="flex-shrink-0" />{successMsg}</div>}

                    <div className="grid grid-cols-[1fr_120px] gap-3">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-widest pl-1">Username</label>
                        <input type="text" required value={resetUsername} onChange={e => setResetUsername(e.target.value)} disabled={isProcessing} className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all" placeholder="Username" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-widest pl-1 text-amber-500">4-Digit PIN</label>
                        <input type="password" required maxLength={4} value={resetPin} onChange={e => setResetPin(e.target.value.replace(/\D/g, ''))} disabled={isProcessing} className="w-full bg-amber-950/20 border border-amber-900/50 rounded-xl px-3 py-3 text-lg font-mono text-center tracking-[0.2em] text-amber-400 focus:outline-none focus:border-amber-500 transition-all placeholder-amber-900/40" placeholder="••••" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-widest pl-1">New Password</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"><KeyRound size={16} /></div>
                        <input type={showPw ? "text" : "password"} required value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={isProcessing} className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl pl-11 pr-12 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all" placeholder="••••••••" />
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"><Eye size={16} /></button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-widest pl-1">Confirm Password</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"><KeyRound size={16} /></div>
                        <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={isProcessing} className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all" placeholder="••••••••" />
                      </div>
                    </div>

                    <button type="submit" disabled={isProcessing || resetPin.length !== 4 || !newPassword} className="w-full mt-4 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg">
                      {isProcessing ? 'Saving...' : 'Confirm & Change Password'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="mt-8 pt-6 border-t border-neutral-800/50">
            <p className="text-[10px] text-neutral-600 font-medium">© {new Date().getFullYear()} One Shot Bar & Billiards. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* ─── RIGHT COLUMN: IMAGE SLIDER ─── */}
      <div className="hidden lg:block relative flex-1 bg-neutral-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/20 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-neutral-950/30 z-10" />
        {sliderImages.map((img: string, index: number) => (
          <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
            <img src={img} alt={`Slide ${index + 1}`} className="w-full h-full object-cover object-center" />
          </div>
        ))}
      </div>
    </div>
  );
}