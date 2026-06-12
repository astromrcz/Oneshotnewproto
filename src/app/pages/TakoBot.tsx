import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Lightbulb, CalendarDays, TrendingUp, Sparkles, Megaphone, CheckCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext'; // Import context!
const { activeAnnouncement, updateActiveAnnouncement } = useAppContext();
export function TakoBot() {
  const { activeAnnouncement, updateAnnouncement } = useAppContext();
  
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello Boss! I'm Tako bot. I'm monitoring the queue and tables. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Broadcast State
  const [draftMsg, setDraftMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: "Based on our history, running a 'Buy 2 Hours, Get 1 Free' promo specifically for university students on Tuesdays increases revenue by 18%. Would you like me to draft an announcement for this?" 
      }]);
    }, 1500);
  };

  // AI Broadcast Function
  const handleSmartBroadcast = () => {
    if (!draftMsg.trim()) return;
    setIsBroadcasting(true);

    // Simulate AI "Enhancing" the basic text into a catchy announcement
    setTimeout(() => {
      const aiEnhancedMessage = `✨ ${draftMsg} Come join the fun at One Shot! 🎱🍻`;
      updateActiveAnnouncement(aiEnhancedMessage); // <--- Make sure this matches!

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
          <Bot size={24} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Tako bot Assistant</h2>
          <p className="text-sm text-neutral-400">Your AI-Powered Manager & Broadcaster</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: AI Suggestions & Broadcast */}
        <div className="space-y-4">
          
          {/* 🔴 NEW: AI Broadcast Manager */}
          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-2xl p-5 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Megaphone size={16} className="text-emerald-400" />
                <h4 className="text-white font-bold text-sm">Smart Broadcast</h4>
              </div>
              
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 mb-3">
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-1">Live on Website Now:</p>
                <p className="text-xs text-emerald-300 leading-relaxed">"{activeAnnouncement}"</p>
              </div>

              <textarea 
                value={draftMsg}
                onChange={e => setDraftMsg(e.target.value)}
                placeholder="Type a basic message (e.g., 'happy hour tonight'). Tako will enhance it..."
                rows={2}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none mb-2"
              />
              
              <button 
                onClick={handleSmartBroadcast}
                disabled={!draftMsg.trim() || isBroadcasting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                {isBroadcasting ? (
                  <><Sparkles size={12} className="animate-pulse" /> Enhancing & Publishing...</>
                ) : broadcastSuccess ? (
                  <><CheckCircle size={12} /> Published!</>
                ) : (
                  <><Sparkles size={12} /> AI Enhance & Publish</>
                )}
              </button>
            </div>
          </div>

          <h3 className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-2">Automated Insights</h3>
          
          {/* Card 1: Marketing */}
          <div className="bg-neutral-950 border border-neutral-800 hover:border-amber-500/30 transition-colors rounded-xl p-5 group cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <Lightbulb size={18} className="text-amber-400" />
              <h4 className="text-white font-bold text-sm">Marketing Idea</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Launch a "Spooky Shots" Halloween tournament. Est. revenue impact: <span className="text-emerald-400 font-semibold">+₱15,000</span>.
            </p>
          </div>

          {/* Card 2: Earnings */}
          <div className="bg-neutral-950 border border-neutral-800 hover:border-emerald-500/30 transition-colors rounded-xl p-5 group cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp size={18} className="text-emerald-400" />
              <h4 className="text-white font-bold text-sm">Earnings Analytics</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Weekend walk-ins are up 12%, but weekday online reservations dropped 5%.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Chat Interface */}
        <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden h-[600px]">
          {/* Chat header */}
          <div className="border-b border-neutral-800 bg-neutral-900/50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-500" />
              <span className="text-sm font-semibold text-white">Ask Tako bot</span>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-br-none' 
                    : 'bg-neutral-800 text-neutral-200 rounded-bl-none border border-neutral-700'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-neutral-800 border border-neutral-700 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-neutral-900/50 border-t border-neutral-800">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask for marketing ideas, promo suggestions..."
                className="w-full bg-neutral-950 border border-neutral-700 rounded-full pl-5 pr-12 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 p-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded-full transition-all"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}