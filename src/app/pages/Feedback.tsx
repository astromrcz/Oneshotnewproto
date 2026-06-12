import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Plus, X, MessageSquare, ThumbsUp, TrendingUp,
  Tag, Mail, CheckCircle, AlertTriangle, Lightbulb,
  Search, Package, ChevronDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type FeedbackType = 'suggestion' | 'complaint' | 'lost_item' | 'compliment' | 'other';

const TYPE_CONFIG: Record<FeedbackType, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  compliment: { label: 'Compliment',        color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: ThumbsUp },
  suggestion: { label: 'Suggestion',        color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: Lightbulb },
  complaint:  { label: 'Concern/Complaint', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: AlertTriangle },
  lost_item:  { label: 'Lost Item',         color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    icon: Package },
  other:      { label: 'Other',             color: 'text-neutral-400', bg: 'bg-neutral-800',    border: 'border-neutral-700',    icon: MessageSquare },
};

const tagOptions = ['clean tables', 'friendly staff', 'fast service', 'good ambiance', 'fair price', 'timer system', 'organized queue', 'wait time', 'peak hours', 'cleanliness'];

export function FeedbackPage() {
  const { feedback, addFeedback, reservations } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<FeedbackType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    customerName: '',
    contactInfo: '',
    feedbackType: '' as FeedbackType | '',
    message: '',
    reservationId: '',
    tags: [] as string[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.contactInfo || !form.feedbackType || !form.message) return;
    addFeedback({
      customerName: form.customerName,
      contactInfo: form.contactInfo,
      rating: 0, // No rating in this version
      feedbackType: form.feedbackType as FeedbackType,
      comment: form.message,
      reservationId: form.reservationId || undefined,
      tags: form.tags,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setShowForm(false);
      setForm({ customerName: '', contactInfo: '', feedbackType: '', message: '', reservationId: '', tags: [] });
    }, 2000);
  };

  const toggleTag = (tag: string) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  };

  const filtered = feedback.filter(f => {
    const matchType = filterType === 'all' || f.feedbackType === filterType;
    const matchSearch = !searchQuery ||
      f.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.comment.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  // Stats
  const compliments  = feedback.filter(f => f.feedbackType === 'compliment').length;
  const complaints   = feedback.filter(f => f.feedbackType === 'complaint').length;
  const suggestions  = feedback.filter(f => f.feedbackType === 'suggestion').length;
  const lostItems    = feedback.filter(f => f.feedbackType === 'lost_item').length;
  const total        = feedback.length;

  const topTags = (() => {
    const tagMap: Record<string, number> = {};
    feedback.forEach(f => f.tags.forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }));
    return Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  })();

  return (
    <div className="space-y-5">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Messages',  value: total,       color: 'text-neutral-200',  icon: MessageSquare },
          { label: 'Compliments',     value: compliments, color: 'text-emerald-400',  icon: ThumbsUp },
          { label: 'Concerns',        value: complaints,  color: 'text-amber-400',    icon: AlertTriangle },
          { label: 'Suggestions',     value: suggestions, color: 'text-blue-400',     icon: Lightbulb },
        ].map(s => (
          <div key={s.label} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex items-center gap-3">
            <s.icon size={22} className={`${s.color} opacity-70 flex-shrink-0`} />
            <div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider font-semibold">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search feedback..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'compliment', 'suggestion', 'complaint', 'lost_item', 'other'] as const).map(t => {
            const cfg = t !== 'all' ? TYPE_CONFIG[t] : null;
            const isActive = filterType === t;
            return (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  isActive
                    ? cfg ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-neutral-800 text-neutral-200 border-neutral-700'
                    : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {t === 'all' ? 'All' : TYPE_CONFIG[t].label}
              </button>
            );
          })}
        </div>

        {/* Add Button */}
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all flex-shrink-0"
        >
          <Plus size={14} /> Add Feedback
        </button>
      </div>

      {/* ── Top Tags ── */}
      {topTags.length > 0 && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5">
            <Tag size={11} /> Common Feedback Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <span key={tag} className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1 text-xs text-neutral-300">
                {tag}
                <span className="bg-neutral-700 text-neutral-400 text-[10px] font-black px-1.5 rounded-full">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Feedback List ── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-12 text-center">
            <MessageSquare size={32} className="mx-auto text-neutral-700 mb-3" />
            <p className="text-neutral-500 text-sm">No feedback messages yet</p>
          </div>
        ) : filtered.map(fb => {
          const type = (fb.feedbackType || 'other') as FeedbackType;
          const cfg = TYPE_CONFIG[type];
          const Icon = cfg.icon;
          return (
            <div key={fb.id} className={`bg-neutral-950 border rounded-xl p-5 hover:border-neutral-700 transition-colors ${fb.feedbackType ? cfg.border : 'border-neutral-800'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-sm font-bold text-neutral-400 flex-none">
                    {fb.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-neutral-200">{fb.customerName}</p>
                      {fb.reservationId && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase font-bold">Verified</span>
                      )}
                    </div>
                    {fb.contactInfo && (
                      <p className="text-[11px] text-neutral-600 mt-0.5">{fb.contactInfo}</p>
                    )}
                    <p className="text-[10px] text-neutral-600 mt-0.5">{formatDistanceToNow(new Date(fb.date), { addSuffix: true })}</p>
                  </div>
                </div>
                {/* Type Badge */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                  <Icon size={11} />
                  {cfg.label}
                </div>
              </div>

              <p className="text-sm text-neutral-400 mt-3 leading-relaxed">"{fb.comment}"</p>

              {fb.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {fb.tags.map(tag => (
                    <span key={tag} className="bg-neutral-900 text-neutral-500 text-[10px] px-2 py-0.5 rounded-full border border-neutral-800">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════
          ADD FEEDBACK MODAL — HomePage-style form
      ════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center flex-none sticky top-0 bg-neutral-950">
              <div className="flex items-center gap-2">
                <Mail className="text-sky-400" size={17} />
                <h2 className="text-base font-bold text-neutral-100">Add Feedback</h2>
              </div>
              <button onClick={() => { setShowForm(false); setSubmitted(false); }} className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {submitted ? (
                <div className="p-10 text-center">
                  <CheckCircle size={40} className="text-sky-400 mx-auto mb-3" />
                  <p className="text-sky-300 font-semibold text-lg mb-1">Feedback Recorded!</p>
                  <p className="text-neutral-500 text-sm">The feedback has been saved to the system.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Customer Name */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
                      Customer Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                      placeholder="e.g. Juan dela Cruz"
                      required
                      autoFocus
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-colors"
                    />
                  </div>

                  {/* Contact Info */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
                      Contact Information <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.contactInfo}
                      onChange={e => setForm(f => ({ ...f, contactInfo: e.target.value }))}
                      placeholder="Email or Phone Number"
                      required
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-colors"
                    />
                  </div>

                  {/* Type of Feedback */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
                      Type of Feedback <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={form.feedbackType}
                        onChange={e => setForm(f => ({ ...f, feedbackType: e.target.value as FeedbackType }))}
                        required
                        className="w-full appearance-none bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-colors pr-9"
                      >
                        <option value="" disabled>Select a category...</option>
                        <option value="compliment">Compliment</option>
                        <option value="suggestion">Suggestion</option>
                        <option value="complaint">Concern / Complaint</option>
                        <option value="lost_item">Lost Item</option>
                        <option value="other">Other</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
                      Message <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Please provide details..."
                      rows={4}
                      required
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-colors resize-none"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-2 font-medium">Tags (optional)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {tagOptions.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1 rounded-full text-xs border transition-all font-medium ${
                            form.tags.includes(tag)
                              ? 'bg-sky-600/20 border-sky-600/40 text-sky-400'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Linked Reservation */}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Linked Reservation (optional)</label>
                    <div className="relative">
                      <select
                        value={form.reservationId}
                        onChange={e => setForm(f => ({ ...f, reservationId: e.target.value }))}
                        className="w-full appearance-none bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-sky-500/50 transition-colors pr-9"
                      >
                        <option value="">None (walk-in)</option>
                        {reservations.filter(r => r.status === 'completed').map(r => (
                          <option key={r.id} value={r.id}>{r.customerName} — {new Date(r.date).toLocaleDateString()}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowForm(false)}
                      className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-xl transition-colors">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!form.customerName || !form.contactInfo || !form.feedbackType || !form.message}
                      className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={14} /> Submit Feedback
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
