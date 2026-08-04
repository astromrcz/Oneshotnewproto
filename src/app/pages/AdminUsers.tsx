import { useState } from 'react';
import { useAppContext, StaffUser } from '../context/AppContext';
import { Plus, X, User, Phone, CheckCircle, Eye, EyeOff, Trash2, History, Activity, RefreshCw } from 'lucide-react';
import { PageLoader } from '../components/PageLoader';

const ROLES: { value: StaffUser['role']; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'manager', label: 'Manager', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <User size={11} /> },
  { value: 'cashier', label: 'Cashier', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <User size={11} /> },
];

type FormState = {
  username: string; password: string; fullName: string;
  role: StaffUser['role']; phone: string; isAdmin: boolean;
};

// 🟢 FIXED: Email removed from the blank form state
const blankForm: FormState = { username: '', password: '', fullName: '', role: 'manager', phone: '', isAdmin: false };

export function AdminUsers() {
  const { staffUsers, activities, addStaffUser, updateStaffUser, resetStaffUserPassword, hashPassword } = useAppContext();
  
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState<FormState>(blankForm);
  const [showPw, setShowPw]         = useState(false);
  const [resetMsg, setResetMsg]     = useState<string | null>(null);
  
  const [viewTab, setViewTab]       = useState<'active' | 'archived'>('active');
  const [filterRole, setFilterRole] = useState<'all' | StaffUser['role']>('all');

  // 🟢 NEW: Loading state for eFootball 8-ball loader
  const [isLoading, setIsLoading]   = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('PROCESSING...');

  const openAdd = () => { setForm(blankForm); setShowPw(false); setShowForm(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isUsernameTaken = staffUsers.some(u => u.username.toLowerCase() === form.username.toLowerCase());
    const hashedPw = await hashPassword(form.password);
    
    if (isUsernameTaken) { alert("Error: That username is already taken. Please choose another."); return; }
    
    if (!form.username || !form.fullName) {
      alert("Please fill all required fields.");
      return;
    }
    
    const payload = {
      ...form,
      password: hashedPw,
      isActive: true,
      recoveryPin: '', 
      isFirstLogin: 1, 
    };
    
    // 🟢 Trigger Loader instead of window.location.reload()
    setLoadingMsg('SAVING NEW USER...');
    setIsLoading(true);
    addStaffUser(payload as any);
    setShowForm(false);
    setForm(blankForm);

    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  const handleResetPassword = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to reset the password for ${name}? It will be changed to "oneshotstaff" and they will be forced to change it on their next login.`)) {
      resetStaffUserPassword(id);
      setResetMsg(`Password for ${name} has been securely reset to: oneshotstaff`);
      setTimeout(() => setResetMsg(null), 8000);
    }
  };

  const handleArchive = (id: string, name: string, username: string) => {
    if (username === 'superadmin' || id === 'admin_001') {
      alert("CRITICAL SECURITY ALERT: The Master Super Admin account cannot be archived or deleted.");
      return;
    }

    if (window.confirm(`Are you sure you want to remove ${name}? Their data will be archived.`)) {
      const targetUser = staffUsers.find(u => u.id === id);
      if (targetUser?.isAdmin) {
         const activeAdmins = staffUsers.filter(u => u.isAdmin && u.isActive).length;
         if (activeAdmins <= 1) {
            alert("Action Denied: You cannot archive the last active admin.");
            return;
         }
      }

      // 🟢 Trigger Loader instead of window.location.reload()
      setLoadingMsg('ARCHIVING USER...');
      setIsLoading(true);
      updateStaffUser(id, { isActive: false });

      setTimeout(() => {
        setIsLoading(false);
      }, 800);
    }
  };

  const handleRestore = (id: string) => {
    // 🟢 Trigger Loader instead of window.location.reload()
    setLoadingMsg('REACTIVATING USER...');
    setIsLoading(true);
    updateStaffUser(id, { isActive: true });

    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  const toggleAdmin = (id: string, currentStatus: boolean, role: string, username: string) => {
    if (role === 'cashier') return; 
    
    if (username === 'superadmin' || id === 'admin_001') {
      alert('Action Denied: The Master Super Admin must always retain administrator privileges.');
      return;
    }

    if (currentStatus) {
      const activeAdmins = staffUsers.filter(u => u.isAdmin && u.isActive).length;
      if (activeAdmins <= 1) {
        alert('Action Denied: There must be at least one active admin in the system.');
        return;
      }
    }

    // 🟢 Trigger Loader instead of window.location.reload()
    setLoadingMsg('UPDATING PERMISSIONS...');
    setIsLoading(true);
    updateStaffUser(id, { isAdmin: !currentStatus });

    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  const displayUsers = staffUsers.filter(u => {
    const isCorrectTab = viewTab === 'active' ? u.isActive : !u.isActive;
    const isCorrectRole = filterRole === 'all' || u.role === filterRole;
    return isCorrectTab && isCorrectRole;
  });

  const roleConfig = (role: StaffUser['role']) => ROLES.find(r => r.value === role) ?? ROLES[0];

  return (
    <div className="relative space-y-5">
      {/* 🟢 NEW: PageLoader Component */}
      <PageLoader isLoading={isLoading} message={loadingMsg} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Staff',    value: staffUsers.filter(u => u.isActive).length,  color: 'text-white' },
          { label: 'Managers',        value: staffUsers.filter(u => u.isActive && u.role === 'manager').length, color: 'text-amber-400' },
          { label: 'Cashiers',        value: staffUsers.filter(u => u.isActive && u.role === 'cashier').length, color: 'text-emerald-400' },
          { label: 'Archived Staff',  value: staffUsers.filter(u => !u.isActive).length, color: 'text-neutral-500' },
        ].map(s => (
          <div key={s.label} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {resetMsg && (
        <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-700/40 text-emerald-400 text-sm px-4 py-3 rounded-xl animate-in fade-in">
          <CheckCircle size={15} className="flex-shrink-0" /> {resetMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl p-1">
          <button onClick={() => setViewTab('active')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${viewTab === 'active' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}>
            <User size={14} /> Active Staff
          </button>
          <button onClick={() => setViewTab('archived')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${viewTab === 'archived' ? 'bg-neutral-800 text-neutral-200 border border-neutral-700' : 'text-neutral-500 hover:text-neutral-300'}`}>
            <History size={14} /> Previous Employees
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 flex-wrap hidden sm:flex">
            {[{ id: 'all', label: 'All Roles' }, ...ROLES.map(r => ({ id: r.value, label: r.label }))].map(f => (
              <button key={f.id} onClick={() => setFilterRole(f.id as any)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${filterRole === f.id ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:border-neutral-700'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-sm px-4 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-amber-900/30">
            <Plus size={15} /> Add User
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {displayUsers.length === 0 ? (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-12 text-center">
            <User size={32} className="mx-auto text-neutral-700 mb-3" />
            <p className="text-neutral-500">No {viewTab === 'archived' ? 'archived' : 'active'} users found</p>
          </div>
        ) : displayUsers.map(u => {
          const rc = roleConfig(u.role);
          const activityMentions = activities.filter(a => a.description.toLowerCase().includes(u.fullName.toLowerCase()) || a.description.toLowerCase().includes(u.username.toLowerCase())).length;
          const performanceScore = activityMentions * 5;

          return (
            <div key={u.id} className={`bg-neutral-950 border rounded-xl p-5 transition-colors ${viewTab === 'archived' ? 'border-rose-900/30 opacity-75' : 'border-neutral-800 hover:border-neutral-700'}`}>
              <div className="flex items-start gap-4">
                
                <div className="flex flex-col items-center gap-2">
                  {u.avatarImg ? (
                    <img src={u.avatarImg.startsWith('http') ? u.avatarImg : `http://localhost:3001${u.avatarImg}`} alt={u.fullName} className={`w-11 h-11 rounded-xl object-cover border ${viewTab === 'archived' ? 'border-rose-900/30 opacity-50' : 'border-neutral-700'}`} />
                  ) : (
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0 border ${viewTab === 'archived' ? 'bg-rose-950/20 border-rose-900/30 text-rose-500' : 'bg-neutral-800 border-neutral-700 text-neutral-300'}`}>
                      {u.fullName.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className={`text-sm font-bold ${viewTab === 'archived' ? 'text-rose-400 line-through' : 'text-neutral-100'}`}>{u.fullName}</p>
                    {u.isAdmin && <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Admin</span>}
                    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${rc.color}`}>{rc.icon} {rc.label}</span>
                    {viewTab === 'archived' && <span className="text-[10px] bg-rose-900/30 text-rose-400 border border-rose-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Archived</span>}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap mb-3">
                    <span className="flex items-center gap-1"><User size={10} /> @{u.username}</span>
                    {u.phone && <span className="flex items-center gap-1"><Phone size={10} /> {u.phone}</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-md">
                      <Activity size={12} className="text-emerald-500" />
                      <span className="text-[10px] text-neutral-400 font-medium">System Actions: <strong className="text-neutral-200">{activityMentions}</strong></span>
                    </div>
                    {performanceScore > 100 && (
                      <div className="flex items-center gap-1 bg-amber-950/30 border border-amber-900/40 px-2 py-1 rounded-md text-[10px] text-amber-500 font-bold">⭐ Top Performer</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {viewTab === 'active' ? (
                    <>
                      <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${u.role === 'cashier' ? 'bg-neutral-900/50 border-neutral-800/50' : 'bg-neutral-900 border-neutral-800'} mr-1`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${u.role === 'cashier' ? 'text-neutral-600' : (u.isAdmin ? 'text-amber-400' : 'text-neutral-500')}`}>Admin</span>
                        <button type="button" disabled={u.role === 'cashier'} onClick={() => toggleAdmin(u.id, u.isAdmin, u.role, u.username)} className={`relative w-7 h-4 rounded-full transition-colors ${u.role === 'cashier' ? 'bg-neutral-800 cursor-not-allowed' : (u.isAdmin ? 'bg-amber-500' : 'bg-neutral-700')}`}>
                          <div className={`absolute top-[2px] left-[2px] w-3 h-3 bg-white rounded-full transition-transform ${u.isAdmin ? 'translate-x-3' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      <button onClick={() => handleResetPassword(u.id, u.fullName)} className="p-2 rounded-lg text-neutral-500 hover:text-amber-400 hover:bg-amber-950/20 transition-colors" title="Force Password Reset"><RefreshCw size={14} /></button>
                      
                      <button onClick={() => handleArchive(u.id, u.fullName, u.username)} className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors" title="Archive User"><Trash2 size={14} /></button>
                    </>
                  ) : (
                    <button onClick={() => handleRestore(u.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 hover:bg-emerald-900/50 transition-colors">
                      <RefreshCw size={12} /> Reactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-amber-900/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center flex-none">
              <div>
                <h2 className="text-base font-bold text-neutral-100">Add Staff User</h2>
                <p className="text-xs text-neutral-500">Create a new staff account</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg"><X size={16} /></button>
            </div>
            <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block font-medium">Full Name *</label>
                <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required autoFocus
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors" placeholder="e.g. Juan dela Cruz" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block font-medium">Username (Used for Login) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">@</span>
                  <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g,'') }))} required
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-7 pr-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors" placeholder="username" />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block font-medium">Password *</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 pr-10 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors"
                    placeholder="Set starting password" />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block font-medium">Phone</label>
                <input type="tel" value={form.phone} maxLength={13}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^\d+]/g, '').slice(0, 13) }))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors" placeholder="e.g. +639123456789" />
              </div>

              <div>
                <label className="text-xs text-neutral-400 mb-2 block font-medium">Role *</label>
                <div className="flex flex-col gap-2">
                  {ROLES.map(r => {
                    const isSelected = form.role === r.value;
                    return (
                      <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, role: r.value, isAdmin: r.value === 'cashier' ? false : f.isAdmin }))}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${isSelected ? `${r.color} ring-1 ring-amber-500/50 shadow-sm` : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'}`}>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-400'}`}>{r.icon}</div>
                        <span className="flex-1 text-left">{r.label}</span>
                        {isSelected && <CheckCircle size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`flex items-center gap-3 border rounded-xl p-3 transition-colors ${form.role === 'cashier' ? 'bg-neutral-950 border-neutral-900/50 opacity-60' : 'bg-neutral-900 border-neutral-800'}`}>
                <input type="checkbox" id="adminCheckbox" checked={form.isAdmin} disabled={form.role === 'cashier'} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))}
                  className={`w-4 h-4 rounded border-neutral-700 bg-neutral-900 ${form.role === 'cashier' ? 'cursor-not-allowed' : 'cursor-pointer'}`} />
                <label htmlFor="adminCheckbox" className={`text-xs font-medium flex-1 ${form.role === 'cashier' ? 'text-neutral-500 cursor-not-allowed' : 'text-neutral-300 cursor-pointer'}`}>
                  Grant Admin Privileges {form.role === 'cashier' && <span className="text-[10px] text-rose-500/80 ml-1 font-bold">(Disabled)</span>}
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-xl font-semibold transition-all py-2.5 flex items-center justify-center gap-2"><Plus size={14} /> Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}