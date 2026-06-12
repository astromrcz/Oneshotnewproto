import { useState } from 'react';
import { useAppContext, StaffUser } from '../context/AppContext';
import { Plus, X, User, Mail, Phone, ToggleLeft, ToggleRight, RefreshCw, Pencil, CheckCircle, Eye, EyeOff, ShieldCheck, Palette, BadgeDollarSign } from 'lucide-react';
import { format } from 'date-fns';

const ROLES: { value: StaffUser['role']; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'manager',       label: 'Manager',       color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   icon: <User size={11} /> },
  { value: 'tattoo-artist', label: 'Tattoo Artist', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',     icon: <Palette size={11} /> },
  { value: 'cashier',       label: 'Cashier',       color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: <BadgeDollarSign size={11} /> },
];

type FormState = {
  username: string; password: string; fullName: string;
  email: string; role: StaffUser['role']; isAdmin: boolean; artistId: string; phone: string; isActive: boolean;
};
const blankForm: FormState = { username: '', password: '', fullName: '', email: '', role: 'manager', isAdmin: false, artistId: '', phone: '', isActive: true };

export function AdminUsers() {
  const { staffUsers, tattooArtists, addStaffUser, updateStaffUser, toggleStaffUserActive, resetStaffUserPassword } = useAppContext();
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(blankForm);
  const [showPw, setShowPw]         = useState(false);
  const [resetMsg, setResetMsg]     = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<'all' | StaffUser['role']>('all');

  const openAdd = () => { setEditingId(null); setForm(blankForm); setShowPw(false); setShowForm(true); };
  const openEdit = (u: StaffUser) => {
    setEditingId(u.id);
    setForm({ username: u.username, password: u.password, fullName: u.fullName, email: u.email, role: u.role, isAdmin: u.isAdmin, artistId: u.artistId ?? '', phone: u.phone, isActive: u.isActive });
    setShowPw(false); setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.fullName || !form.email) return;
    const payload: Omit<StaffUser, 'id' | 'createdAt'> = {
      ...form,
      artistId: form.role === 'tattoo-artist' && form.artistId ? form.artistId : undefined,
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Users',     value: staffUsers.length,                                      color: 'text-white' },
          { label: 'Active',          value: staffUsers.filter(u => u.isActive).length,               color: 'text-emerald-400' },
          { label: 'Tattoo Artists',  value: staffUsers.filter(u => u.role === 'tattoo-artist').length, color: 'text-pink-400' },
          { label: 'Admins',          value: staffUsers.filter(u => u.isAdmin).length,                color: 'text-amber-400' },
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
          const linkedArtist = u.artistId ? tattooArtists.find(a => a.id === u.artistId) : null;
          return (
            <div key={u.id} className={`bg-neutral-950 border rounded-xl p-5 transition-colors ${u.isActive ? 'border-neutral-800' : 'border-neutral-800/50 opacity-60'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0 border ${u.isAdmin ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : u.role === 'tattoo-artist' ? 'bg-pink-500/10 border-pink-500/20 text-pink-400' : 'bg-neutral-800 border-neutral-700 text-neutral-300'}`}>
                  {u.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-bold text-neutral-100">{u.fullName}</p>
                    {u.isAdmin && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <ShieldCheck size={9} /> Admin
                      </span>
                    )}
                    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${rc.color}`}>
                      {rc.icon} {rc.label}
                    </span>
                    {!u.isActive && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
                    <span className="flex items-center gap-1"><User size={10} /> @{u.username}</span>
                    <span className="flex items-center gap-1"><Mail size={10} /> {u.email}</span>
                    {u.phone && <span className="flex items-center gap-1"><Phone size={10} /> {u.phone}</span>}
                  </div>
                  {linkedArtist && (
                    <p className="text-[10px] text-pink-400/70 mt-0.5 flex items-center gap-1">
                      <Palette size={9} /> Linked: {linkedArtist.name} ({linkedArtist.specialty})
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(u)} className="p-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => handleReset(u.id, u.fullName)} className="p-2 rounded-lg text-neutral-500 hover:text-amber-400 hover:bg-amber-950/20 transition-colors"><RefreshCw size={14} /></button>
                  <button onClick={() => toggleStaffUserActive(u.id)} className="p-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors">
                    {u.isActive ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} />}
                  </button>
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
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, role: r.value }))}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${form.role === r.value ? r.color : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}>
                      {r.icon}
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Artist linkage (visible only for tattoo-artist role) */}
              {form.role === 'tattoo-artist' && (
                <div className="bg-pink-950/20 border border-pink-900/30 rounded-xl p-3">
                  <label className="text-xs text-neutral-400 mb-1.5 block font-medium">Link to Artist Profile</label>
                  <select value={form.artistId} onChange={e => setForm(f => ({ ...f, artistId: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-300 focus:outline-none focus:border-pink-600/50 appearance-none">
                    <option value="">— No link —</option>
                    {tattooArtists.filter(a => a.isActive).map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.specialty})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-neutral-600 mt-1.5">This artist will log in at /artist/login</p>
                </div>
              )}

              {/* Admin toggle */}
              <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={16} className={form.isAdmin ? 'text-amber-400' : 'text-neutral-600'} />
                    <div>
                      <p className="text-sm font-semibold text-neutral-200">Admin Access</p>
                      <p className="text-[11px] text-neutral-500">Can access the Admin Portal</p>
                    </div>
                  </div>
                  <div className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${form.isAdmin ? 'bg-amber-600' : 'bg-neutral-700'}`}
                    onClick={() => setForm(f => ({ ...f, isAdmin: !f.isAdmin }))}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isAdmin ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </label>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? 'bg-emerald-600' : 'bg-neutral-700'}`}
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs text-neutral-400">Account Active</span>
              </label>

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