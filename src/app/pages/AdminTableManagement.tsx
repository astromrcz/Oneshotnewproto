import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Plus, X, Pencil, Table2, CheckCircle, AlertTriangle,
  ToggleLeft, ToggleRight, PowerOff, Power, Wrench,
} from 'lucide-react';

export function AdminTableManagement() {
  const { tables, addTable, updateTable, toggleTableActive, setTableMaintenance, freeTable } = useAppContext();

  const [newName, setNewName]         = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editName, setEditName]       = useState('');
  const [toast, setToast]             = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{ tableId: string; tableName: string; targetActive: boolean } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [filter, setFilter]           = useState<'all' | 'active' | 'inactive'>('all');
  const [maintenanceModal, setMaintenanceModal] = useState<{ tableId: string; tableName: string } | null>(null);
  const [maintenanceReasonInput, setMaintenanceReasonInput] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const flash = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const isDuplicate = tables.some(
      t => t.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      flash(`A table named "${trimmedName}" already exists.`, 'error');
      return;
    }

    addTable(trimmedName);
    setNewName('');
    setNewDescription('');
    setShowAddForm(false);
    flash(`Table "${trimmedName}" added!`);
  };

  const handleUpdate = (id: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;

    const isDuplicate = tables.some(
      t => t.id !== id && t.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      flash(`A table named "${trimmedName}" already exists.`, 'error');
      return;
    }

    updateTable(id, trimmedName);
    setEditingId(null);
    flash('Table renamed successfully.');
  };

  const openConfirmModal = (table: typeof tables[0]) => {
    if (table.status === 'occupied' && table.isActive) {
      flash('Cannot deactivate an occupied table.', 'error');
      return;
    }
    setConfirmModal({ tableId: table.id, tableName: table.name, targetActive: !table.isActive });
  };

  const handleConfirmToggle = async () => {
    if (!confirmModal) return;
    setIsConfirming(true);
    toggleTableActive(confirmModal.tableId);
    await new Promise(resolve => setTimeout(resolve, 600));
    flash(
      `"${confirmModal.tableName}" has been ${confirmModal.targetActive ? 'activated' : 'deactivated'}.`,
      'success'
    );
    setConfirmModal(null);
    setIsConfirming(false);
  };

  const STATUS_COLOR: Record<string, string> = {
    available:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    occupied:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
    reserved:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
    maintenance: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  const activeCount   = tables.filter(t => t.isActive).length;
  const inactiveCount = tables.filter(t => !t.isActive).length;
  const occupiedCount = tables.filter(t => t.status === 'occupied').length;

  const filtered = tables.filter(t => {
    if (filter === 'active')   return t.isActive;
    if (filter === 'inactive') return !t.isActive;
    return true;
  });

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`flex items-center gap-2.5 text-sm px-4 py-3 rounded-xl border animate-in fade-in ${
          toast.type === 'error'
            ? 'bg-rose-950/40 border-rose-700/40 text-rose-400'
            : 'bg-emerald-950/40 border-emerald-700/40 text-emerald-400'
        }`}>
          {toast.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Tables',   value: tables.length,  color: 'text-white' },
          { label: 'Active',         value: activeCount,    color: 'text-emerald-400' },
          { label: 'Inactive',       value: inactiveCount,  color: 'text-neutral-500' },
          { label: 'Occupied Now',   value: occupiedCount,  color: 'text-rose-400' },
        ].map(s => (
          <div key={s.label} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-neutral-950 border border-amber-900/30 rounded-xl overflow-hidden">
        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)} className="w-full px-5 py-4 flex items-center gap-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/20 transition-colors font-semibold text-sm">
            <Plus size={16} /> Add New Table
          </button>
        ) : (
          <div className="p-5">
            <h3 className="text-sm font-bold text-neutral-200 mb-4">New Table</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-neutral-400 font-medium">Table Name *</label>
                  <span className="text-[10px] text-neutral-600">{newName.length}/15</span>
                </div>
                {/* 🟢 FIXED: Limited table name to 15 characters */}
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  maxLength={15} 
                  placeholder="e.g. Table 11, VIP 1"
                  autoFocus
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-600/50"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-neutral-400 font-medium">Description</label>
                  <span className="text-[10px] text-neutral-600">{newDescription.length}/40</span>
                </div>
                {/* 🟢 FIXED: Limited table description to 40 characters */}
                <input
                  type="text"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  maxLength={40}
                  placeholder="e.g. Corner table, High-top"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-600/50"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowAddForm(false); setNewName(''); setNewDescription(''); }} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-sm font-semibold transition-all">Cancel</button>
                <button type="submit" disabled={!newName.trim()} className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"><Plus size={14} /> Add Table</button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-bold text-neutral-200">All Tables ({tables.length})</h3>
          <div className="flex gap-1.5">
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all capitalize ${filter === f ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:border-neutral-700'}`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-neutral-800/50">
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center"><Table2 size={28} className="mx-auto text-neutral-700 mb-2" /><p className="text-sm text-neutral-500">No tables found.</p></div>
          ) : filtered.map(t => (
            <div key={t.id} className={`px-5 py-3.5 flex items-center gap-4 transition-colors ${t.isActive ? 'hover:bg-neutral-900/30' : 'opacity-50 bg-neutral-900/10'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${t.isActive ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-900 border-neutral-800'}`}>
                <Table2 size={15} className={t.isActive ? 'text-neutral-400' : 'text-neutral-600'} />
              </div>

              {editingId === t.id ? (
                <div className="flex-1 flex items-center gap-2">
                  {/* 🟢 FIXED: Limited inline edit to 15 characters */}
                  <input
                    type="text" value={editName}
                    onChange={e => setEditName(e.target.value)}
                    maxLength={15}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdate(t.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                    className="flex-1 max-w-[200px] bg-neutral-900 border border-amber-600/50 rounded-lg px-3 py-1.5 text-sm text-neutral-200 focus:outline-none"
                  />
                  <span className="text-[10px] text-neutral-600 w-8">{editName.length}/15</span>
                  <button onClick={() => handleUpdate(t.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-950/30 rounded-lg"><CheckCircle size={15} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-neutral-500 hover:bg-neutral-800 rounded-lg"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${t.isActive ? 'text-neutral-200' : 'text-neutral-500 line-through'}`}>{t.name}</p>
                    {!t.isActive && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-600 border border-neutral-700">INACTIVE</span>}
                  </div>
                  {t.session && <p className="text-[11px] text-neutral-500 truncate">{t.session.customerName}</p>}
                </div>
              )}

              {t.isActive && (
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${STATUS_COLOR[t.status] || STATUS_COLOR.available}`}>
                    {t.status === 'maintenance' && <Wrench size={9} />}
                    {t.status}
                  </span>
                  {t.status === 'maintenance' && t.maintenanceReason && <span className="text-[9px] text-orange-500/70 max-w-[120px] truncate text-right">{t.maintenanceReason}</span>}
                </div>
              )}

              {editingId !== t.id && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {t.isActive && <button onClick={() => { setEditingId(t.id); setEditName(t.name); }} className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg"><Pencil size={13} /></button>}
                  {t.isActive && t.status !== 'maintenance' && <button onClick={() => { setMaintenanceModal({ tableId: t.id, tableName: t.name }); setMaintenanceReasonInput(''); }} className="p-1.5 text-neutral-500 hover:text-orange-400 hover:bg-orange-950/20 rounded-lg"><Wrench size={13} /></button>}
                  {t.isActive && t.status === 'maintenance' && <button onClick={() => { freeTable(t.id); flash(`"${t.name}" cleared from maintenance.`); }} className="p-1.5 text-orange-500 hover:text-emerald-400 hover:bg-emerald-950/20 rounded-lg"><CheckCircle size={13} /></button>}
                  <button onClick={() => openConfirmModal(t)} className={`p-1.5 rounded-lg transition-colors ${t.isActive ? 'text-neutral-500 hover:text-rose-400 hover:bg-rose-950/20' : 'text-neutral-600 hover:text-emerald-400 hover:bg-emerald-950/20'}`}>
                    {t.isActive ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-600/80 leading-relaxed">Tables cannot be permanently deleted. Deactivating a table hides it from the staff portal and prevents new sessions.</p>
      </div>

      {maintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-orange-800/40 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-orange-950/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center"><Wrench size={16} className="text-orange-400" /></div>
                <div><h2 className="text-base font-bold text-neutral-100">Set Maintenance</h2><p className="text-xs text-neutral-500">{maintenanceModal.tableName}</p></div>
              </div>
              <button onClick={() => setMaintenanceModal(null)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-neutral-400 font-medium">Reason for Maintenance</label>
                  <span className="text-[10px] text-neutral-600">{maintenanceReasonInput.length}/50</span>
                </div>
                {/* 🟢 FIXED: Limited maintenance reason to 50 characters */}
                <textarea
                  value={maintenanceReasonInput}
                  onChange={e => setMaintenanceReasonInput(e.target.value)}
                  maxLength={50}
                  placeholder="e.g. Torn felt, cue repair..."
                  rows={2}
                  autoFocus
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-orange-600/30 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setMaintenanceModal(null)} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">Cancel</button>
                <button onClick={() => { setTableMaintenance(maintenanceModal.tableId, maintenanceReasonInput || 'Under maintenance'); flash(`"${maintenanceModal.tableName}" set to maintenance.`); setMaintenanceModal(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-orange-700 hover:bg-orange-600 text-white shadow-lg flex items-center justify-center gap-2"><Wrench size={14} /> Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-amber-900/40 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${confirmModal.targetActive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
                  {confirmModal.targetActive ? <Power size={18} className="text-emerald-400" /> : <PowerOff size={18} className="text-rose-400" />}
                </div>
                <div><h2 className="text-base font-bold text-neutral-100">{confirmModal.targetActive ? 'Activate Table' : 'Deactivate Table'}</h2><p className="text-xs text-neutral-500">{confirmModal.tableName}</p></div>
              </div>
              <button onClick={() => setConfirmModal(null)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className={`rounded-xl p-3 text-xs border ${confirmModal.targetActive ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400/80' : 'bg-rose-950/20 border-rose-800/30 text-rose-400/80'}`}>
                {confirmModal.targetActive ? `"${confirmModal.tableName}" will be marked as active and visible to staff for session management.` : `"${confirmModal.tableName}" will be deactivated and hidden from staff. No new sessions can be started.`}
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setConfirmModal(null)} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">Cancel</button>
                <button onClick={handleConfirmToggle} disabled={isConfirming} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${confirmModal.targetActive ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-rose-700 hover:bg-rose-600 text-white'}`}>
                  {isConfirming ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</> : confirmModal.targetActive ? <><Power size={14} /> Activate Table</> : <><PowerOff size={14} /> Deactivate Table</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}