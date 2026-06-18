import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { DollarSign, Save, CheckCircle, Info, AlertCircle, X, Calendar } from 'lucide-react';

export function AdminRates() {
  const { rates, updateRates } = useAppContext();
  const [form, setForm] = useState({ ...rates });
  const [saved, setSaved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirmSave = () => {
    updateRates(form);
    setSaved(true);
    setShowConfirm(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const NumField = ({ label, field, unit, hint }: {
    label: string; field: keyof typeof form; unit?: string; hint?: string;
  }) => (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
      <label className="block text-xs text-neutral-400 font-medium uppercase tracking-wider mb-3">{label}</label>
      <div className="flex items-center gap-3">
        {unit && <span className="text-neutral-500 text-sm font-semibold">{unit}</span>}
        <input
          type="text"
          inputMode="numeric"
          value={form[field] === 0 ? '' : form[field] as number}
          onChange={e => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            setForm(f => ({ ...f, [field]: val ? parseInt(val, 10) : 0 }));
          }}
          placeholder="0"
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20 transition-colors"
        />
      </div>
      {hint && <p className="text-[10px] text-neutral-600 mt-2">{hint}</p>}
      <p className="text-lg font-black text-amber-400 mt-2">
        {typeof form[field] === 'number'
          ? (field === 'downPaymentPercent' ? `${form[field]}%` : `₱${(form[field] as number).toLocaleString()}`)
          : form[field] as string}
      </p>
    </div>
  );

  

  return (
    <div className="space-y-5 max-w-3xl">
      {saved && (
        <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-700/40 text-emerald-400 text-sm px-4 py-3 rounded-xl">
          <CheckCircle size={15} /> Rates updated and applied immediately!
        </div>
      )}

      <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 flex items-start gap-3">
        <Info size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-600/80 leading-relaxed">
          Changes here update live rates for new sessions, reservation pricing calculations, and payment summaries across the entire system.
        </p>
      </div>

      <form onSubmit={handleSaveClick} className="space-y-5">
        {/* Table Rates */}
        <div>
          <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
            <DollarSign size={12} className="text-amber-500" /> Table Rental Rates
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <NumField label="Standard Hourly Rate" field="hourlyRate" unit="₱" hint="Applied to all regular table sessions" />
            <NumField label="Happy Hour Rate" field="happyHourRate" unit="₱" hint="Applied during happy hour window (walk-in only)" />
            <NumField label="Overtime Rate" field="overtimeRate" unit="₱" hint="Charged per hour beyond booked duration" />
          </div>
        </div>

        {/* Happy Hour Times */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">Happy Hour Window</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Status</span>
              <div 
                onClick={() => setForm(f => ({ ...f, isHappyHourActive: !f.isHappyHourActive }))}
                className={`w-10 h-5 rounded-full relative transition-colors ${form.isHappyHourActive ? 'bg-emerald-500' : 'bg-neutral-700'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isHappyHourActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </label>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity ${!form.isHappyHourActive ? 'opacity-40 pointer-events-none' : ''}`}>
            <TimeField label="Happy Hour Start" field="happyHourStart" hint="Walk-in sessions only during this window" />
            <TimeField label="Happy Hour End" field="happyHourEnd" />
          </div>
          <div className="mt-2 bg-neutral-950 border border-neutral-800 rounded-xl p-3">
            <p className="text-xs text-neutral-400">
              Current happy hour: <span className={form.isHappyHourActive ? "text-amber-400 font-semibold" : "text-neutral-500 line-through"}>{form.happyHourStart} – {form.happyHourEnd}</span>
               · Rate: <span className={form.isHappyHourActive ? "text-amber-400 font-semibold" : "text-neutral-500 line-through"}>₱{form.happyHourRate}/hr</span>
            </p>
          </div>
        </div>

        

        {/* Other Fees */}
        <div>
          <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-3">Bookings & Deposits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumField label="Reservation Down Payment %" field="downPaymentPercent" hint="Percentage of total reservation amount required upfront" />
          </div>
        </div>

        {/* Rate Preview */}
        <div className="bg-neutral-950 border border-amber-900/30 rounded-xl p-5">
          <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-4">Rate Preview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '1-hour session', value: `₱${form.hourlyRate}` },
              { label: '2-hour session', value: `₱${form.hourlyRate * 2}` },
              { label: '3-hour session', value: `₱${form.hourlyRate * 3}` },
              { label: 'Happy hour (1hr)', value: `₱${form.happyHourRate}` },
            ].map(p => (
              <div key={p.label} className="bg-neutral-900 rounded-lg p-3 text-center">
                <p className="text-sm font-black text-amber-300">{p.value}</p>
                <p className="text-[10px] text-neutral-600 mt-1">{p.label}</p>
              </div>
            ))}
          </div>
        </div>

        <button type="submit"
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-amber-900/30">
          <Save size={15} /> Save Rate Changes
        </button>
      </form>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-5 border-b border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-500" />
                <h2 className="text-base font-bold text-neutral-100">Confirm Rate Changes</h2>
              </div>
              <button onClick={() => setShowConfirm(false)} className="p-2 text-neutral-500 hover:text-white rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 space-y-3">
                <p className="text-sm text-neutral-400 font-semibold">Summary of Changes:</p>
                {rates.hourlyRate !== form.hourlyRate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Hourly Rate:</span>
                    <span><span className="text-rose-400 line-through">₱{rates.hourlyRate}</span> → <span className="text-emerald-400 font-semibold">₱{form.hourlyRate}</span></span>
                  </div>
                )}
                {rates.happyHourRate !== form.happyHourRate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Happy Hour Rate:</span>
                    <span><span className="text-rose-400 line-through">₱{rates.happyHourRate}</span> → <span className="text-emerald-400 font-semibold">₱{form.happyHourRate}</span></span>
                  </div>
                )}
                {rates.overtimeRate !== form.overtimeRate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Overtime Rate:</span>
                    <span><span className="text-rose-400 line-through">₱{rates.overtimeRate}</span> → <span className="text-emerald-400 font-semibold">₱{form.overtimeRate}</span></span>
                  </div>
                )}
                {rates.happyHourStart !== form.happyHourStart && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Happy Hour Start:</span>
                    <span><span className="text-rose-400 line-through">{rates.happyHourStart}</span> → <span className="text-emerald-400 font-semibold">{form.happyHourStart}</span></span>
                  </div>
                )}
                {rates.happyHourEnd !== form.happyHourEnd && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Happy Hour End:</span>
                    <span><span className="text-rose-400 line-through">{rates.happyHourEnd}</span> → <span className="text-emerald-400 font-semibold">{form.happyHourEnd}</span></span>
                  </div>
                )}
                {rates.downPaymentPercent !== form.downPaymentPercent && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Down Payment %:</span>
                    <span><span className="text-rose-400 line-through">{rates.downPaymentPercent}%</span> → <span className="text-emerald-400 font-semibold">{form.downPaymentPercent}%</span></span>
                  </div>
                )}
              </div>
              <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3">
                <p className="text-xs text-amber-600/80">These changes will be applied immediately to all new sessions and reservations.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-800 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle size={14} /> Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}