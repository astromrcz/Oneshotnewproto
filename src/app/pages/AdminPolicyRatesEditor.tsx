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
  const [ratesForm, setRatesForm] = useState({ 
    ...rates, 
    weekdayOnlineCapacityLimit: rates.weekdayOnlineCapacityLimit ?? 70,
    weekendOnlineCapacityLimit: rates.weekendOnlineCapacityLimit ?? 70
  });
  const [termsForm, setTermsForm] = useState(reservationTerms);
  
  // State for the confirmation modal
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Sync state if context loads late
  useEffect(() => {
    setRatesForm({ 
      ...rates, 
      weekdayOnlineCapacityLimit: rates.weekdayOnlineCapacityLimit ?? 70,
      weekendOnlineCapacityLimit: rates.weekendOnlineCapacityLimit ?? 70
    });
    setTermsForm(reservationTerms);
  }, [rates, reservationTerms]);

  // Helpers for time formatting
  const parseToMins = (t: string) => {
    const [hh = '0', mm = '0'] = (t || '').split(':');
    return Number(hh) * 60 + Number(mm || 0);
  };

  const fmt12 = (tOrMins: string | number) => {
    try {
      let mins: number;
      if (typeof tOrMins === 'number') mins = tOrMins;
      else {
        const [hh = '0', mm = '0'] = (tOrMins || '').split(':');
        mins = Number(hh) * 60 + Number(mm || 0);
      }
      const m = ((mins % (24 * 60)) + (24 * 60)) % (24 * 60);
      let hh = Math.floor(m / 60);
      const mm = m % 60;
      const period = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12;
      if (hh === 0) hh = 12;
      return `${hh}:${String(mm).padStart(2, '0')} ${period}`;
    } catch (e) { return String(tOrMins); }
  };

  const bookingWindowDisplay = (start: string, end: string) => {
    try {
      const s = parseToMins(start || '12:00');
      let e = parseToMins(end || '02:00');
      if (e <= s) e += 24 * 60;
      const cutoff = e - 60; // 1 hour before close
      if (cutoff <= s) return 'No online bookings';
      return `${fmt12(start || '12:00')} to ${fmt12(cutoff)}`;
    } catch (e) {
      return `${start || '12:00'} to ${end || '02:00'}`;
    }
  };

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
    
    if (name === 'downPaymentPercent') {
      let num = cleanValue === '' ? '' : Number(cleanValue);
      if (num !== '' && num > 100) num = 100;
      setRatesForm(prev => ({ ...prev, [name]: num === '' ? '' : Number(num) }));
      return;
    }
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

    if (termsForm.weekdayMinPartySize > termsForm.weekdayMaxPartySize) {
      toast.error('Validation Failed: Weekday Min party size cannot exceed Max party size.');
      return;
    }

    if (termsForm.weekendMinPartySize > termsForm.weekendMaxPartySize) {
      toast.error('Validation Failed: Weekend Min party size cannot exceed Max party size.');
      return;
    }

    if (!Number.isFinite(downPaymentPercent) || downPaymentPercent > 100) {
      toast.error('Validation Failed: Down payment cannot exceed 100%.');
      return;
    }
    
    setShowSummaryModal(true);
  };

  // Refresh settings from local DB
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSentPayload, setLastSentPayload] = useState<any>(null);
  const [dbPayload, setDbPayload] = useState<any>(null);
  
  const refreshFromDB = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('http://localhost:3001/api/settings/rates');
      if (!res.ok) throw new Error('Failed to fetch from DB');
      const data = await res.json();
      
      setRatesForm(prev => ({ 
        ...prev, 
        ...data, 
        // Fallbacks injected here in case DB returns undefined for new split keys
        weekdayOnlineCapacityLimit: data.weekdayOnlineCapacityLimit ?? prev.weekdayOnlineCapacityLimit,
        weekendOnlineCapacityLimit: data.weekendOnlineCapacityLimit ?? prev.weekendOnlineCapacityLimit,
        isWeekdayHappyHourActive: data.isWeekdayHappyHourActive ?? false,
        isWeekendHappyHourActive: data.isWeekendHappyHourActive ?? false
      }));
      setTermsForm(prev => ({ ...prev, ...data }));
      setDbPayload(data);
      toast.success('Refreshed settings from local database');
    } catch (e) {
      console.error('Refresh failed', e);
      toast.error('Failed to refresh from DB. Is the local server running?');
    } finally {
      setIsRefreshing(false);
    }
  };

  // 2. Executes the actual save after the user clicks "Confirm & Save" in the modal
  const [isSaving, setIsSaving] = useState(false);
  const executeSave = async () => {
    try {
      setIsSaving(true);
      
      // 🚨 STRICT PAYLOAD SEPARATION
      // We manually extract only the specific keys for rates and terms.
      // This prevents the overlapping forms from overwriting each other in the database.
      const ratesPayload = {
        hourlyRate: ratesForm.hourlyRate,
        overtimeRate: ratesForm.overtimeRate,
        downPaymentPercent: ratesForm.downPaymentPercent,
        weekdayStartTime: ratesForm.weekdayStartTime,
        weekdayEndTime: ratesForm.weekdayEndTime,
        isWeekdayHappyHourActive: ratesForm.isWeekdayHappyHourActive,
        weekdayHappyHourRate: ratesForm.weekdayHappyHourRate,
        weekdayHappyHourStart: ratesForm.weekdayHappyHourStart,
        weekdayHappyHourEnd: ratesForm.weekdayHappyHourEnd,
        weekdayOnlineCapacityLimit: ratesForm.weekdayOnlineCapacityLimit,
        weekendStartTime: ratesForm.weekendStartTime,
        weekendEndTime: ratesForm.weekendEndTime,
        isWeekendHappyHourActive: ratesForm.isWeekendHappyHourActive,
        weekendHappyHourRate: ratesForm.weekendHappyHourRate,
        weekendHappyHourStart: ratesForm.weekendHappyHourStart,
        weekendHappyHourEnd: ratesForm.weekendHappyHourEnd,
        weekendOnlineCapacityLimit: ratesForm.weekendOnlineCapacityLimit,
      };

      const termsPayload = {
        minHours: termsForm.minHours,
        maxHours: termsForm.maxHours,
        cancellationHours: termsForm.cancellationHours,
        cancellationPolicy: termsForm.cancellationPolicy,
        termsAndConditions: termsForm.termsAndConditions,
        weekdayMinPartySize: termsForm.weekdayMinPartySize,
        weekdayMaxPartySize: termsForm.weekdayMaxPartySize,
        weekendMinPartySize: termsForm.weekendMinPartySize,
        weekendMaxPartySize: termsForm.weekendMaxPartySize,
      };

      setLastSentPayload({ ...ratesPayload, ...termsPayload });
      
      // Send independently
      await updateRates(ratesPayload);
      await updateReservationTerms(termsPayload);
      
      await refreshFromDB();
      toast.success("Policies and Rates successfully updated!");
      setShowSummaryModal(false);
    } catch (e) {
      console.error('Save failed', e);
      toast.error('Failed to save settings to DB.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render Helper for the Expanded Dialog
  const truncate = (str: string) => str && str.length > 25 ? str.substring(0, 25) + '...' : str;
  const renderChangeRow = (label: string, oldVal: any, newVal: any, isCurrency: boolean = false) => {
    const format = (v: any) => {
      if (typeof v === 'boolean') return v ? 'Active' : 'Hidden';
      if (isCurrency) return `₱${v}`;
      return String(v || 'None');
    };
    
    const o = format(oldVal);
    const n = format(newVal);
    const changed = o !== n;

    return (
      <div className="flex justify-between border-b border-neutral-800/60 py-2 items-center">
        <span className="text-neutral-500 text-xs">{label}</span>
        <div className="text-right max-w-[200px] truncate">
          {!changed ? (
            <span className="text-neutral-400 text-xs italic">{n} <span className="text-neutral-600 text-[10px] ml-1">(unchanged)</span></span>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <span className="text-neutral-500 line-through text-[10px]">{o}</span>
              <span className="text-amber-400 font-bold text-xs">{n}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-end border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-widest">POLICY & RATES</h1>
          <p className="text-sm text-neutral-400 mt-1">Manage pricing, operating hours, and booking rules for weekdays and weekends.</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={refreshFromDB} className={`px-4 py-2 rounded-lg border ${isRefreshing ? 'bg-neutral-800/60 border-amber-600 text-amber-300' : 'bg-neutral-900 border-neutral-800 text-neutral-300'}`}>
            {isRefreshing ? 'Refreshing…' : 'Refresh from DB'}
          </button>
          <button 
            type="button"
            onClick={handleReviewChanges}
            className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
          >
            <Save size={20} /> Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: RATES & LIMITS */}
        <div className="space-y-8">
          
          {/* Base Rates & Hours */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <DollarSign className="text-amber-500" /> Base Rates & Store Hours
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Standard Hourly Rate (₱)</label>
                <input type="text" inputMode="numeric" name="hourlyRate" value={ratesForm.hourlyRate} onChange={handleRatesTextNumber} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Overtime Rate (₱)</label>
                <input type="text" inputMode="numeric" name="overtimeRate" value={ratesForm.overtimeRate} onChange={handleRatesTextNumber} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-amber-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 p-4 bg-neutral-950 rounded-lg border border-neutral-800/50 mb-4">
              {/* Weekdays */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-amber-400 border-b border-neutral-800 pb-2">WEEKDAYS (Mon-Thu)</h3>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Store Opens</label>
                  <input type="time" style={{ colorScheme: 'dark' }} name="weekdayStartTime" value={ratesForm.weekdayStartTime} onChange={handleRatesChange} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Store Closes</label>
                  <input type="time" style={{ colorScheme: 'dark' }} name="weekdayEndTime" value={ratesForm.weekdayEndTime} onChange={handleRatesChange} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-amber-500 outline-none" />
                </div>
              </div>

              {/* Weekends */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-amber-400 border-b border-neutral-800 pb-2">WEEKENDS (Fri-Sun)</h3>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Store Opens</label>
                  <input type="time" style={{ colorScheme: 'dark' }} name="weekendStartTime" value={ratesForm.weekendStartTime} onChange={handleRatesChange} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Store Closes</label>
                  <input type="time" style={{ colorScheme: 'dark' }} name="weekendEndTime" value={ratesForm.weekendEndTime} onChange={handleRatesChange} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-amber-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Down Payment % Required (All Days)</label>
              <input type="text" inputMode="numeric" name="downPaymentPercent" value={ratesForm.downPaymentPercent} onChange={handleRatesTextNumber} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-amber-500 outline-none" />
            </div>
          </div>

          {/* Happy Hour Controls */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Clock className="text-amber-500" /> Happy Hour Promotions
            </h2>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Weekday Happy Hour */}
              <div className={`p-4 rounded-lg border transition-colors ${ratesForm.isWeekdayHappyHourActive ? 'bg-neutral-950 border-amber-900/50' : 'bg-neutral-950 border-neutral-800 opacity-70'}`}>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-amber-400">WEEKDAYS</span>
                  <button type="button" onClick={() => setRatesForm(prev => ({ ...prev, isWeekdayHappyHourActive: !prev.isWeekdayHappyHourActive }))}>
                    {ratesForm.isWeekdayHappyHourActive ? <ToggleRight size={28} className="text-amber-500" /> : <ToggleLeft size={28} className="text-neutral-600" />}
                  </button>
                </div>
                <div className={`space-y-4 ${!ratesForm.isWeekdayHappyHourActive && 'pointer-events-none'}`}>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1 uppercase">Promo Rate (₱)</label>
                    <input type="text" inputMode="numeric" name="weekdayHappyHourRate" value={ratesForm.weekdayHappyHourRate} onChange={handleRatesTextNumber} className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-amber-500 outline-none" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-neutral-400 mb-1 uppercase">Start</label>
                      <input type="time" style={{ colorScheme: 'dark' }} name="weekdayHappyHourStart" value={ratesForm.weekdayHappyHourStart} onChange={handleRatesChange} className="w-full bg-black border border-neutral-800 rounded p-2 text-white outline-none" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-neutral-400 mb-1 uppercase">End</label>
                      <input type="time" style={{ colorScheme: 'dark' }} name="weekdayHappyHourEnd" value={ratesForm.weekdayHappyHourEnd} onChange={handleRatesChange} className="w-full bg-black border border-neutral-800 rounded p-2 text-white outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekend Happy Hour */}
              <div className={`p-4 rounded-lg border transition-colors ${ratesForm.isWeekendHappyHourActive ? 'bg-neutral-950 border-amber-900/50' : 'bg-neutral-950 border-neutral-800 opacity-70'}`}>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-amber-400">WEEKENDS</span>
                  <button type="button" onClick={() => setRatesForm(prev => ({ ...prev, isWeekendHappyHourActive: !prev.isWeekendHappyHourActive }))}>
                    {ratesForm.isWeekendHappyHourActive ? <ToggleRight size={28} className="text-amber-500" /> : <ToggleLeft size={28} className="text-neutral-600" />}
                  </button>
                </div>
                <div className={`space-y-4 ${!ratesForm.isWeekendHappyHourActive && 'pointer-events-none'}`}>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1 uppercase">Promo Rate (₱)</label>
                    <input type="text" inputMode="numeric" name="weekendHappyHourRate" value={ratesForm.weekendHappyHourRate} onChange={handleRatesTextNumber} className="w-full bg-black border border-neutral-800 rounded p-2 text-white focus:border-amber-500 outline-none" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-neutral-400 mb-1 uppercase">Start</label>
                      <input type="time" style={{ colorScheme: 'dark' }} name="weekendHappyHourStart" value={ratesForm.weekendHappyHourStart} onChange={handleRatesChange} className="w-full bg-black border border-neutral-800 rounded p-2 text-white outline-none" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-neutral-400 mb-1 uppercase">End</label>
                      <input type="time" style={{ colorScheme: 'dark' }} name="weekendHappyHourEnd" value={ratesForm.weekendHappyHourEnd} onChange={handleRatesChange} className="w-full bg-black border border-neutral-800 rounded p-2 text-white outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Boundaries & Limitations */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <SlidersHorizontal className="text-amber-500" /> Booking Constraints
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Weekdays */}
              <div>
                <h3 className="text-sm font-bold text-amber-400 border-b border-neutral-800 pb-2 mb-4">WEEKDAYS</h3>
                <div className="mb-6">
                  <label className="block text-xs text-neutral-400 mb-2 uppercase tracking-wider flex justify-between items-center">
                    <span>Capacity Limit</span>
                    <span className="text-amber-400 font-bold bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded-full text-xs">
                      {ratesForm.weekdayOnlineCapacityLimit}%
                    </span>
                  </label>
                  <input type="range" name="weekdayOnlineCapacityLimit" min="0" max="100" step="10" value={ratesForm.weekdayOnlineCapacityLimit} onChange={handleRatesChange} className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] text-neutral-400 mb-1 uppercase">Min Party</label>
                    <input type="text" inputMode="numeric" name="weekdayMinPartySize" value={termsForm.weekdayMinPartySize} onChange={handleTermsTextNumber} className="w-full bg-black border border-neutral-800 rounded p-2 text-white outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-neutral-400 mb-1 uppercase">Max Party</label>
                    <input type="text" inputMode="numeric" name="weekdayMaxPartySize" value={termsForm.weekdayMaxPartySize} onChange={handleTermsTextNumber} className="w-full bg-black border border-neutral-800 rounded p-2 text-white outline-none" />
                  </div>
                </div>
              </div>

              {/* Weekends */}
              <div>
                <h3 className="text-sm font-bold text-amber-400 border-b border-neutral-800 pb-2 mb-4">WEEKENDS</h3>
                <div className="mb-6">
                  <label className="block text-xs text-neutral-400 mb-2 uppercase tracking-wider flex justify-between items-center">
                    <span>Capacity Limit</span>
                    <span className="text-amber-400 font-bold bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded-full text-xs">
                      {ratesForm.weekendOnlineCapacityLimit}%
                    </span>
                  </label>
                  <input type="range" name="weekendOnlineCapacityLimit" min="0" max="100" step="10" value={ratesForm.weekendOnlineCapacityLimit} onChange={handleRatesChange} className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] text-neutral-400 mb-1 uppercase">Min Party</label>
                    <input type="text" inputMode="numeric" name="weekendMinPartySize" value={termsForm.weekendMinPartySize} onChange={handleTermsTextNumber} className="w-full bg-black border border-neutral-800 rounded p-2 text-white outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-neutral-400 mb-1 uppercase">Max Party</label>
                    <input type="text" inputMode="numeric" name="weekendMaxPartySize" value={termsForm.weekendMaxPartySize} onChange={handleTermsTextNumber} className="w-full bg-black border border-neutral-800 rounded p-2 text-white outline-none" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: POLICIES & PREVIEW */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <FileText className="text-amber-500" /> Content Editor
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Cancellation Grace Period (Hours)</label>
                <input type="text" inputMode="numeric" name="cancellationHours" value={termsForm.cancellationHours} onChange={handleTermsTextNumber} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Booking Policies (Displayed in Step 2)</label>
                <textarea name="cancellationPolicy" value={termsForm.cancellationPolicy} onChange={handleTermsChange} rows={4} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-amber-500 outline-none resize-none" placeholder="E.g. No refunds on same-day cancellations..." />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">General Terms & Conditions</label>
                <textarea name="termsAndConditions" value={termsForm.termsAndConditions} onChange={handleTermsChange} rows={3} className="w-full bg-black border border-neutral-800 rounded p-3 text-white focus:border-amber-500 outline-none resize-none" placeholder="General establishment rules..." />
              </div>
            </div>
          </div>

          {/* Live UI Preview */}
          <div>
            <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider flex items-center gap-2"><ShieldCheck size={14}/> Customer View Preview</p>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
              <h3 className="text-lg font-bold text-white mb-4">Booking Policies & Terms</h3>
              
              <ul className="space-y-4">
                <li className="flex gap-3 text-neutral-300">
                  <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{termsForm.cancellationPolicy || "No policy defined."}</p>
                    <p className="text-xs text-neutral-400 mt-2">Minimum booking: <span className="text-white font-bold">{termsForm.minHours} hour(s)</span></p>
                  </div>
                </li>
                
                <li className="flex gap-3 text-neutral-300">
                  <Clock size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="w-full">
                    <div className="grid grid-cols-2 gap-4 bg-neutral-900/50 p-3 rounded border border-neutral-800">
                      <div>
                        <p className="text-[10px] uppercase text-amber-400 font-bold mb-1">Weekday Setup</p>
                        <p className="text-xs text-neutral-400">Hours: <span className="text-white">{fmt12(ratesForm.weekdayStartTime)} - {fmt12(ratesForm.weekdayEndTime)}</span></p>
                        <p className="text-xs text-neutral-400">Booking: <span className="text-white">{bookingWindowDisplay(ratesForm.weekdayStartTime, ratesForm.weekdayEndTime)}</span></p>
                        <p className="text-xs text-neutral-400">Limits: <span className="text-white">{ratesForm.weekdayOnlineCapacityLimit}% Cap | {termsForm.weekdayMinPartySize}-{termsForm.weekdayMaxPartySize} Pax</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-amber-400 font-bold mb-1">Weekend Setup</p>
                        <p className="text-xs text-neutral-400">Hours: <span className="text-white">{fmt12(ratesForm.weekendStartTime)} - {fmt12(ratesForm.weekendEndTime)}</span></p>
                        <p className="text-xs text-neutral-400">Booking: <span className="text-white">{bookingWindowDisplay(ratesForm.weekendStartTime, ratesForm.weekendEndTime)}</span></p>
                        <p className="text-xs text-neutral-400">Limits: <span className="text-white">{ratesForm.weekendOnlineCapacityLimit}% Cap | {termsForm.weekendMinPartySize}-{termsForm.weekendMaxPartySize} Pax</span></p>
                      </div>
                    </div>
                    <p className="text-sm mt-3">Down payment required: <span className="font-bold text-white">{ratesForm.downPaymentPercent ?? 25}%</span></p>
                  </div>
                </li>
                
                <li className="flex gap-3 text-neutral-300">
                  <FileText size={18} className="text-neutral-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-wrap italic">{termsForm.termsAndConditions}</p>
                </li>
              </ul>
            </div>
          </div>

          {/* Debug Panel */}
          <div className="mt-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-xs text-neutral-400 hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-neutral-200">Debug: Last Sent / DB Stored</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-bold text-neutral-300 mb-1">Last Sent</div>
                <pre className="whitespace-pre-wrap break-words text-[11px] bg-black/40 p-2 rounded text-neutral-300">{lastSentPayload ? JSON.stringify(lastSentPayload, null, 2) : '—'}</pre>
              </div>
              <div>
                <div className="font-bold text-neutral-300 mb-1">DB Stored</div>
                <pre className="whitespace-pre-wrap break-words text-[11px] bg-black/40 p-2 rounded text-neutral-300">{dbPayload ? JSON.stringify(dbPayload, null, 2) : '—'}</pre>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* CONFIRMATION MODAL POP-UP */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-neutral-900/80 border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-500" /> Review Changes
              </h3>
              <button type="button" onClick={() => setShowSummaryModal(false)} className="text-neutral-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <p className="text-sm text-neutral-400">Please confirm the following updates to your establishment's policies and rates:</p>
              
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-sm space-y-1 text-neutral-300 max-h-[50vh] overflow-y-auto">
                {/* Base */}
                {renderChangeRow('Base Hourly Rate', rates.hourlyRate, ratesForm.hourlyRate, true)}
                {renderChangeRow('Overtime Rate', rates.overtimeRate, ratesForm.overtimeRate, true)}
                {renderChangeRow('Down Payment', `${rates.downPaymentPercent}%`, `${ratesForm.downPaymentPercent}%`)}
                
                {/* Weekday */}
                <div className="pt-3 pb-1 mt-2 border-t border-neutral-800/60 font-bold text-amber-400 text-[10px] uppercase tracking-widest">Weekday Setup</div>
                {renderChangeRow('Store Hours', `${fmt12(rates.weekdayStartTime)} - ${fmt12(rates.weekdayEndTime)}`, `${fmt12(ratesForm.weekdayStartTime)} - ${fmt12(ratesForm.weekdayEndTime)}`)}
                {renderChangeRow('Happy Hour Status', rates.isWeekdayHappyHourActive, ratesForm.isWeekdayHappyHourActive)}
                {renderChangeRow('Happy Hour Window', `${fmt12(rates.weekdayHappyHourStart)} - ${fmt12(rates.weekdayHappyHourEnd)}`, `${fmt12(ratesForm.weekdayHappyHourStart)} - ${fmt12(ratesForm.weekdayHappyHourEnd)}`)}
                {renderChangeRow('Happy Hour Rate', rates.weekdayHappyHourRate, ratesForm.weekdayHappyHourRate, true)}
                {renderChangeRow('Online Capacity', `${rates.weekdayOnlineCapacityLimit}%`, `${ratesForm.weekdayOnlineCapacityLimit}%`)}
                {renderChangeRow('Min/Max Party Size', `${reservationTerms.weekdayMinPartySize}-${reservationTerms.weekdayMaxPartySize}`, `${termsForm.weekdayMinPartySize}-${termsForm.weekdayMaxPartySize}`)}

                {/* Weekend */}
                <div className="pt-3 pb-1 mt-2 border-t border-neutral-800/60 font-bold text-amber-400 text-[10px] uppercase tracking-widest">Weekend Setup</div>
                {renderChangeRow('Store Hours', `${fmt12(rates.weekendStartTime)} - ${fmt12(rates.weekendEndTime)}`, `${fmt12(ratesForm.weekendStartTime)} - ${fmt12(ratesForm.weekendEndTime)}`)}
                {renderChangeRow('Happy Hour Status', rates.isWeekendHappyHourActive, ratesForm.isWeekendHappyHourActive)}
                {renderChangeRow('Happy Hour Window', `${fmt12(rates.weekendHappyHourStart)} - ${fmt12(rates.weekendHappyHourEnd)}`, `${fmt12(ratesForm.weekendHappyHourStart)} - ${fmt12(ratesForm.weekendHappyHourEnd)}`)}
                {renderChangeRow('Happy Hour Rate', rates.weekendHappyHourRate, ratesForm.weekendHappyHourRate, true)}
                {renderChangeRow('Online Capacity', `${rates.weekendOnlineCapacityLimit}%`, `${ratesForm.weekendOnlineCapacityLimit}%`)}
                {renderChangeRow('Min/Max Party Size', `${reservationTerms.weekendMinPartySize}-${reservationTerms.weekendMaxPartySize}`, `${termsForm.weekendMinPartySize}-${termsForm.weekendMaxPartySize}`)}

                {/* Policies */}
                <div className="pt-3 pb-1 mt-2 border-t border-neutral-800/60 font-bold text-amber-400 text-[10px] uppercase tracking-widest">Policies</div>
                {renderChangeRow('Cancellation Grace', `${reservationTerms.cancellationHours} Hrs`, `${termsForm.cancellationHours} Hrs`)}
                {renderChangeRow('Cancellation Policy', truncate(reservationTerms.cancellationPolicy), truncate(termsForm.cancellationPolicy))}
                {renderChangeRow('T&C Text', truncate(reservationTerms.termsAndConditions), truncate(termsForm.termsAndConditions))}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-sm font-semibold transition-colors border border-neutral-800"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={executeSave}
                  disabled={isSaving}
                  className={`flex-1 px-4 py-3 ${isSaving ? 'bg-neutral-700 cursor-wait text-neutral-300' : 'bg-amber-600 hover:bg-amber-500 text-white'} rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30`}
                >
                  {isSaving ? 'Saving…' : (<><Save size={16} /> Confirm & Save</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}