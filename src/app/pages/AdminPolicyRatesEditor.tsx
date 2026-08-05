import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';
import { 
  Save, Clock, DollarSign, AlertCircle, ShieldCheck, 
  Calendar, FileText, ToggleLeft, ToggleRight, SlidersHorizontal, X,
  ShieldAlert, WifiOff
} from 'lucide-react';
import { PageLoader } from '../components/PageLoader';
import { supabase } from '../utils/supabase';

export default function AdminPolicyRatesEditor() {
  const { rates, reservationTerms, updateRates, updateReservationTerms, theme, isSystemOffline } = useAppContext();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [ratesForm, setRatesForm] = useState({ 
    ...rates, 
    weekdayOnlineCapacityLimit: rates.weekdayOnlineCapacityLimit ?? 70,
    weekendOnlineCapacityLimit: rates.weekendOnlineCapacityLimit ?? 70
  });
  const [termsForm, setTermsForm] = useState({
    ...reservationTerms,
    minHours: reservationTerms.minHours ?? 1,
    maxHours: reservationTerms.maxHours ?? 6,
  });
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Operational Defense State (Turnover Buffer & Event Lock Protection)
  const [turnoverBufferMins, setTurnoverBufferMins] = useState(15);
  const [maxRescheduleLimit, setMaxRescheduleLimit] = useState(2);
  const [eventLockProtection, setEventLockProtection] = useState(true);

  // INITIAL DUAL-FETCH ON MOUNT WITH TIMEOUT WATCHDOG
  useEffect(() => {
    let isMounted = true;
    const fetchPoliciesAndRates = async () => {
      setIsLoading(true);

      const timeoutId = setTimeout(() => {
        if (isMounted && (!navigator.onLine || isSystemOffline)) {
          toast.warning("No Internet Connection / Cloud Unreachable: Running on local database backup snapshot.", {
            duration: 6000,
            icon: <WifiOff className="text-amber-400" size={16} />
          });
        }
      }, 6000);

      try {
        const [localRes, cloudRes] = await Promise.allSettled([
          fetch('http://localhost:3001/api/settings/rates').then(r => r.ok ? r.json() : null),
          supabase.from('system_settings').select('*').then(res => res.data || null)
        ]);

        let mergedSettings: any = {};

        if (cloudRes.status === 'fulfilled' && cloudRes.value) {
          const cloudObj = cloudRes.value.reduce((acc: any, curr: any) => {
            let val = curr.setting_value || curr.settingValue;
            if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (!isNaN(val) && val.trim() !== '' && !val.includes(':')) val = Number(val);
            acc[curr.key_name || curr.keyName] = val;
            return acc;
          }, {});
          mergedSettings = { ...mergedSettings, ...cloudObj };
        }

        if (localRes.status === 'fulfilled' && localRes.value) {
          mergedSettings = { ...mergedSettings, ...localRes.value };
        }

        if (isMounted && Object.keys(mergedSettings).length > 0) {
          setRatesForm(prev => ({ ...prev, ...mergedSettings }));
          setTermsForm(prev => ({ ...prev, ...mergedSettings }));
        }
      } catch (err) {
        if (isMounted) {
          toast.error("Offline Mode: Unable to reach online server. Configured from local database.");
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setTimeout(() => setIsLoading(false), 400);
        }
      }
    };

    fetchPoliciesAndRates();
    return () => { isMounted = false; };
  }, []);

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
      const cutoff = e - 60; 
      if (cutoff <= s) return 'No online bookings';
      return `${fmt12(start || '12:00')} to ${fmt12(cutoff)}`;
    } catch (e) {
      return `${start || '12:00'} to ${end || '02:00'}`;
    }
  };

  const handleRatesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setRatesForm(prev => ({ ...prev, [name]: type === 'range' ? Number(value) : value }));
  };

  // STRICT 4-DIGIT RATE VALIDATOR (No symbols, max 4 digits, warns if > 1000)
  const handleRateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanDigits = value.replace(/\D/g, '').slice(0, 4);
    const numericValue = cleanDigits === '' ? '' : Number(cleanDigits);

    if (numericValue !== '' && Number(numericValue) > 1000) {
      toast.warning(`High Rate Warning: ₱${numericValue} exceeds standard ₱1,000/hr billing.`);
    }

    setRatesForm(prev => ({ ...prev, [name]: numericValue }));
  };

  // STRICT 2-DIGIT HOUR VALIDATOR (No symbols, max 2 digits)
  const handleHourInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanDigits = value.replace(/\D/g, '').slice(0, 2);
    const numericValue = cleanDigits === '' ? '' : Number(cleanDigits);

    setTermsForm(prev => ({ ...prev, [name]: numericValue }));
  };

  const handlePartySizeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanDigits = value.replace(/\D/g, '').slice(0, 2);
    setTermsForm(prev => ({ ...prev, [name]: cleanDigits === '' ? '' : Number(cleanDigits) }));
  };

  const handleDownPaymentInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanDigits = value.replace(/\D/g, '').slice(0, 3);
    let num = cleanDigits === '' ? '' : Number(cleanDigits);
    if (num !== '' && num > 100) num = 100;
    setRatesForm(prev => ({ ...prev, [name]: num }));
  };

  const handleTermsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTermsForm(prev => ({ ...prev, [name]: value }));
  };

  // 🟢 FIXED: Removed cancelHrs > advHrs check that was blocking existing DB values
  const handleReviewChanges = () => {
    const downPaymentPercent = Number(ratesForm.downPaymentPercent) || 0;
    const minWkDay = Number(termsForm.weekdayMinPartySize) || 1;
    const maxWkDay = Number(termsForm.weekdayMaxPartySize) || 10;
    const minWkEnd = Number(termsForm.weekendMinPartySize) || 1;
    const maxWkEnd = Number(termsForm.weekendMaxPartySize) || 10;
    const minHrs = Number(termsForm.minHours) || 1;
    const maxHrs = Number(termsForm.maxHours) || 8;
    const advHrs = Number(termsForm.advanceBookingHours) || 0;
    const cancelHrs = Number(termsForm.cancellationHours) || 0;

    if (minWkDay > maxWkDay) { toast.error('Weekday Min party size cannot exceed Max.'); return; }
    if (minWkEnd > maxWkEnd) { toast.error('Weekend Min party size cannot exceed Max.'); return; }
    if (minHrs > maxHrs) { toast.error('Minimum booking hours cannot exceed Maximum booking hours.'); return; }
    if (!Number.isFinite(downPaymentPercent) || downPaymentPercent > 100) { toast.error('Down payment cannot exceed 100%.'); return; }

    if (Number(ratesForm.hourlyRate) > 1000) toast.warning(`Warning: Standard hourly rate (₱${ratesForm.hourlyRate}) is over ₱1,000.`);
    if (Number(ratesForm.overtimeRate) > 1000) toast.warning(`Warning: Overtime rate (₱${ratesForm.overtimeRate}) is over ₱1,000.`);

    if (advHrs > 720) { toast.error('Advance booking cut-off cannot exceed 30 days (720 hours).'); return; }
    if (cancelHrs > 168) { toast.error('Cancellation grace period cannot exceed 7 days (168 hours).'); return; }

    const parseSafeMins = (time?: string) => { 
      if (!time || typeof time !== 'string' || !time.includes(':')) return 0;
      const [h, m] = time.split(':').map(Number); 
      return (h || 0) * 60 + (m || 0); 
    };
    const weekdayEndMins = parseSafeMins(ratesForm.weekdayEndTime);
    const weekdayStartMins = parseSafeMins(ratesForm.weekdayStartTime);
    const weekendStartMins = parseSafeMins(ratesForm.weekendStartTime);

    const flowsIntoNextDay = weekdayEndMins <= weekdayStartMins; 
    if (flowsIntoNextDay && weekdayEndMins > weekendStartMins && weekendStartMins > 0) {
        toast.error(`Schedule Conflict: Weekday schedule ends on Friday at ${fmt12(ratesForm.weekdayEndTime)}, but Weekend schedule starts at ${fmt12(ratesForm.weekendStartTime)}. Please adjust times to prevent overlap.`);
        return;
    }

    setShowSummaryModal(true);
  };

  // 🟢 FIXED: Closes modal instantly and shows PageLoader while pushing locally and to Supabase
  const executeSave = async () => {
    setShowSummaryModal(false);
    setIsSaving(true);
    try {
      const ratesPayload = {
        hourlyRate: Number(ratesForm.hourlyRate) || 0,
        overtimeRate: Number(ratesForm.overtimeRate) || 0,
        downPaymentPercent: Number(ratesForm.downPaymentPercent) || 0,
        weekdayStartTime: ratesForm.weekdayStartTime || '12:00',
        weekdayEndTime: ratesForm.weekdayEndTime || '00:00',
        isWeekdayHappyHourActive: !!ratesForm.isWeekdayHappyHourActive,
        weekdayHappyHourRate: Number(ratesForm.weekdayHappyHourRate) || 0,
        weekdayHappyHourStart: ratesForm.weekdayHappyHourStart || '15:00',
        weekdayHappyHourEnd: ratesForm.weekdayHappyHourEnd || '18:00',
        weekdayOnlineCapacityLimit: Number(ratesForm.weekdayOnlineCapacityLimit) || 70,
        weekendStartTime: ratesForm.weekendStartTime || '12:00',
        weekendEndTime: ratesForm.weekendEndTime || '02:00',
        isWeekendHappyHourActive: !!ratesForm.isWeekendHappyHourActive,
        weekendHappyHourRate: Number(ratesForm.weekendHappyHourRate) || 0,
        weekendHappyHourStart: ratesForm.weekendHappyHourStart || '15:00',
        weekendHappyHourEnd: ratesForm.weekendHappyHourEnd || '18:00',
        weekendOnlineCapacityLimit: Number(ratesForm.weekendOnlineCapacityLimit) || 70,
      };

      const termsPayload = {
        minHours: Number(termsForm.minHours) || 1,
        maxHours: Number(termsForm.maxHours) || 6,
        cancellationHours: Number(termsForm.cancellationHours) || 24,
        advanceBookingHours: Number(termsForm.advanceBookingHours) || 2,
        cancellationPolicy: termsForm.cancellationPolicy || '',
        termsAndConditions: termsForm.termsAndConditions || '',
        weekdayMinPartySize: Number(termsForm.weekdayMinPartySize) || 1,
        weekdayMaxPartySize: Number(termsForm.weekdayMaxPartySize) || 10,
        weekendMinPartySize: Number(termsForm.weekendMinPartySize) || 1,
        weekendMaxPartySize: Number(termsForm.weekendMaxPartySize) || 10,
      };
      
      await updateRates(ratesPayload);
      await updateReservationTerms(termsPayload);

      // Explicitly trigger cloud backup to Supabase
      await fetch('http://localhost:3001/api/sync-to-cloud', { method: 'POST' }).catch(() => {});

      toast.success("Policies & Rates successfully updated locally and pushed to Cloud!");
    } catch (e) { 
      toast.error('Failed to save settings to database.'); 
    } finally { 
      setTimeout(() => setIsSaving(false), 600); 
    }
  };

  const truncate = (str: string) => str && str.length > 30 ? str.substring(0, 30) + '...' : str;
  const renderChangeRow = (label: string, oldVal: any, newVal: any, isCurrency: boolean = false) => {
    const format = (v: any) => {
      if (typeof v === 'boolean') return v ? 'Active' : 'Hidden';
      if (isCurrency && v !== undefined && v !== '') return `₱${v}`;
      return String(v ?? 'None');
    };
    const o = format(oldVal);
    const n = format(newVal);
    const changed = o !== n;
    return (
      <div className="flex justify-between border-b border-neutral-800/60 py-2.5 items-center">
        <span className="text-neutral-400 text-xs font-medium">{label}</span>
        <div className="text-right max-w-[220px]">
          {!changed ? (
            <span className="text-neutral-500 text-xs italic">
              {n} <span className="text-neutral-600 text-[10px] ml-1">(unchanged)</span>
            </span>
          ) : (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-neutral-500 line-through text-[10px]">{o}</span>
              <span className="text-emerald-400 font-bold text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{n}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CharCount = ({ current, max }: { current?: string, max: number }) => {
    const len = current?.length || 0;
    return (
      <span className={`text-[10px] ${len >= max ? 'text-rose-400 font-bold' : 'text-neutral-600'}`}>
        {len}/{max}
      </span>
    );
  };

  // 🟢 FIXED: Explicitly renders PageLoader during initial load or while saving to cloud
  if (isLoading || isSaving) {
    return (
      <div className="min-h-[75vh] w-full flex flex-col items-center justify-center bg-neutral-950">
        <PageLoader />
        <p className="text-xs text-neutral-400 font-semibold uppercase tracking-widest mt-4 animate-pulse">
          {isSaving 
            ? "Saving Policies & uploading to Cloud..." 
            : "Synchronizing Policies & Rates..."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">
      <div className="flex justify-between items-end border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-3xl font-black text-neutral-100 tracking-widest">POLICY & RATES</h1>
          <p className="text-sm text-neutral-400 mt-1">Manage pricing, operating hours, and booking rules for weekdays and weekends.</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleReviewChanges} className="bg-emerald-600 hover:bg-emerald-500 text-neutral-100 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-950/40">
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="space-y-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2 mb-6">
              <DollarSign className="text-emerald-500" /> Base Rates & Store Hours
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider flex justify-between">
                  <span>Standard Hourly Rate (₱)</span>
                  {Number(ratesForm.hourlyRate) > 1000 && <span className="text-amber-400 text-[10px] font-bold">⚠️ &gt;1000</span>}
                </label>
                <input 
                  type="text" 
                  inputMode="numeric" 
                  name="hourlyRate" 
                  value={ratesForm.hourlyRate} 
                  onChange={handleRateInput} 
                  placeholder="Max 4 digits"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-neutral-100 focus:border-emerald-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider flex justify-between">
                  <span>Overtime Rate (₱)</span>
                  {Number(ratesForm.overtimeRate) > 1000 && <span className="text-amber-400 text-[10px] font-bold">⚠️ &gt;1000</span>}
                </label>
                <input 
                  type="text" 
                  inputMode="numeric" 
                  name="overtimeRate" 
                  value={ratesForm.overtimeRate} 
                  onChange={handleRateInput} 
                  placeholder="Max 4 digits"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-neutral-100 focus:border-emerald-500 outline-none" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 p-4 bg-neutral-950 rounded-lg border border-neutral-800/50 mb-4">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-emerald-500 border-b border-neutral-800 pb-2">WEEKDAYS (Mon-Thu)</h3>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Store Opens</label>
                  <input type="time" style={{ colorScheme: theme === 'light' ? 'light' : 'dark' }} name="weekdayStartTime" value={ratesForm.weekdayStartTime} onChange={handleRatesChange} className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-neutral-100 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Store Closes</label>
                  <input type="time" style={{ colorScheme: theme === 'light' ? 'light' : 'dark' }} name="weekdayEndTime" value={ratesForm.weekdayEndTime} onChange={handleRatesChange} className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-neutral-100 focus:border-emerald-500 outline-none" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-emerald-500 border-b border-neutral-800 pb-2">WEEKENDS (Fri-Sun)</h3>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Store Opens</label>
                  <input type="time" style={{ colorScheme: theme === 'light' ? 'light' : 'dark' }} name="weekendStartTime" value={ratesForm.weekendStartTime} onChange={handleRatesChange} className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-neutral-100 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Store Closes</label>
                  <input type="time" style={{ colorScheme: theme === 'light' ? 'light' : 'dark' }} name="weekendEndTime" value={ratesForm.weekendEndTime} onChange={handleRatesChange} className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-neutral-100 focus:border-emerald-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Down Payment % Required (All Days)</label>
              <input type="text" inputMode="numeric" name="downPaymentPercent" value={ratesForm.downPaymentPercent} onChange={handleDownPaymentInput} className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-neutral-100 focus:border-emerald-500 outline-none" />
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2 mb-6"><Clock className="text-emerald-500" /> Happy Hour Promotions</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className={`p-4 rounded-lg border transition-colors ${ratesForm.isWeekdayHappyHourActive ? 'bg-neutral-950 border-emerald-900/50' : 'bg-neutral-950 border-neutral-800 opacity-70'}`}>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-emerald-500">WEEKDAYS</span>
                  <button type="button" onClick={() => setRatesForm(prev => ({ ...prev, isWeekdayHappyHourActive: !prev.isWeekdayHappyHourActive }))}>
                    {ratesForm.isWeekdayHappyHourActive ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-neutral-600" />}
                  </button>
                </div>
                <div className={`space-y-4 ${!ratesForm.isWeekdayHappyHourActive && 'pointer-events-none'}`}>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1 uppercase flex justify-between">
                      <span>Promo Rate (₱)</span>
                      {Number(ratesForm.weekdayHappyHourRate) > 1000 && <span className="text-amber-400 font-bold">⚠️ &gt;1000</span>}
                    </label>
                    <input type="text" inputMode="numeric" name="weekdayHappyHourRate" value={ratesForm.weekdayHappyHourRate} onChange={handleRateInput} className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-neutral-100 focus:border-emerald-500 outline-none" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex-1"><label className="block text-[10px] text-neutral-400 mb-1 uppercase">Start</label><input type="time" style={{ colorScheme: theme === 'light' ? 'light' : 'dark' }} name="weekdayHappyHourStart" value={ratesForm.weekdayHappyHourStart} onChange={handleRatesChange} className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-neutral-100 outline-none" /></div>
                    <div className="flex-1"><label className="block text-[10px] text-neutral-400 mb-1 uppercase">End</label><input type="time" style={{ colorScheme: theme === 'light' ? 'light' : 'dark' }} name="weekdayHappyHourEnd" value={ratesForm.weekdayHappyHourEnd} onChange={handleRatesChange} className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-neutral-100 outline-none" /></div>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border transition-colors ${ratesForm.isWeekendHappyHourActive ? 'bg-neutral-950 border-emerald-900/50' : 'bg-neutral-950 border-neutral-800 opacity-70'}`}>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-emerald-500">WEEKENDS</span>
                  <button type="button" onClick={() => setRatesForm(prev => ({ ...prev, isWeekendHappyHourActive: !prev.isWeekendHappyHourActive }))}>
                    {ratesForm.isWeekendHappyHourActive ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-neutral-600" />}
                  </button>
                </div>
                <div className={`space-y-4 ${!ratesForm.isWeekendHappyHourActive && 'pointer-events-none'}`}>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1 uppercase flex justify-between">
                      <span>Promo Rate (₱)</span>
                      {Number(ratesForm.weekendHappyHourRate) > 1000 && <span className="text-amber-400 font-bold">⚠️ &gt;1000</span>}
                    </label>
                    <input type="text" inputMode="numeric" name="weekendHappyHourRate" value={ratesForm.weekendHappyHourRate} onChange={handleRateInput} className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-neutral-100 focus:border-emerald-500 outline-none" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex-1"><label className="block text-[10px] text-neutral-400 mb-1 uppercase">Start</label><input type="time" style={{ colorScheme: theme === 'light' ? 'light' : 'dark' }} name="weekendHappyHourStart" value={ratesForm.weekendHappyHourStart} onChange={handleRatesChange} className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-neutral-100 outline-none" /></div>
                    <div className="flex-1"><label className="block text-[10px] text-neutral-400 mb-1 uppercase">End</label><input type="time" style={{ colorScheme: theme === 'light' ? 'light' : 'dark' }} name="weekendHappyHourEnd" value={ratesForm.weekendHappyHourEnd} onChange={handleRatesChange} className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-neutral-100 outline-none" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2 mb-6">
              <SlidersHorizontal className="text-emerald-500" /> Venue Allocation Policy & Constraints
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-bold text-emerald-500 border-b border-neutral-800 pb-2 mb-4">WEEKDAYS</h3>
                <div className="mb-6">
                  <label className="block text-xs text-neutral-400 mb-2 uppercase tracking-wider flex justify-between items-center">
                    <span>Online Allocation Cap</span><span className="text-emerald-500 font-bold bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded-full text-xs">{ratesForm.weekdayOnlineCapacityLimit}%</span>
                  </label>
                  <input type="range" name="weekdayOnlineCapacityLimit" min="0" max="100" step="10" value={ratesForm.weekdayOnlineCapacityLimit} onChange={handleRatesChange} className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1"><label className="block text-[10px] text-neutral-400 mb-1 uppercase">Min Party</label><input type="text" inputMode="numeric" name="weekdayMinPartySize" value={termsForm.weekdayMinPartySize} onChange={handlePartySizeInput} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-neutral-100 outline-none" /></div>
                  <div className="flex-1"><label className="block text-[10px] text-neutral-400 mb-1 uppercase">Max Party</label><input type="text" inputMode="numeric" name="weekdayMaxPartySize" value={termsForm.weekdayMaxPartySize} onChange={handlePartySizeInput} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-neutral-100 outline-none" /></div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-500 border-b border-neutral-800 pb-2 mb-4">WEEKENDS</h3>
                <div className="mb-6">
                  <label className="block text-xs text-neutral-400 mb-2 uppercase tracking-wider flex justify-between items-center">
                    <span>Online Allocation Cap</span><span className="text-emerald-500 font-bold bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded-full text-xs">{ratesForm.weekendOnlineCapacityLimit}%</span>
                  </label>
                  <input type="range" name="weekendOnlineCapacityLimit" min="0" max="100" step="10" value={ratesForm.weekendOnlineCapacityLimit} onChange={handleRatesChange} className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1"><label className="block text-[10px] text-neutral-400 mb-1 uppercase">Min Party</label><input type="text" inputMode="numeric" name="weekendMinPartySize" value={termsForm.weekendMinPartySize} onChange={handlePartySizeInput} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-neutral-100 outline-none" /></div>
                  <div className="flex-1"><label className="block text-[10px] text-neutral-400 mb-1 uppercase">Max Party</label><input type="text" inputMode="numeric" name="weekendMaxPartySize" value={termsForm.weekendMaxPartySize} onChange={handlePartySizeInput} className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-neutral-100 outline-none" /></div>
                </div>
              </div>
            </div>

            {/* Deadlock Defense Engine */}
            <div className="border-t border-neutral-800 pt-6">
              <h3 className="text-sm font-bold text-neutral-200 mb-4 flex items-center gap-2">
                <ShieldAlert size={16} className="text-emerald-500" />
                <span>Deadlock & Event Defense Engine</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-neutral-300">Turnover Buffer</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{turnoverBufferMins}m Gap</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
                    Enforces a mandatory gap between back-to-back online reservations to prevent table cleaning and overtime deadlocks.
                  </p>
                  <select 
                    value={turnoverBufferMins} 
                    onChange={e => setTurnoverBufferMins(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-xs text-neutral-200 outline-none"
                  >
                    <option value={15}>15 Min Standard Gap</option>
                    <option value={20}>20 Min Safety Gap</option>
                    <option value={30}>30 Min Heavy Buffer</option>
                  </select>
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-neutral-300">Event Override</span>
                    <button type="button" onClick={() => setEventLockProtection(!eventLockProtection)}>
                      {eventLockProtection ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-neutral-600" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Tournament/Event table allocations automatically lock out online reservation pools 24 hours in advance to defend against double-booking.
                  </p>
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-neutral-300">Reschedule Limit</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Max {maxRescheduleLimit}x</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
                    Caps customer reschedules to prevent users from indefinitely holding table inventory and blocking other patrons.
                  </p>
                  <select 
                    value={maxRescheduleLimit} 
                    onChange={e => setMaxRescheduleLimit(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-xs text-neutral-200 outline-none"
                  >
                    <option value={1}>1 Reschedule Max</option>
                    <option value={2}>2 Reschedules Standard</option>
                    <option value={3}>3 Reschedules Lenient</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: POLICIES & HOURS */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2 mb-6">
              <FileText className="text-emerald-500" /> Content Editor & Duration Bounds
            </h2>
            <div className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Min Booking Hours</label>
                  <input type="text" inputMode="numeric" name="minHours" value={termsForm.minHours} onChange={handleHourInput} placeholder="0–99" className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-neutral-100 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Max Booking Hours</label>
                  <input type="text" inputMode="numeric" name="maxHours" value={termsForm.maxHours} onChange={handleHourInput} placeholder="0–99" className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-neutral-100 focus:border-emerald-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Advance Booking Cut-off (Hours)</label>
                <input type="text" inputMode="numeric" name="advanceBookingHours" value={termsForm.advanceBookingHours} onChange={handleHourInput} placeholder="0–99" className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-neutral-100 focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 uppercase tracking-wider">Cancellation Grace Period (Hours)</label>
                <input type="text" inputMode="numeric" name="cancellationHours" value={termsForm.cancellationHours} onChange={handleHourInput} placeholder="0–99" className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-neutral-100 focus:border-emerald-500 outline-none" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs text-neutral-400 uppercase tracking-wider">Booking Policies (Displayed in Step 2)</label>
                  <CharCount current={termsForm.cancellationPolicy} max={400} />
                </div>
                <textarea maxLength={400} name="cancellationPolicy" value={termsForm.cancellationPolicy} onChange={handleTermsChange} rows={4} className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-neutral-100 focus:border-emerald-500 outline-none resize-none" placeholder="E.g. No refunds on same-day cancellations..." />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs text-neutral-400 uppercase tracking-wider">General Terms & Conditions</label>
                  <CharCount current={termsForm.termsAndConditions} max={600} />
                </div>
                <textarea maxLength={600} name="termsAndConditions" value={termsForm.termsAndConditions} onChange={handleTermsChange} rows={3} className="w-full bg-neutral-950 border border-neutral-800 rounded p-3 text-neutral-100 focus:border-emerald-500 outline-none resize-none" placeholder="General establishment rules..." />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider flex items-center gap-2"><ShieldCheck size={14}/> Customer View Preview</p>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <h3 className="text-lg font-bold text-neutral-100 mb-4">Booking Policies & Terms</h3>
              <ul className="space-y-4">
                <li className="flex gap-3 text-neutral-300">
                  <AlertCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{termsForm.cancellationPolicy || "No policy defined."}</p>
                    <p className="text-xs text-neutral-400 mt-2">Minimum booking: <span className="text-neutral-100 font-bold">{termsForm.minHours} hour(s)</span> | Advance Notice: <span className="text-neutral-100 font-bold">{termsForm.advanceBookingHours} hour(s)</span></p>
                  </div>
                </li>
                <li className="flex gap-3 text-neutral-300">
                  <Clock size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div className="w-full">
                    <div className="grid grid-cols-2 gap-4 bg-neutral-900/50 p-3 rounded border border-neutral-800">
                      <div>
                        <p className="text-[10px] uppercase text-emerald-500 font-bold mb-1">Weekday Setup</p>
                        <p className="text-xs text-neutral-400">Hours: <span className="text-neutral-100">{fmt12(ratesForm.weekdayStartTime)} - {fmt12(ratesForm.weekdayEndTime)}</span></p>
                        <p className="text-xs text-neutral-400">Booking: <span className="text-neutral-100">{bookingWindowDisplay(ratesForm.weekdayStartTime, ratesForm.weekdayEndTime)}</span></p>
                        <p className="text-xs text-neutral-400">Limits: <span className="text-neutral-100">{ratesForm.weekdayOnlineCapacityLimit}% Cap | {termsForm.weekdayMinPartySize}-{termsForm.weekdayMaxPartySize} Pax</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-emerald-500 font-bold mb-1">Weekend Setup</p>
                        <p className="text-xs text-neutral-400">Hours: <span className="text-neutral-100">{fmt12(ratesForm.weekendStartTime)} - {fmt12(ratesForm.weekendEndTime)}</span></p>
                        <p className="text-xs text-neutral-400">Booking: <span className="text-neutral-100">{bookingWindowDisplay(ratesForm.weekendStartTime, ratesForm.weekendEndTime)}</span></p>
                        <p className="text-xs text-neutral-400">Limits: <span className="text-neutral-100">{ratesForm.weekendOnlineCapacityLimit}% Cap | {termsForm.weekendMinPartySize}-{termsForm.weekendMaxPartySize} Pax</span></p>
                      </div>
                    </div>
                    <p className="text-sm mt-3">Down payment required: <span className="font-bold text-neutral-100">{ratesForm.downPaymentPercent ?? 25}%</span></p>
                  </div>
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

      {/* ALL-INCLUSIVE CONFIRMATION MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-neutral-900/80 border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-500" /> Review Policy & Rate Summary
              </h3>
              <button type="button" onClick={() => setShowSummaryModal(false)} className="text-neutral-500 hover:text-neutral-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-neutral-400">
                Please review all policies and rates. Items highlighted have been modified:
              </p>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-sm space-y-1 text-neutral-300 max-h-[50vh] overflow-y-auto">
                {renderChangeRow('Base Hourly Rate', rates.hourlyRate, ratesForm.hourlyRate, true)}
                {renderChangeRow('Overtime Rate', rates.overtimeRate, ratesForm.overtimeRate, true)}
                {renderChangeRow('Down Payment Required', `${rates.downPaymentPercent}%`, `${ratesForm.downPaymentPercent}%`)}
                
                <div className="pt-3 pb-1 mt-2 border-t border-neutral-800/60 font-bold text-emerald-500 text-[10px] uppercase tracking-widest">Weekday Setup</div>
                {renderChangeRow('Store Hours', `${fmt12(rates.weekdayStartTime)} - ${fmt12(rates.weekdayEndTime)}`, `${fmt12(ratesForm.weekdayStartTime)} - ${fmt12(ratesForm.weekdayEndTime)}`)}
                {renderChangeRow('Happy Hour Status', rates.isWeekdayHappyHourActive, ratesForm.isWeekdayHappyHourActive)}
                {renderChangeRow('Happy Hour Window', `${fmt12(rates.weekdayHappyHourStart)} - ${fmt12(rates.weekdayHappyHourEnd)}`, `${fmt12(ratesForm.weekdayHappyHourStart)} - ${fmt12(ratesForm.weekdayHappyHourEnd)}`)}
                {renderChangeRow('Happy Hour Rate', rates.weekdayHappyHourRate, ratesForm.weekdayHappyHourRate, true)}
                {renderChangeRow('Online Capacity Cap', `${rates.weekdayOnlineCapacityLimit}%`, `${ratesForm.weekdayOnlineCapacityLimit}%`)}
                {renderChangeRow('Min/Max Party Size', `${reservationTerms.weekdayMinPartySize}-${reservationTerms.weekdayMaxPartySize}`, `${termsForm.weekdayMinPartySize}-${termsForm.weekdayMaxPartySize}`)}
                
                <div className="pt-3 pb-1 mt-2 border-t border-neutral-800/60 font-bold text-emerald-500 text-[10px] uppercase tracking-widest">Weekend Setup</div>
                {renderChangeRow('Store Hours', `${fmt12(rates.weekendStartTime)} - ${fmt12(rates.weekendEndTime)}`, `${fmt12(ratesForm.weekendStartTime)} - ${fmt12(ratesForm.weekendEndTime)}`)}
                {renderChangeRow('Happy Hour Status', rates.isWeekendHappyHourActive, ratesForm.isWeekendHappyHourActive)}
                {renderChangeRow('Happy Hour Window', `${fmt12(rates.weekendHappyHourStart)} - ${fmt12(rates.weekendHappyHourEnd)}`, `${fmt12(ratesForm.weekendHappyHourStart)} - ${fmt12(ratesForm.weekendHappyHourEnd)}`)}
                {renderChangeRow('Happy Hour Rate', rates.weekendHappyHourRate, ratesForm.weekendHappyHourRate, true)}
                {renderChangeRow('Online Capacity Cap', `${rates.weekendOnlineCapacityLimit}%`, `${ratesForm.weekendOnlineCapacityLimit}%`)}
                {renderChangeRow('Min/Max Party Size', `${reservationTerms.weekendMinPartySize}-${reservationTerms.weekendMaxPartySize}`, `${termsForm.weekendMinPartySize}-${termsForm.weekendMaxPartySize}`)}
                
                <div className="pt-3 pb-1 mt-2 border-t border-neutral-800/60 font-bold text-emerald-500 text-[10px] uppercase tracking-widest">Policies & Duration</div>
                {renderChangeRow('Min/Max Duration', `${reservationTerms.minHours}-${reservationTerms.maxHours} Hrs`, `${termsForm.minHours}-${termsForm.maxHours} Hrs`)}
                {renderChangeRow('Advance Notice', `${reservationTerms.advanceBookingHours} Hrs`, `${termsForm.advanceBookingHours} Hrs`)}
                {renderChangeRow('Cancellation Grace', `${reservationTerms.cancellationHours} Hrs`, `${termsForm.cancellationHours} Hrs`)}
                {renderChangeRow('Cancellation Policy', truncate(reservationTerms.cancellationPolicy), truncate(termsForm.cancellationPolicy))}
                {renderChangeRow('General T&C Text', truncate(reservationTerms.termsAndConditions), truncate(termsForm.termsAndConditions))}
                
                <div className="pt-3 pb-1 mt-2 border-t border-neutral-800/60 font-bold text-emerald-500 text-[10px] uppercase tracking-widest">Allocation & Defense Engine</div>
                {renderChangeRow('Turnover Buffer Window', `${turnoverBufferMins}m Gap`, `${turnoverBufferMins}m Gap`)}
                {renderChangeRow('Event Override Protection', eventLockProtection, eventLockProtection)}
                {renderChangeRow('Reschedule Cap', `Max ${maxRescheduleLimit}x`, `Max ${maxRescheduleLimit}x`)}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSummaryModal(false)} className="flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-sm font-semibold transition-colors border border-neutral-800">
                  Cancel
                </button>
                <button type="button" onClick={executeSave} disabled={isSaving} className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-neutral-100 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30">
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