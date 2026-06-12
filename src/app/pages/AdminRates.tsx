import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { DollarSign, Save, CheckCircle, Info } from 'lucide-react';

export function AdminRates() {
  const { rates, updateRates } = useAppContext();
  const [form, setForm] = useState({ ...rates });
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateRates(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const NumField = ({ label, field, unit, min, max, step, hint }: {
    label: string; field: keyof typeof form; unit?: string; min: number; max: number; step?: number; hint?: string;
  }) => (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
      <label className="block text-xs text-neutral-400 font-medium uppercase tracking-wider mb-3">{label}</label>
      <div className="flex items-center gap-3">
        {unit && <span className="text-neutral-500 text-sm font-semibold">{unit}</span>}
        <input
          type="number" value={form[field] as number}
          onChange={e => setForm(f => ({ ...f, [field]: parseFloat(e.target.value) || 0 }))}
          min={min} max={max} step={step || 1}
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

  const TimeField = ({ label, field, hint }: { label: string; field: 'happyHourStart' | 'happyHourEnd'; hint?: string }) => (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
      <label className="block text-xs text-neutral-400 font-medium uppercase tracking-wider mb-3">{label}</label>
      <input
        type="time" value={form[field]}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20 transition-colors"
      />
      {hint && <p className="text-[10px] text-neutral-600 mt-2">{hint}</p>}
      <p className="text-lg font-black text-amber-400 mt-2">{form[field]}</p>
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

      <form onSubmit={handleSave} className="space-y-5">
        {/* Table Rates */}
        <div>
          <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-3 flex items-center gap-2">
            <DollarSign size={12} className="text-amber-500" /> Table Rental Rates
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <NumField label="Standard Hourly Rate" field="hourlyRate" unit="₱" min={50} max={2000} step={25} hint="Applied to all regular table sessions" />
            <NumField label="Happy Hour Rate" field="happyHourRate" unit="₱" min={50} max={2000} step={25} hint="Applied during happy hour window (walk-in only)" />
            <NumField label="Overtime Rate" field="overtimeRate" unit="₱" min={50} max={2000} step={25} hint="Charged per hour beyond booked duration" />
          </div>
        </div>

        {/* Happy Hour Times */}
        <div>
          <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-3">Happy Hour Window</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TimeField label="Happy Hour Start" field="happyHourStart" hint="Walk-in sessions only during this window" />
            <TimeField label="Happy Hour End" field="happyHourEnd" />
          </div>
          <div className="mt-2 bg-neutral-950 border border-neutral-800 rounded-xl p-3">
            <p className="text-xs text-neutral-400">
              Current happy hour: <span className="text-amber-400 font-semibold">{form.happyHourStart} – {form.happyHourEnd}</span>
              &nbsp;· Rate: <span className="text-amber-400 font-semibold">₱{form.happyHourRate}/hr</span>
            </p>
          </div>
        </div>

        {/* Other Fees */}
        <div>
          <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-3">Bookings & Deposits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumField label="Reservation Down Payment %" field="downPaymentPercent" min={10} max={100} step={5} hint="Percentage of total reservation amount required upfront" />
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
    </div>
  );
}
