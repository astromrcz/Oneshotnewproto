import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  User, Lock, Mail, Phone, Shield, Eye, EyeOff,
  Save, CheckCircle, Pencil, X, Calendar, Tag,
  AlertTriangle, LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router';
import logoImg from 'figma:asset/40eb82831843e17a3c48a360fd80f0aaaa58ddc8.png';

type Section = 'profile' | 'security' | 'account';

export function SettingsPage() {
  const { staffProfile, updateStaffProfile, staffLogout } = useAppContext();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [saved, setSaved] = useState<string | null>(null);

  // ── Profile Form ────────────────────────────────────────────
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: staffProfile.fullName,
    email:    staffProfile.email,
    phone:    staffProfile.phone,
    role:     staffProfile.role,
  });

  // ── Security Form ───────────────────────────────────────────
  const [secEdit, setSecEdit] = useState(false);
  const [secForm, setSecForm] = useState({
    username:        staffProfile.username,
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [secError, setSecError] = useState('');

  // ── Save helpers ────────────────────────────────────────────
  const flashSaved = (key: string) => {
    setSaved(key);
    setTimeout(() => setSaved(null), 2500);
  };

  const handleSaveProfile = () => {
    updateStaffProfile({
      fullName: profileForm.fullName,
      email:    profileForm.email,
      phone:    profileForm.phone,
      role:     profileForm.role,
    });
    setProfileEdit(false);
    flashSaved('profile');
  };

  const handleSaveSecurity = () => {
    setSecError('');
    if (!secForm.currentPassword) { setSecError('Enter your current password to confirm changes.'); return; }
    if (secForm.currentPassword !== staffProfile.password) { setSecError('Current password is incorrect.'); return; }
    if (secForm.newPassword && secForm.newPassword.length < 6) { setSecError('New password must be at least 6 characters.'); return; }
    if (secForm.newPassword && secForm.newPassword !== secForm.confirmPassword) { setSecError('New passwords do not match.'); return; }
    updateStaffProfile({
      username: secForm.username || staffProfile.username,
      ...(secForm.newPassword ? { password: secForm.newPassword } : {}),
    });
    setSecEdit(false);
    setSecForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
    flashSaved('security');
  };

  const handleLogout = () => {
    staffLogout();
    navigate('/staff/login');
  };

  const tabs: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'profile',  label: 'Profile',  icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'account',  label: 'Account',  icon: Shield },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Header card ── */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 flex items-center gap-5">
        <img
          src={logoImg}
          alt="One Shot Bar & Billiards"
          className="w-16 h-16 object-contain rounded-2xl flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-black text-neutral-100">{staffProfile.fullName}</h2>
          <p className="text-sm text-neutral-400">{staffProfile.role} · @{staffProfile.username}</p>
          <p className="text-xs text-neutral-600 mt-0.5">{staffProfile.email}</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-700/40 text-emerald-400 text-xs px-3 py-2 rounded-xl">
            <CheckCircle size={13} />
            Changes saved!
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-neutral-950 border border-neutral-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeSection === tab.id
                ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-600/20'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          PROFILE TAB
      ════════════════════════════════════════════════════════ */}
      {activeSection === 'profile' && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-100">Personal Information</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Your display name, contact, and role details</p>
            </div>
            {!profileEdit ? (
              <button onClick={() => { setProfileEdit(true); setProfileForm({ fullName: staffProfile.fullName, email: staffProfile.email, phone: staffProfile.phone, role: staffProfile.role }); }}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-1.5 rounded-lg transition-colors">
                <Pencil size={12} /> Edit
              </button>
            ) : (
              <button onClick={() => setProfileEdit(false)}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 px-3 py-1.5 rounded-lg transition-colors">
                <X size={12} /> Cancel
              </button>
            )}
          </div>

          <div className="p-6 space-y-4">
            {/* Full Name */}
            <FieldRow icon={User} label="Full Name" value={staffProfile.fullName}
              editing={profileEdit}
              input={<input type="text" value={profileForm.fullName} onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-600/50 focus:ring-1 focus:ring-emerald-600/20 transition-colors" />}
            />

            {/* Email */}
            <FieldRow icon={Mail} label="Email Address" value={staffProfile.email}
              editing={profileEdit}
              input={<input type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-600/50 focus:ring-1 focus:ring-emerald-600/20 transition-colors" />}
            />

            {/* Phone */}
            <FieldRow icon={Phone} label="Phone Number" value={staffProfile.phone}
              editing={profileEdit}
              input={<input type="tel" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-600/50 focus:ring-1 focus:ring-emerald-600/20 transition-colors" />}
            />

            {/* Role */}
            <FieldRow icon={Tag} label="Role / Position" value={staffProfile.role}
              editing={profileEdit}
              input={
                <select value={profileForm.role} onChange={e => setProfileForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-600/50 focus:ring-1 focus:ring-emerald-600/20 transition-colors">
                  <option value="Manager">Manager</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Staff">Staff</option>
                  <option value="Cashier">Cashier</option>
                </select>
              }
            />

            {/* Joined */}
            <FieldRow icon={Calendar} label="Date Joined" value={new Date(staffProfile.joinedDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
              editing={false}
              input={null}
            />

            {profileEdit && (
              <div className="pt-2">
                <button onClick={handleSaveProfile}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl font-semibold transition-all shadow-lg shadow-emerald-900/30">
                  <Save size={14} /> Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          SECURITY TAB
      ════════════════════════════════════════════════════════ */}
      {activeSection === 'security' && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-100">Login Credentials</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Manage your username and password</p>
            </div>
            {!secEdit ? (
              <button onClick={() => { setSecEdit(true); setSecError(''); setSecForm(f => ({ ...f, username: staffProfile.username })); }}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-1.5 rounded-lg transition-colors">
                <Pencil size={12} /> Edit
              </button>
            ) : (
              <button onClick={() => { setSecEdit(false); setSecError(''); }}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 px-3 py-1.5 rounded-lg transition-colors">
                <X size={12} /> Cancel
              </button>
            )}
          </div>

          <div className="p-6 space-y-4">
            {/* Username */}
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0 mt-1">
                <User size={16} className="text-neutral-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">Username</p>
                {secEdit ? (
                  <input type="text" value={secForm.username} onChange={e => setSecForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-600/50 focus:ring-1 focus:ring-emerald-600/20 transition-colors" />
                ) : (
                  <p className="text-sm text-neutral-200 font-semibold">@{staffProfile.username}</p>
                )}
              </div>
            </div>

            {/* Password display */}
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0 mt-1">
                <Lock size={16} className="text-neutral-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">Password</p>
                <p className="text-sm text-neutral-400">{'•'.repeat(staffProfile.password.length)}</p>
              </div>
            </div>

            {/* Change password section */}
            {secEdit && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3 mt-2">
                <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Change Password</p>

                {/* Current password */}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Current Password <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPw.current ? 'text' : 'password'}
                      value={secForm.currentPassword}
                      onChange={e => setSecForm(f => ({ ...f, currentPassword: e.target.value }))}
                      placeholder="Your current password"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 pr-10 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-600/50 transition-colors"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                      {showPw.current ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw.new ? 'text' : 'password'}
                      value={secForm.newPassword}
                      onChange={e => setSecForm(f => ({ ...f, newPassword: e.target.value }))}
                      placeholder="Leave blank to keep current"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 pr-10 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-600/50 transition-colors"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(s => ({ ...s, new: !s.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                      {showPw.new ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPw.confirm ? 'text' : 'password'}
                      value={secForm.confirmPassword}
                      onChange={e => setSecForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      placeholder="Re-enter new password"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 pr-10 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-600/50 transition-colors"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                      {showPw.confirm ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                {secError && (
                  <div className="flex items-center gap-2 bg-rose-950/50 border border-rose-800/40 text-rose-400 text-xs px-3 py-2.5 rounded-xl">
                    <AlertTriangle size={13} className="flex-shrink-0" />
                    {secError}
                  </div>
                )}
              </div>
            )}

            {secEdit && (
              <div className="pt-1">
                <button onClick={handleSaveSecurity}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl font-semibold transition-all shadow-lg shadow-emerald-900/30">
                  <Save size={14} /> Save Credentials
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          ACCOUNT TAB
      ════════════════════════════════════════════════════════ */}
      {activeSection === 'account' && (
        <div className="space-y-4">
          {/* Account Overview */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-neutral-100">Account Overview</h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Username',   value: `@${staffProfile.username}`,    color: 'text-emerald-400' },
                { label: 'Role',       value: staffProfile.role,              color: 'text-blue-400' },
                { label: 'Email',      value: staffProfile.email,             color: 'text-neutral-300' },
                { label: 'Phone',      value: staffProfile.phone,             color: 'text-neutral-300' },
                { label: 'Full Name',  value: staffProfile.fullName,          color: 'text-neutral-300' },
                { label: 'Joined',     value: new Date(staffProfile.joinedDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }), color: 'text-neutral-400' },
              ].map(item => (
                <div key={item.label} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider font-semibold mb-1">{item.label}</p>
                  <p className={`text-sm font-semibold truncate ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Session Actions */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-neutral-100 mb-4">Session</h3>
            <div className="bg-rose-950/20 border border-rose-800/30 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-neutral-200">Sign Out</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Logs you out of the staff portal and returns to the login page.</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-800/30 hover:bg-rose-700/40 border border-rose-700/40 text-rose-400 text-sm font-semibold rounded-xl transition-colors flex-shrink-0"
                >
                  <LogOut size={14} />
                  Log Out
                </button>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-neutral-100 mb-4">System Info</h3>
            <div className="space-y-2 text-xs text-neutral-500">
              <div className="flex justify-between">
                <span>System</span>
                <span className="text-neutral-400">One Shot Bar & Billiards Management System</span>
              </div>
              <div className="flex justify-between">
                <span>Version</span>
                <span className="text-neutral-400">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Base Rate</span>
                <span className="text-neutral-400">₱250/hr</span>
              </div>
              <div className="flex justify-between">
                <span>Location</span>
                <span className="text-neutral-400">Autobase OAX, San Juan, Cainta, Rizal</span>
              </div>
              <div className="flex justify-between">
                <span>Hours</span>
                <span className="text-neutral-400">Mon–Sat 12PM–3AM · Sun 5PM–3AM</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable Field Row ────────────────────────────────────────
function FieldRow({
  icon: Icon, label, value, editing, input,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  editing: boolean;
  input: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0 mt-1">
        <Icon size={16} className="text-neutral-400" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">{label}</p>
        {editing && input ? input : (
          <p className="text-sm text-neutral-200 font-semibold">{value || '—'}</p>
        )}
      </div>
    </div>
  );
}
