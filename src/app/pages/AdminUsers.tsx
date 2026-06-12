import { useState } from 'react';
import { useAppContext, StaffUser } from '../context/AppContext';
import { Plus, X, User, Mail, Phone, RefreshCw, Pencil, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';

const ROLES: { value: StaffUser['role']; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'manager', label: 'Manager', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <User size={11} /> },
];

type FormState = {
  username: string; password: string; fullName: string;
  email: string; role: StaffUser['role']; phone: string; isAdmin: boolean;
};
const blankForm: FormState = { username: '', password: '', fullName: '', email: '', role: 'manager', phone: '', isAdmin: false };

export function AdminUsers() {
  const { staffUsers, addStaffUser, updateStaffUser, resetStaffUserPassword } = useAppContext();
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(blankForm);
  const [showPw, setShowPw]         = useState(false);
  const [resetMsg, setResetMsg]     = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<'all' | StaffUser['role']>('all');

  const openAdd = () => { setEditingId(null); setForm(blankForm); setShowPw(false); setShowForm(true); };
  const openEdit = (u: StaffUser) => {
    setEditingId(u.id);
    setForm({ username: u.username, password: u.password, fullName: u.fullName, email: u.email, role: u.role, phone: u.phone, isAdmin: u.isAdmin });
    setShowPw(false); setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.fullName || !form.email) return;
    const payload: Omit<StaffUser, 'id' | 'createdAt'> = {
      ...form,
      isActive: true,
    };
    if (editingId) updateStaffUser(editingId, payload);
    else addStaffUser(payload);
    setShowForm(false); setEditingId(null); setForm(blankForm);
  };

  const handleReset = (id: string, name: string) => {
    resetStaffUserPassword(id);
    setResetMsg(`Password for "${name}" reset to: oneshot123`);
    setTimeout(() => setResetMsg(null), 4000);
  };

  const filtered = staffUsers.filter(u => filterRole === 'all' || u.role === filterRole);

  const roleConfig = (role: StaffUser['role']) => ROLES.find(r => r.value === role) ?? ROLES[0];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
        {[
          { label: 'Total Users',     value: staffUsers.length,                                    color: 'text-white' },
          { label: 'Managers',        value: staffUsers.filter(u => u.role === 'manager').length, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {resetMsg && (
        <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-700/40 text-emerald-400 text-sm px-4 py-3 rounded-xl">
          <CheckCircle size={15} /> {resetMsg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {[{ id: 'all', label: 'All' }, ...ROLES.map(r => ({ id: r.value, label: r.label }))].map(f => (
            <button key={f.id} onClick={() => setFilterRole(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterRole === f.id ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:border-neutral-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-sm px-4 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-amber-900/30">
          <Plus size={15} /> Add User
        </button>
      </div>

      {/* User List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-12 text-center">
            <User size={32} className="mx-auto text-neutral-700 mb-3" />
            <p className="text-neutral-500">No users found</p>
          </div>
        ) : filtered.map(u => {
          const rc = roleConfig(u.role);
          return (
            <div key={u.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 transition-colors hover:border-neutral-700">
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0 border bg-neutral-800 border-neutral-700 text-neutral-300`}>
                  {u.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-bold text-neutral-100">{u.fullName}</p>
                    {u.isAdmin && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Admin
                      </span>
                    )}
                    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${rc.color}`}>
                      {rc.icon} {rc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
                    <span className="flex items-center gap-1"><User size={10} /> @{u.username}</span>
                    <span className="flex items-center gap-1"><Mail size={10} /> {u.email}</span>
                    {u.phone && <span className="flex items-center gap-1"><Phone size={10} /> {u.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(u)} className="p-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => handleReset(u.id, u.fullName)} className="p-2 rounded-lg text-neutral-500 hover:text-amber-400 hover:bg-amber-950/20 transition-colors"><RefreshCw size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-amber-900/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center flex-none">
              <div>
                <h2 className="text-base font-bold text-neutral-100">{editingId ? 'Edit User' : 'Add Staff User'}</h2>
                <p className="text-xs text-neutral-500">Staff account details</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg"><X size={16} /></button>
            </div>
            <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block font-medium">Full Name *</label>
                <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required autoFocus
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors placeholder-neutral-600" placeholder="e.g. Juan dela Cruz" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block font-medium">Username *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">@</span>
                  <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g,'') }))} required
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-7 pr-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors placeholder-neutral-600" placeholder="username" />
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block font-medium">Password {!editingId && '*'}</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editingId}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 pr-10 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors placeholder-neutral-600"
                    placeholder={editingId ? 'Leave blank to keep current' : 'Set password'} />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block font-medium">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors placeholder-neutral-600" placeholder="user@oneshot.com" />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block font-medium">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors placeholder-neutral-600" placeholder="09XXXXXXXXX" />
              </div>

              {/* Role selector */}
              <div>
                <label className="text-xs text-neutral-400 mb-2 block font-medium">Role *</label>
                <div className="flex flex-col gap-2">
                  {ROLES.map(r => {
                    const isSelected = form.role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, role: r.value }))}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                          isSelected
                            ? `${r.color} ring-1 ring-amber-500/50 shadow-sm`
                            : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                          isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {r.icon}
                        </div>
                        <span className="flex-1 text-left">{r.label}</span>
                        {isSelected && <CheckCircle size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Admin privileges */}
              <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                <input type="checkbox" id="adminCheckbox" checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))}
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 cursor-pointer" />
                <label htmlFor="adminCheckbox" className="text-xs text-neutral-300 font-medium cursor-pointer flex-1">Grant Admin Privileges</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">Cancel</button>
                <button type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-xl font-semibold transition-all py-2.5 flex items-center justify-center gap-2">
                  {editingId ? <><Pencil size={14} /> Save Changes</> : <><Plus size={14} /> Create User</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}