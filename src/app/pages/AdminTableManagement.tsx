import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Plus, X, Pencil, Table2, CheckCircle, AlertTriangle,
  PowerOff, Power, Wrench, MoreVertical
} from 'lucide-react';
import { PageLoader } from '../components/PageLoader';

const COMMON_MAINTENANCE_REASONS = [
  'Torn / Damaged Felt',
  'Cue / Cushion Repair Needed',
  'Table Leveling & Calibration',
  'Routine Cleaning / Sanitation',
  'Others (Specify below)'
];

export function AdminTableManagement() {
  const { tables, addTable, updateTable, setTableMaintenance, freeTable } = useAppContext() as any;

  const [newName, setNewName]               = useState('');
  const [showAddForm, setShowAddForm]       = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);

  const [editingId, setEditingId]           = useState<string | null>(null);
  const [editName, setEditName]             = useState('');
  const [toast, setToast]                   = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Dropdown menu state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Unified Deactivate / Maintenance Modal
  const [maintenanceModal, setMaintenanceModal] = useState<{
    tableId: string;
    tableName: string;
    targetActive: boolean;
  } | null>(null);
  const [selectedReason, setSelectedReason]   = useState<string>(COMMON_MAINTENANCE_REASONS[0]);
  const [customReason, setCustomReason]       = useState('');
  const [isConfirming, setIsConfirming]       = useState(false);

  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // 🟢 NEW: PageLoader state instead of window.location.reload()
  const [isLoading, setIsLoading]   = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('PROCESSING...');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const flash = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const isDuplicate = tables.some(
      (t: any) => t.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      flash(`A table named "${trimmedName}" already exists.`, 'error');
      return;
    }

    setIsSubmitting(true);
    
    // 🟢 Use PageLoader instead of reload
    setLoadingMsg('ADDING NEW TABLE...');
    setIsLoading(true);
    addTable(trimmedName);

    setNewName('');
    setShowAddForm(false);
    setIsSubmitting(false);

    setTimeout(() => {
      setIsLoading(false);
      flash(`Table "${trimmedName}" added!`);
    }, 800);
  };

  const handleUpdateName = (id: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;

    const isDuplicate = tables.some(
      (t: any) => t.id !== id && t.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      flash(`A table named "${trimmedName}" already exists.`, 'error');
      return;
    }

    updateTable(id, trimmedName);
    setEditingId(null);
    flash('Table renamed successfully.');
  };

  const handleConfirmMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceModal) return;

    const finalReason = selectedReason === 'Others (Specify below)'
      ? customReason.trim()
      : selectedReason;

    if (!finalReason) {
      flash('Please specify a maintenance reason.', 'error');
      return;
    }

    setIsConfirming(true);
    
    // 🟢 Use PageLoader instead of reload
    setLoadingMsg('UPDATING TABLE STATUS...');
    setIsLoading(true);

    setTableMaintenance(maintenanceModal.tableId, finalReason);

    await fetch(`http://localhost:3001/api/tables/${maintenanceModal.tableId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'maintenance',
        maintenanceReason: finalReason,
        isActive: maintenanceModal.targetActive ? 1 : 0
      })
    });

    setIsConfirming(false);
    setMaintenanceModal(null);
    setCustomReason('');

    setTimeout(() => {
      setIsLoading(false);
      flash(`"${maintenanceModal.tableName}" has been set to maintenance: ${finalReason}`);
    }, 800);
  };

  const handleReactivateTable = async (table: any) => {
    setOpenDropdownId(null);
    
    // 🟢 Use PageLoader instead of reload
    setLoadingMsg('REACTIVATING TABLE...');
    setIsLoading(true);

    freeTable(table.id);
    await fetch(`http://localhost:3001/api/tables/${table.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'available', maintenanceReason: '', isActive: 1 })
    });

    setTimeout(() => {
      setIsLoading(false);
      flash(`"${table.name}" is now active and available for guests.`);
    }, 800);
  };

  const STATUS_COLOR: Record<string, string> = {
    available:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    occupied:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
    reserved:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
    maintenance: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  const activeCount   = tables.filter((t: any) => t.isActive).length;
  const inactiveCount = tables.filter((t: any) => !t.isActive || t.status === 'maintenance').length;
  const occupiedCount = tables.filter((t: any) => t.status === 'occupied').length;

  const filtered = tables.filter((t: any) => {
    if (filter === 'active')   return t.isActive && t.status !== 'maintenance';
    if (filter === 'inactive') return !t.isActive || t.status === 'maintenance';
    return true;
  });

  return (
    <div className="relative space-y-5">
      {/* 🟢 eFootball 3D Loader Overlay */}
      <PageLoader isLoading={isLoading} message={loadingMsg} />

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
          { label: 'Total Tables',     value: tables.length,  color: 'text-white' },
          { label: 'Active',           value: activeCount,    color: 'text-emerald-400' },
          { label: 'In Maintenance',   value: inactiveCount,  color: 'text-orange-400' },
          { label: 'Occupied Now',     value: occupiedCount,  color: 'text-rose-400' },
        ].map(s => (
          <div key={s.label} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-neutral-950 border border-amber-900/30 rounded-xl overflow-hidden">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full px-5 py-4 flex items-center gap-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/20 transition-colors font-semibold text-sm"
          >
            <Plus size={16} /> Add New Table
          </button>
        ) : (
          <div className="p-5">
            <h3 className="text-sm font-bold text-neutral-200 mb-4">New Table</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-neutral-400 font-medium">Table Name *</label>
                  <span className="text-[10px] text-neutral-500 font-mono">{newName.length}/15</span>
                </div>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  maxLength={15}
                  placeholder="e.g. Table 11, VIP 1 (max 15 chars)"
                  autoFocus
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-600/50"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setNewName(''); }}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                >
                  {isSubmitting ? 'Saving Table...' : <><Plus size={14} /> Add Table</>}
                </button>
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
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all capitalize ${
                  filter === f
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {f === 'inactive' ? 'In Maintenance' : f}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-neutral-800/50">
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Table2 size={28} className="mx-auto text-neutral-700 mb-2" />
              <p className="text-sm text-neutral-500">No tables found.</p>
            </div>
          ) : filtered.map((t: any) => {
            const isMaintenance = t.status === 'maintenance' || !t.isActive;

            return (
              <div
                key={t.id}
                className={`px-5 py-3.5 flex items-center gap-4 transition-colors relative ${
                  openDropdownId === t.id ? 'z-50' : 'z-0'
                } ${
                  t.isActive && !isMaintenance
                    ? 'hover:bg-neutral-900/30'
                    : 'bg-neutral-900/20'
                }`}
              >
                {/* Table Icon Box */}
                <div className="flex-shrink-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                    t.isActive && !isMaintenance
                      ? 'bg-neutral-800 border-neutral-700 text-neutral-400'
                      : 'bg-orange-950/20 border-orange-900/40 text-orange-400'
                  }`}>
                    {isMaintenance ? <Wrench size={18} /> : <Table2 size={18} />}
                  </div>
                </div>

                {editingId === t.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      maxLength={15}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdateName(t.id); if (e.key === 'Escape') setEditingId(null); }}
                      autoFocus
                      className="flex-1 max-w-[200px] bg-neutral-900 border border-amber-600/50 rounded-lg px-3 py-1.5 text-sm text-neutral-200 focus:outline-none"
                    />
                    <span className="text-[10px] text-neutral-500 font-mono w-8">{editName.length}/15</span>
                    <button onClick={() => handleUpdateName(t.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-950/30 rounded-lg">
                      <CheckCircle size={15} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-neutral-500 hover:bg-neutral-800 rounded-lg">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate text-neutral-200">
                        {t.name}
                      </p>
                      {!t.isActive && t.status !== 'maintenance' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    {t.session && <p className="text-[11px] text-neutral-500 truncate">{t.session.customerName}</p>}
                  </div>
                )}

                {/* Status Badges - Always Visible Even Under Maintenance */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                    STATUS_COLOR[t.status] || STATUS_COLOR.available
                  }`}>
                    {t.status === 'maintenance' && <Wrench size={10} />}
                    {t.status}
                  </span>
                  {t.status === 'maintenance' && t.maintenanceReason && (
                    <span className="text-[11px] text-orange-400 max-w-[180px] truncate text-right font-medium">
                      {t.maintenanceReason}
                    </span>
                  )}
                </div>

                {/* Actions Dropdown Menu - Full Opacity & Always Above Adjacent Rows */}
                {editingId !== t.id && (
                  <div className="relative flex-shrink-0" ref={openDropdownId === t.id ? dropdownRef : null}>
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === t.id ? null : t.id)}
                      className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
                      title="Table Actions"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openDropdownId === t.id && (
                      <div className="absolute right-0 top-full mt-2 w-52 bg-neutral-950 border border-neutral-800 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 overflow-hidden py-1">
                        <button
                          onClick={() => {
                            setOpenDropdownId(null);
                            setEditingId(t.id);
                            setEditName(t.name);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs text-neutral-300 hover:bg-neutral-900 transition-colors flex items-center gap-2"
                        >
                          <Pencil size={13} className="text-amber-400" />
                          <span>Rename Table</span>
                        </button>

                        {t.status !== 'maintenance' ? (
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              if (t.status === 'occupied') {
                                flash('Cannot set an occupied table to maintenance.', 'error');
                                return;
                              }
                              setMaintenanceModal({ tableId: t.id, tableName: t.name, targetActive: false });
                              setSelectedReason(COMMON_MAINTENANCE_REASONS[0]);
                              setCustomReason('');
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs text-orange-400 hover:bg-orange-950/20 transition-colors flex items-center gap-2 border-t border-neutral-800/60"
                          >
                            <PowerOff size={13} />
                            <span>Set Maintenance / Disable</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivateTable(t)}
                            className="w-full px-4 py-2.5 text-left text-xs text-emerald-400 hover:bg-emerald-950/20 transition-colors flex items-center gap-2 border-t border-neutral-800/60"
                          >
                            <Power size={13} />
                            <span>Reactivate Table</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Unified Maintenance / Disable Modal */}
      {maintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-orange-800/40 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-orange-950/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <Wrench size={16} className="text-orange-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-100">Set Maintenance / Disable</h2>
                  <p className="text-xs text-neutral-500">{maintenanceModal.tableName}</p>
                </div>
              </div>
              <button onClick={() => setMaintenanceModal(null)} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmMaintenance} className="p-6 space-y-4">
              <p className="text-xs text-neutral-400 leading-relaxed">
                Select a reason below to mark this table for maintenance and disable new guest sessions.
              </p>

              <div className="space-y-2">
                {COMMON_MAINTENANCE_REASONS.map(reason => (
                  <label
                    key={reason}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      selectedReason === reason
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="maintenanceReason"
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="hidden"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {selectedReason === 'Others (Specify below)' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-neutral-400 font-semibold">Custom Maintenance Reason *</label>
                    <span className="text-[10px] text-neutral-500 font-mono">{customReason.length}/50</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder="Enter custom maintenance note (max 50 chars)"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceModal(null)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConfirming || (selectedReason === 'Others (Specify below)' && !customReason.trim())}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-orange-700 hover:bg-orange-600 text-white shadow-lg flex items-center justify-center gap-2"
                >
                  {isConfirming ? 'Saving...' : <><Wrench size={14} /> Confirm Disable</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}