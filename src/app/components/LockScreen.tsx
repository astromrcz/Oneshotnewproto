import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Lock, Unlock, Eye, EyeOff } from 'lucide-react';

interface LockScreenProps {
  isLocked: boolean;
  onUnlock: () => void;
  userType: 'admin' | 'staff';
}

export function LockScreen({ isLocked, onUnlock, userType }: LockScreenProps) {
  const { staffProfile } = useAppContext();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  if (!isLocked) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Admin validation
    if (userType === 'admin') {
      if (password === 'admin123') {
         onUnlock();
         setPassword('');
         setError('');
         return;
      }
    } 
    // Staff validation
    else {
      if (password === staffProfile?.password || password === 'staff123') {
         onUnlock();
         setPassword('');
         setError('');
         return;
      }
    }
    
    setError('Incorrect password.');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center animate-in zoom-in duration-200">
         <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-5 border border-neutral-800 shadow-inner">
           <Lock size={32} className="text-emerald-500" />
         </div>
         <h2 className="text-2xl font-black text-white mb-2">Device Locked</h2>
         <p className="text-sm text-neutral-400 mb-8">
           {userType === 'admin' ? 'Admin Portal' : `Locked by ${staffProfile?.fullName || 'Staff'}`}
         </p>
         
         <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative text-left">
                <input 
                  type={showPw ? 'text' : 'password'} 
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter password to unlock"
                  className={`w-full bg-neutral-900 border rounded-xl px-4 py-3.5 text-sm text-neutral-100 focus:outline-none transition-colors ${error ? 'border-rose-500/50 focus:border-rose-500' : 'border-neutral-700 focus:border-emerald-500'}`}
                  autoFocus
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20">
              <Unlock size={16} /> Unlock
            </button>
         </form>
      </div>
    </div>
  );
}