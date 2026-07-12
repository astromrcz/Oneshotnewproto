import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ShieldCheck, User, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import logoImg from 'figma:asset/40eb82831843e17a3c48a360fd80f0aaaa58ddc8.png';

export function OfflineLogin() {
  const navigate = useNavigate();
  const { staffLogin, adminLogin } = useAppContext();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

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
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoImg} alt="One Shot Logo" className="w-20 h-20 mx-auto object-contain mb-4 rounded-2xl" />
          <h1 className="text-2xl font-black text-white tracking-tight">ONE SHOT BAR</h1>
          <p className="text-xs text-emerald-500 font-semibold uppercase tracking-widest mt-1">Offline Management System</p>
        </div>

        <form onSubmit={handleLogin} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
          <div className="mb-6 flex items-center gap-2 border-b border-neutral-800 pb-4">
            <ShieldCheck className="text-emerald-500" size={20} />
            <h2 className="text-lg font-bold text-white">Staff / Admin Login</h2>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs px-3 py-2.5 rounded-xl">
              <AlertTriangle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 font-medium uppercase tracking-wider">Username</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"><User size={15} /></div>
                <input 
                  type="text" 
                  autoFocus
                  value={username} 
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 font-medium uppercase tracking-wider">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"><Lock size={15} /></div>
                <input 
                  type={showPw ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-10 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20">
            Login to System
          </button>
        </form>
      </div>
    </div>
  );
}