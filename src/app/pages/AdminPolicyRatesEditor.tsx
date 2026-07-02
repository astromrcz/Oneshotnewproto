import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';
import { 
  Save, Clock, DollarSign, Users, AlertCircle, ShieldCheck, 
  Calendar, FileText, ToggleLeft, ToggleRight, SlidersHorizontal, X
} from 'lucide-react';

export default function AdminPolicyRatesEditor() {
  const { rates, reservationTerms, updateRates, updateReservationTerms } = useAppContext();

  // Local state for forms
  const [ratesForm, setRatesForm] = useState({ ...rates, onlineCapacityLimit: rates.onlineCapacityLimit ?? 70 });
  const [termsForm, setTermsForm] = useState(reservationTerms);
  
  // State for the confirmation modal
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Sync state if context loads late
  useEffect(() => {
    setRatesForm({ ...rates, onlineCapacityLimit: rates.onlineCapacityLimit ?? 70 });
    setTermsForm(reservationTerms);
  }, [rates, reservationTerms]);

  // Standard handler for text strings and time inputs
  const handleRatesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setRatesForm(prev => ({
      ...prev,
      [name]: type === 'range' ? Number(value) : value
    }));
  };

  // Custom handler for text inputs that should only accept numbers
  const handleRatesTextNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(/\D/g, ''); // Strip non-digits
    setRatesForm(prev => ({ ...prev, [name]: cleanValue === '' ? '' : Number(cleanValue) }));
  };

  const handleTermsTextNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(/\D/g, ''); // Strip non-digits
    setTermsForm(prev => ({ ...prev, [name]: cleanValue === '' ? '' : Number(cleanValue) }));
  };

  const handleTermsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTermsForm(prev => ({ ...prev, [name]: value }));
  };

  // 1. Validates data, then OPENS the confirmation modal instead of saving directly
  const handleReviewChanges = () => {
    const downPaymentPercent = Number(ratesForm.downPaymentPercent);

    // Run Validations
    if (termsForm.minPartySize > termsForm.maxPartySize) {
      toast.error('Validation Failed: Min party size cannot exceed Max party size.');
      return;
    }

    if (!Number.isFinite(downPaymentPercent) || downPaymentPercent > 100) {
      toast.error('Validation Failed: Down payment cannot exceed 100%.');
      return;
    }
    
    // Open the summary modal
    setShowSummaryModal(true);
  };

  // 2. Executes the actual save after the user clicks "Confirm & Save" in the modal
  const executeSave = () => {
    const downPaymentPercent = Number(ratesForm.downPaymentPercent);

    if (!Number.isFinite(downPaymentPercent) || downPaymentPercent > 100) {
      toast.error('Validation Failed: Down payment cannot exceed 100%.');
      return;
    }

    updateRates(ratesForm);
    updateReservationTerms(termsForm);
    setShowSummaryModal(false);
    toast.success("Policies and Rates successfully updated!");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-end border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-widest">POLICY & RATES</h1>
          <p className="text-sm text-neutral-400 mt-1">Manage pricing, operating hours, and booking rules.</p>
        </div>
        <button 
          onClick={handleReviewChanges}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
        >
          <Save size={20} /> Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ======================================= */}
        {/* LEFT COLUMN: RATES & LIMITS             */}
        {/* ======================================= */}
        <div className="space-y-8">
          
          {/* Base Rates & Hours */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <DollarSign className="text-emerald-500" /> Base Rates & Store Hours
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Standard Hourly Rate (₱)</label>
                <input type="text" inputMode="numeric" name="hourlyRate" value={ratesForm.hourlyRate} onChange={handleRatesTextNumber} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Overtime Rate (₱)</label>
                <input type="text" inputMode="numeric" name="overtimeRate" value={ratesForm.overtimeRate} onChange={handleRatesTextNumber} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Store Opens</label>
                <input type="time" style={{ colorScheme: 'dark' }} name="reservationStartTime" value={ratesForm.reservationStartTime} onChange={handleRatesChange} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Store Closes</label>
                <input type="time" style={{ colorScheme: 'dark' }} name="reservationEndTime" value={ratesForm.reservationEndTime} onChange={handleRatesChange} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-emerald-500 outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Down Payment % Required</label>
                <input type="text" inputMode="numeric" name="downPaymentPercent" value={ratesForm.downPaymentPercent} onChange={handleRatesTextNumber} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-emerald-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Happy Hour Controls */}
          <div className={`border rounded-xl p-6 transition-colors ${ratesForm.isHappyHourActive ? 'bg-neutral-900 border-emerald-900/50' : 'bg-neutral-950 border-neutral-800 opacity-70'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className={ratesForm.isHappyHourActive ? "text-emerald-500" : "text-neutral-500"} /> 
                Happy Hour Promotion
              </h2>
              <button 
                onClick={() => setRatesForm(prev => ({ ...prev, isHappyHourActive: !prev.isHappyHourActive }))}
                className="flex items-center gap-2 text-sm font-bold"
              >
                {ratesForm.isHappyHourActive ? (
                  <><span className="text-emerald-500">ACTIVE</span> <ToggleRight size={32} className="text-emerald-500" /></>
                ) : (
                  <><span className="text-neutral-500">HIDDEN</span> <ToggleLeft size={32} className="text-neutral-600" /></>
                )}
              </button>
            </div>
            
            <div className={`grid grid-cols-3 gap-4 ${!ratesForm.isHappyHourActive && 'pointer-events-none'}`}>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Promo Rate (₱)</label>
                <input type="text" inputMode="numeric" name="happyHourRate" value={ratesForm.happyHourRate} onChange={handleRatesTextNumber} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Start Time</label>
                <input type="time" style={{ colorScheme: 'dark' }} name="happyHourStart" value={ratesForm.happyHourStart} onChange={handleRatesChange} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">End Time</label>
                <input type="time" style={{ colorScheme: 'dark' }} name="happyHourEnd" value={ratesForm.happyHourEnd} onChange={handleRatesChange} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-emerald-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Boundaries & Limitations */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <SlidersHorizontal className="text-emerald-500" /> Booking Constraints
            </h2>
            
            {/* Dynamic Capacity Slider */}
            <div className="mb-8">
              <label className="block text-xs text-neutral-400 mb-4 uppercase tracking-wider flex justify-between items-center">
                <span>Online Reservation Limit</span>
                <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/50 px-3 py-1 rounded-full text-sm">
                  {ratesForm.onlineCapacityLimit}%
                </span>
              </label>
              <input 
                type="range" 
                name="onlineCapacityLimit"
                min="0" 
                max="100" 
                step="10" 
                value={ratesForm.onlineCapacityLimit} 
                onChange={handleRatesChange} 
                className="w-full accent-emerald-500 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer" 
              />
              <div className="flex justify-between text-[10px] text-neutral-500 mt-2 font-semibold uppercase">
                <span>All Walk-ins</span>
                <span>Balanced</span>
                <span>100% Booking</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Min Party Size</label>
                <input type="text" inputMode="numeric" name="minPartySize" value={termsForm.minPartySize} onChange={handleTermsTextNumber} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Max Party Size</label>
                <input type="text" inputMode="numeric" name="maxPartySize" value={termsForm.maxPartySize} onChange={handleTermsTextNumber} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-emerald-500 outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================= */}
        {/* RIGHT COLUMN: POLICIES & PREVIEW        */}
        {/* ======================================= */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <FileText className="text-emerald-500" /> Content Editor
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Cancellation Grace Period (Hours)</label>
                <input type="text" inputMode="numeric" name="cancellationHours" value={termsForm.cancellationHours} onChange={handleTermsTextNumber} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Booking Policies (Displayed in Step 2)</label>
                <textarea name="cancellationPolicy" value={termsForm.cancellationPolicy} onChange={handleTermsChange} rows={4} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-emerald-500 outline-none resize-none" placeholder="E.g. No refunds on same-day cancellations..." />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">General Terms & Conditions</label>
                <textarea name="termsAndConditions" value={termsForm.termsAndConditions} onChange={handleTermsChange} rows={3} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-emerald-500 outline-none resize-none" placeholder="General establishment rules..." />
              </div>
            </div>
          </div>

          {/* Live UI Preview */}
          <div>
            <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider flex items-center gap-2"><ShieldCheck size={14}/> Customer View Preview (Step 2 Card)</p>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <h3 className="text-lg font-bold text-white mb-4">Booking Policies & Terms</h3>
              
              <ul className="space-y-4">
                <li className="flex gap-3 text-neutral-300">
                  <AlertCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{termsForm.cancellationPolicy || "No policy defined."}</p>
                </li>
                <li className="flex gap-3 text-neutral-300">
                  <Clock size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">Cancellations must be made at least <span className="font-bold text-white">{termsForm.cancellationHours} hours</span> in advance.</p>
                </li>
                <li className="flex gap-3 text-neutral-300">
                  <FileText size={18} className="text-neutral-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-wrap italic">{termsForm.termsAndConditions}</p>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* ======================================= */}
      {/* CONFIRMATION MODAL POP-UP               */}
      {/* ======================================= */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-neutral-900/80 border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-500" /> Review Changes
              </h3>
              <button onClick={() => setShowSummaryModal(false)} className="text-neutral-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <p className="text-sm text-neutral-400">Please confirm the following updates to your establishment's policies and rates:</p>
              
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-sm space-y-3 text-neutral-300">
                <div className="flex justify-between border-b border-neutral-800/60 pb-3">
                  <span className="text-neutral-500">Base Rate</span>
                  <span className="font-bold text-emerald-400">₱{ratesForm.hourlyRate} / hour</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800/60 pb-3">
                  <span className="text-neutral-500">Store Hours</span>
                  <span className="font-bold text-white">{ratesForm.reservationStartTime} — {ratesForm.reservationEndTime}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800/60 pb-3">
                  <span className="text-neutral-500">Online Capacity</span>
                  <span className="font-bold text-white">{ratesForm.onlineCapacityLimit}% of Tables</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800/60 pb-3">
                  <span className="text-neutral-500">Down Payment</span>
                  <span className="font-bold text-white">{ratesForm.downPaymentPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Cancellation Policy</span>
                  <span className="font-bold text-white">{termsForm.cancellationHours} hours prior</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowSummaryModal(false)}
                  className="flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-sm font-semibold transition-colors border border-neutral-800"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeSave}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                >
                  <Save size={16} /> Confirm & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}