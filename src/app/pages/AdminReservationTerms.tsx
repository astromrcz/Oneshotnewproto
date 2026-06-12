import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { FileText, Save, CheckCircle, Info } from 'lucide-react';

export function AdminReservationTerms() {
  const { reservationTerms, updateReservationTerms } = useAppContext();
  const [form, setForm] = useState({ ...reservationTerms });
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'policy' | 'tnc'>('rules');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateReservationTerms(form);
    setSaved(true);
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

      <form onSubmit={handleSave} className="space-y-4">
        {/* Booking Rules */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Minimum Hours', field: 'minHours' as const, min: 1, max: 12 },
                { label: 'Maximum Hours', field: 'maxHours' as const, min: 1, max: 24 },
                { label: 'Min Party Size', field: 'minPartySize' as const, min: 1, max: 10 },
                { label: 'Max Party Size', field: 'maxPartySize' as const, min: 1, max: 50 },
              ].map(f => (
                <div key={f.field} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                  <label className="text-xs text-neutral-400 uppercase tracking-wider font-medium block mb-2">{f.label}</label>
                  <input type="number" value={form[f.field]} min={f.min} max={f.max}
                    onChange={e => setForm(prev => ({ ...prev, [f.field]: parseInt(e.target.value) || f.min }))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors" />
                  <p className="text-lg font-black text-amber-400 mt-2">{form[f.field]}</p>
                </div>
              ))}
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <label className="text-xs text-neutral-400 uppercase tracking-wider font-medium block mb-2">
                Cancellation Notice (hours)
              </label>
              <input type="number" value={form.cancellationHours} min={1} max={168}
                onChange={e => setForm(prev => ({ ...prev, cancellationHours: parseInt(e.target.value) || 1 }))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 transition-colors" />
              <p className="text-[11px] text-neutral-600 mt-2">Customers must cancel at least {form.cancellationHours} hours before their reservation.</p>
            </div>

            {/* Preview */}
            <div className="bg-neutral-950 border border-amber-900/30 rounded-xl p-4">
              <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-3">Preview (shown to customers)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-neutral-900 rounded-lg p-2 text-center">
                  <p className="text-amber-400 font-black">{form.minHours}–{form.maxHours} hrs</p>
                  <p className="text-neutral-600">Duration range</p>
                </div>
                <div className="bg-neutral-900 rounded-lg p-2 text-center">
                  <p className="text-amber-400 font-black">{form.minPartySize}–{form.maxPartySize}</p>
                  <p className="text-neutral-600">Party size</p>
                </div>
                <div className="bg-neutral-900 rounded-lg p-2 text-center">
                  <p className="text-amber-400 font-black">{form.cancellationHours}hrs</p>
                  <p className="text-neutral-600">Cancel window</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Policy */}
        {activeTab === 'policy' && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
            <label className="text-xs text-neutral-400 uppercase tracking-wider font-medium block mb-3">
              Cancellation Policy Text
            </label>
            <textarea
              value={form.cancellationPolicy}
              onChange={e => setForm(prev => ({ ...prev, cancellationPolicy: e.target.value }))}
              rows={6}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20 transition-colors resize-none"
              placeholder="Describe the cancellation policy..."
            />
            <p className="text-[10px] text-neutral-600 mt-2">This text is shown in the reservation summary and confirmation emails.</p>
          </div>
        )}

        {/* Terms & Conditions */}
        {activeTab === 'tnc' && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
            <label className="text-xs text-neutral-400 uppercase tracking-wider font-medium block mb-3">
              Terms & Conditions
            </label>
            <textarea
              value={form.termsAndConditions}
              onChange={e => setForm(prev => ({ ...prev, termsAndConditions: e.target.value }))}
              rows={12}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-200 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/20 transition-colors resize-none font-mono text-xs leading-relaxed"
              placeholder="Enter full terms and conditions..."
            />
            <p className="text-[10px] text-neutral-600 mt-2">Customers must agree to these terms during the reservation process. Use numbered lines for clarity.</p>
          </div>
        )}

        <button type="submit"
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-amber-900/30">
          <Save size={15} /> Save Terms
        </button>
      </form>
    </div>
  );
}
