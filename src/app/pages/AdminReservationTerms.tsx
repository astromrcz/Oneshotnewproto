import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, CheckCircle, Info, AlertCircle, X, Calendar } from 'lucide-react';

export function AdminReservationTerms() {
  const { reservationTerms, updateReservationTerms, rates, updateRates } = useAppContext();
  
  // Separate the form states to match the database context correctly
  const [termsForm, setTermsForm] = useState({ ...reservationTerms });
  const [ratesForm, setRatesForm] = useState({ 
    reservationStartTime: rates.reservationStartTime, 
    reservationEndTime: rates.reservationEndTime 
  });
  
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'policy' | 'tnc'>('rules');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setTermsForm({ ...reservationTerms });
    setRatesForm({ reservationStartTime: rates.reservationStartTime, reservationEndTime: rates.reservationEndTime });
  }, [reservationTerms, rates]);

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirmSave = () => {
    // Save both contexts properly
    updateReservationTerms(termsForm);
    updateRates({ reservationStartTime: ratesForm.reservationStartTime, reservationEndTime: ratesForm.reservationEndTime });
    
    setSaved(true);
    setShowConfirm(false);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {saved && (
        <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-700/40 text-emerald-400 text-sm px-4 py-3 rounded-xl">
          <CheckCircle size={15} /> Reservation terms updated successfully!
        </div>
      )}

      <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 flex items-start gap-3">
        <Info size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-600/80 leading-relaxed">
          These settings govern reservation rules displayed to customers during the booking flow. Changes apply to all new reservations immediately.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-950 border border-neutral-800 rounded-xl p-1">
        {([
          { id: 'rules',  label: 'Booking Rules' },
          { id: 'policy', label: 'Cancellation Policy' },
          { id: 'tnc',    label: 'Terms & Conditions' },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSaveClick} className="space-y-4">
        {/* Booking Rules */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            
            {/* Online Reservation Hours (Connected to RatesContext) */}
            <div>
              <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
                <Calendar size={12} className="text-amber-500" /> Online Reservation Hours
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                  <label className="block text-xs text-neutral-400 font-medium uppercase tracking-wider mb-3">Start Accepting At</label>
                  <input type="time" value={ratesForm.reservationStartTime} onChange={e => setRatesForm(f => ({ ...f, reservationStartTime: e.target.value }))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50" />
                </div>
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                  <label className="block text-xs text-neutral-400 font-medium uppercase tracking-wider mb-3">Stop Accepting At</label>
                  <input type="time" value={ratesForm.reservationEndTime} onChange={e => setRatesForm(f => ({ ...f, reservationEndTime: e.target.value }))} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Minimum Hours', field: 'minHours' as const },
                { label: 'Maximum Hours', field: 'maxHours' as const },
                { label: 'Min Party Size', field: 'minPartySize' as const },
                { label: 'Max Party Size', field: 'maxPartySize' as const },
              ].map(f => (
                <div key={f.field} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                  <label className="text-xs text-neutral-400 uppercase tracking-wider font-medium block mb-2">{f.label}</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={termsForm[f.field] === 0 ? '' : termsForm[f.field]}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setTermsForm(prev => ({ ...prev, [f.field]: val ? parseInt(val, 10) : 0 }));
                    }}
                    placeholder="0"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors" 
                  />
                </div>
              ))}
            </div>
            
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <label className="text-xs text-neutral-400 uppercase tracking-wider font-medium block mb-2">
                Cancellation Refund Validity (hours)
              </label>
              <input 
                type="text" 
                inputMode="numeric"
                value={termsForm.cancellationHours === 0 ? '' : termsForm.cancellationHours}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setTermsForm(prev => ({ ...prev, cancellationHours: val ? parseInt(val, 10) : 0 }));
                }}
                placeholder="0"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors" 
              />
              <p className="text-[11px] text-neutral-600 mt-2">
                Customers can cancel their reservation at any time, but down payments are only refundable if canceled at least <strong>{termsForm.cancellationHours} hours</strong> before the scheduled time.
              </p>
            </div>
          </div>
        )}

        {/* Cancellation Policy */}
        {activeTab === 'policy' && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
            <label className="text-xs text-neutral-400 uppercase tracking-wider font-medium block mb-3">
              Cancellation & Refund Policy Text
            </label>
            <textarea
              value={termsForm.cancellationPolicy}
              onChange={e => setTermsForm(prev => ({ ...prev, cancellationPolicy: e.target.value }))}
              rows={6}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors resize-none"
              placeholder="Describe the cancellation policy..."
            />
          </div>
        )}

        {/* Terms & Conditions */}
        {activeTab === 'tnc' && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
            <label className="text-xs text-neutral-400 uppercase tracking-wider font-medium block mb-3">
              Terms & Conditions
            </label>
            <textarea
              value={termsForm.termsAndConditions}
              onChange={e => setTermsForm(prev => ({ ...prev, termsAndConditions: e.target.value }))}
              rows={12}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors resize-none font-mono text-xs leading-relaxed"
              placeholder="Enter full terms and conditions..."
            />
          </div>
        )}

        <button type="submit" className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-amber-900/30">
          <Save size={15} /> Save Terms
        </button>
      </form>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center flex-none">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-500" />
                <h2 className="text-base font-bold text-neutral-100">Confirm Changes</h2>
              </div>
              <button onClick={() => setShowConfirm(false)} className="p-2 text-neutral-500 hover:text-white rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 space-y-3">
                <p className="text-sm text-neutral-400 font-semibold">Summary of Updates:</p>
                {reservationTerms.minHours !== termsForm.minHours && <div className="text-sm"><span className="text-neutral-500">Min Hours updated</span></div>}
                {reservationTerms.maxHours !== termsForm.maxHours && <div className="text-sm"><span className="text-neutral-500">Max Hours updated</span></div>}
                {rates.reservationStartTime !== ratesForm.reservationStartTime && <div className="text-sm"><span className="text-neutral-500">Reservation Start Time updated to: <span className="text-emerald-400">{ratesForm.reservationStartTime}</span></span></div>}
                {rates.reservationEndTime !== ratesForm.reservationEndTime && <div className="text-sm"><span className="text-neutral-500">Reservation End Time updated to: <span className="text-emerald-400">{ratesForm.reservationEndTime}</span></span></div>}
                <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3 mt-3">
                  <p className="text-[10px] text-amber-600/80">These changes will immediately reflect on the customer booking portal.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-800 flex gap-3 flex-none">
              <button onClick={() => setShowConfirm(false)} className="flex-1 px-4 py-2.5 bg-neutral-800 text-neutral-300 text-sm rounded-xl">Cancel</button>
              <button onClick={handleConfirmSave} className="flex-1 px-4 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2"><CheckCircle size={14} /> Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}