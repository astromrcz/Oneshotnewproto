import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';
import {
  User, Lock, Mail, Phone, Eye, EyeOff,
  Save, CheckCircle, Pencil, X, Calendar, Tag,
  AlertTriangle, UploadCloud, BarChart2, CalendarCheck, 
  ShoppingCart, LayoutGrid, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import logoImg from 'figma:asset/40eb82831843e17a3c48a360fd80f0aaaa58ddc8.png';

type Section = 'overview' | 'profile' | 'security';

const getPasswordStrength = (pw: string) => {
  if (!pw) return { score: 0, color: 'bg-neutral-800', isValid: false };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[a-zA-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;

  if (score === 1) return { score, color: 'bg-rose-500', isValid: false };
  if (score === 2) return { score, color: 'bg-amber-500', isValid: false };
  return { score, color: 'bg-emerald-500', isValid: true };
};

export function SettingsPage() {
const { staffProfile, updateStaffProfile, staffLogout, activities, hashPassword, staffUsers, updateStaffUser } = useAppContext();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [saved, setSaved] = useState<string | null>(null);
  
  const [avatarImg, setAvatarImg] = useState<string | null>(staffProfile.avatarImg || null);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  
  // 🟢 NEW: Store the actual file to upload to the server
  const [pendingFile, setPendingFile] = useState<File | null>(null); 

  const [profileEdit, setProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: staffProfile.fullName, email: staffProfile.email, phone: staffProfile.phone, role: staffProfile.role,
  });

  const [secEdit, setSecEdit] = useState(false);
  const [secForm, setSecForm] = useState({ username: staffProfile.username, currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [secError, setSecError] = useState('');

  const userActivities = useMemo(() => activities.filter(a => a.description.includes(`(Action by: ${staffProfile.fullName})`)), [activities, staffProfile.fullName]);

  const stats = useMemo(() => ({
    total: userActivities.length,
    reservations: userActivities.filter(a => a.type.includes('reservation')).length,
    posOrders: userActivities.filter(a => a.type === 'pos_order').length,
    tablesAssigned: userActivities.filter(a => a.type === 'table_assigned').length,
  }), [userActivities]);

  const pwStrength = getPasswordStrength(secForm.newPassword);

  const flashSaved = (key: string) => { setSaved(key); setTimeout(() => setSaved(null), 2500); };

  const handleSaveProfile = () => {
    updateStaffProfile({ fullName: profileForm.fullName, email: profileForm.email, phone: profileForm.phone });
    setProfileEdit(false); flashSaved('profile');
  };

  // 🟢 NEW: Actually upload the image to your SQLite Backend
  const handleSaveAvatar = async () => {
    if (!pendingFile) return;
    
    toast.loading("Uploading profile picture...", { id: 'avatar-upload' });
    try {
      const formData = new FormData();
      formData.append('image', pendingFile);

      const res = await fetch('http://localhost:3001/api/images', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to upload image');
      const data = await res.json();

      updateStaffProfile({ avatarImg: data.url });
      setAvatarImg(data.url);
      
      // 🟢 FIX: Synchronize the image change across the entire application instantly
      const targetUser = staffUsers.find(u => u.username === staffProfile.username);
      if (targetUser) {
          updateStaffUser(targetUser.id, { avatarImg: data.url });
      }

      setPendingAvatar(null);
      setPendingFile(null);
      
      toast.success("Profile picture updated!", { id: 'avatar-upload' });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to update profile picture.", { id: 'avatar-upload' });
    }
  };

  const handleSaveSecurity = async () => {
    setSecError('');
    if (!secForm.currentPassword) { setSecError('Enter your current password to confirm changes.'); return; }
    
    const hashedCurrent = await hashPassword(secForm.currentPassword);
    const targetUser = staffUsers.find(u => u.username === staffProfile.username);
    
    if (targetUser?.password !== hashedCurrent) { 
      setSecError('Current password is incorrect.'); 
      return; 
    }
    
    if (secForm.newPassword) {
      if (!pwStrength.isValid) { setSecError('New password does not meet security requirements.'); return; }
      if (secForm.newPassword !== secForm.confirmPassword) { setSecError('New passwords do not match.'); return; }
    }

    const hashedNew = secForm.newPassword ? await hashPassword(secForm.newPassword) : undefined;

    updateStaffProfile({
      username: secForm.username || staffProfile.username,
      ...(hashedNew ? { password: hashedNew } : {}),
    });
    
    setSecEdit(false);
    setSecForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
    flashSaved('security');
  };

  const tabs: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'profile',  label: 'Profile',  icon: User },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 flex items-center gap-5">
        
        {/* Profile Picture Block */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative group w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden border border-neutral-800 bg-neutral-900">
            <img 
              src={pendingAvatar || (avatarImg ? (avatarImg.startsWith('http') ? avatarImg : `http://localhost:3001${avatarImg}`) : logoImg)} 
              onError={(e) => { e.currentTarget.src = logoImg; }}
              alt="Profile Avatar" 
              className="w-full h-full object-cover" 
            />
            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity">
              <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { setPendingFile(file); setPendingAvatar(URL.createObjectURL(file)); } }} />
              <UploadCloud size={16} className="text-white mb-1" />
              <span className="text-[10px] text-white font-semibold">Change</span>
            </label>
          </div>
          {pendingAvatar && (
            <div className="flex gap-1.5">
              <button onClick={handleSaveAvatar} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-2 py-1 rounded font-bold transition-all"><CheckCircle size={10} /> Save</button>
              <button onClick={() => { setPendingAvatar(null); setPendingFile(null); }} className="flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] px-2 py-1 rounded font-bold transition-all"><X size={10} /> Cancel</button>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-neutral-100">{staffProfile.fullName}</h2>
          <p className="text-sm text-neutral-400 font-medium">{staffProfile.role} · @{staffProfile.username}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-md flex items-center gap-1.5"><Mail size={10} /> {staffProfile.email}</span>
          </div>
        </div>
        {saved && <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-700/40 text-emerald-400 text-xs px-3 py-2 rounded-xl animate-in fade-in"><CheckCircle size={13} /> Changes saved!</div>}
      </div>

      <div className="flex gap-1 bg-neutral-950 border border-neutral-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeSection === tab.id ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-600/20' : 'text-neutral-500 hover:text-neutral-300'}`}>
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
             {[{ label: 'Total Actions', val: stats.total, icon: BarChart2, color: 'text-emerald-500' }, { label: 'Bookings', val: stats.reservations, icon: CalendarCheck, color: 'text-blue-500' }, { label: 'POS Orders', val: stats.posOrders, icon: ShoppingCart, color: 'text-amber-500' }, { label: 'Tables Seated', val: stats.tablesAssigned, icon: LayoutGrid, color: 'text-purple-500' }].map((s, i) => (
               <div key={i} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                 <div className="flex justify-between items-start mb-2"><p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">{s.label}</p><s.icon size={14} className={s.color} /></div>
                 <p className="text-3xl font-black text-white">{s.val}</p>
               </div>
             ))}
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden p-6">
            <h3 className="text-sm font-bold text-neutral-100 mb-4 flex items-center gap-2"><Clock size={16} className="text-emerald-500" /> Your Recent Activity</h3>
            <div className="space-y-3">
              {userActivities.length === 0 ? <p className="text-xs text-neutral-500 italic">No recent activity found.</p> : userActivities.slice(0, 5).map(act => (
                <div key={act.id} className="flex items-start gap-3 p-3 bg-neutral-900 border border-neutral-800/60 rounded-xl hover:border-neutral-700 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-neutral-300 font-medium mb-1">{act.description.replace(/\s*\(Action by:.*?\)/, '')}</p>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                      <span className="uppercase tracking-wider font-bold bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700">{act.type.replace('_', ' ')}</span>
                      <span>{formatDistanceToNow(new Date(act.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'profile' && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
            <div><h3 className="text-sm font-bold text-neutral-100">Personal Information</h3><p className="text-xs text-neutral-500 mt-0.5">Your display name, contact, and role details</p></div>
            {!profileEdit ? <button onClick={() => { setProfileEdit(true); setProfileForm({ fullName: staffProfile.fullName, email: staffProfile.email, phone: staffProfile.phone, role: staffProfile.role }); }} className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800 border border-neutral-700 px-3 py-1.5 rounded-lg"><Pencil size={12} /> Edit</button> : <button onClick={() => setProfileEdit(false)} className="flex items-center gap-1.5 text-xs text-neutral-500 px-3 py-1.5 rounded-lg"><X size={12} /> Cancel</button>}
          </div>
          <div className="p-6 space-y-4">
            <FieldRow icon={User} label="Full Name" value={staffProfile.fullName} editing={profileEdit} input={<input type="text" value={profileForm.fullName} onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-600/50" />} />
            <FieldRow icon={Mail} label="Email Address" value={staffProfile.email} editing={profileEdit} input={<input type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-600/50" />} />
            <FieldRow icon={Phone} label="Phone Number" value={staffProfile.phone} editing={profileEdit} input={<input type="tel" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-600/50" />} />
            <FieldRow icon={Tag} label="Role / Position" value={staffProfile.role} editing={false} input={null} />
            <FieldRow icon={Calendar} label="Date Joined" value={new Date(staffProfile.joinedDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} editing={false} input={null} />
            {profileEdit && (
              <div className="pt-2 flex items-center justify-between">
                <p className="text-[10px] text-amber-500/80 italic">* Role updates must be requested from the Administrator.</p>
                <button onClick={handleSaveProfile} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl font-semibold"><Save size={14} /> Save Changes</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'security' && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
            <div><h3 className="text-sm font-bold text-neutral-100">Login Credentials</h3><p className="text-xs text-neutral-500 mt-0.5">Manage your username and password</p></div>
            {!secEdit ? <button onClick={() => { setSecEdit(true); setSecError(''); setSecForm(f => ({ ...f, username: staffProfile.username })); }} className="flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-800 border border-neutral-700 px-3 py-1.5 rounded-lg"><Pencil size={12} /> Edit</button> : <button onClick={() => { setSecEdit(false); setSecError(''); }} className="flex items-center gap-1.5 text-xs text-neutral-500 px-3 py-1.5 rounded-lg"><X size={12} /> Cancel</button>}
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center mt-1"><User size={16} className="text-neutral-400" /></div>
              <div className="flex-1">
                <p className="text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">Username</p>
                {secEdit ? <input type="text" value={secForm.username} onChange={e => setSecForm(f => ({ ...f, username: e.target.value }))} className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-600/50" /> : <p className="text-sm text-neutral-200 font-semibold">@{staffProfile.username}</p>}
              </div>
            </div>

            {secEdit && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3 mt-2">
                <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Change Password</p>
                
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Current Password <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input type={showPw.current ? 'text' : 'password'} value={secForm.currentPassword} onChange={e => setSecForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="Your current password" className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 pr-10 py-2 text-sm text-neutral-100" />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(s => ({ ...s, current: !s.current }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">{showPw.current ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">New Password</label>
                  <div className="relative">
                    <input type={showPw.new ? 'text' : 'password'} value={secForm.newPassword} onChange={e => setSecForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Leave blank to keep current" className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 pr-10 py-2 text-sm text-neutral-100" />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(s => ({ ...s, new: !s.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">{showPw.new ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                  </div>
                  {secForm.newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-neutral-800/50">
                        <div className={`h-full ${pwStrength.score >= 1 ? pwStrength.color : 'bg-transparent'} transition-all w-1/3`} />
                        <div className={`h-full ${pwStrength.score >= 2 ? pwStrength.color : 'bg-transparent'} transition-all w-1/3`} />
                        <div className={`h-full ${pwStrength.score >= 3 ? pwStrength.color : 'bg-transparent'} transition-all w-1/3`} />
                      </div>
                      <p className={`text-[10px] ${pwStrength.isValid ? 'text-emerald-500' : 'text-neutral-500'}`}>Requires 8+ characters, letters, and numbers.</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <input type={showPw.confirm ? 'text' : 'password'} value={secForm.confirmPassword} onChange={e => setSecForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Re-enter new password" className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 pr-10 py-2 text-sm text-neutral-100" />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">{showPw.confirm ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                  </div>
                </div>
                {secError && <div className="flex items-center gap-2 bg-rose-950/50 border border-rose-800/40 text-rose-400 text-xs px-3 py-2.5 rounded-xl"><AlertTriangle size={13} className="flex-shrink-0" />{secError}</div>}
              </div>
            )}
            {secEdit && (
              <div className="pt-1 flex justify-end">
                <button onClick={handleSaveSecurity} disabled={secForm.newPassword ? !pwStrength.isValid : false} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-sm rounded-xl font-semibold"><Save size={14} /> Save Credentials</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ icon: Icon, label, value, editing, input }: { icon: React.ElementType; label: string; value: string; editing: boolean; input: React.ReactNode; }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center mt-1"><Icon size={16} className="text-neutral-400" /></div>
      <div className="flex-1">
        <p className="text-xs text-neutral-500 mb-1.5 font-medium uppercase tracking-wider">{label}</p>
        {editing && input ? input : <p className="text-sm text-neutral-200 font-semibold">{value || '—'}</p>}
      </div>
    </div>
  );
}