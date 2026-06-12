import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Lightbulb, CalendarDays, TrendingUp, Sparkles } from 'lucide-react';

export function TakoBot() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello Boss! I'm Tako bot, your AI Manager. I've analyzed this week's data. Tuesdays are looking a bit slow. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput('');
    setIsTyping(true);

    // Mock AI Response delay for prototype
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: "Based on our history, running a 'Buy 2 Hours, Get 1 Free' promo specifically for university students on Tuesdays increases revenue by 18%. Would you like me to generate a promo code for this?" 
      }]);
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
          <Bot size={24} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Tako bot Assistant</h2>
          <p className="text-sm text-neutral-400">Your AI-Powered Decision Support System</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: AI Suggestions */}
        <div className="space-y-4">
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
            <button className="mt-3 text-[10px] bg-neutral-900 text-neutral-300 px-3 py-1.5 rounded-lg group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-colors">
              Discuss this with Tako
            </button>
          </div>

          {/* Card 2: Promos/Calendar */}
          <div className="bg-neutral-950 border border-neutral-800 hover:border-sky-500/30 transition-colors rounded-xl p-5 group cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <CalendarDays size={18} className="text-sky-400" />
              <h4 className="text-white font-bold text-sm">Calendar & Promos</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Next month is the establishment's anniversary. Consider a week-long 20% discount on VIP tables.
            </p>
            <button className="mt-3 text-[10px] bg-neutral-900 text-neutral-300 px-3 py-1.5 rounded-lg group-hover:bg-sky-500/20 group-hover:text-sky-400 transition-colors">
              Draft calendar schedule
            </button>
          </div>

          {/* Card 3: Earnings */}
          <div className="bg-neutral-950 border border-neutral-800 hover:border-emerald-500/30 transition-colors rounded-xl p-5 group cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp size={18} className="text-emerald-400" />
              <h4 className="text-white font-bold text-sm">Earnings Analytics</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Weekend walk-ins are up 12%, but weekday online reservations dropped 5%.
            </p>
            <button className="mt-3 text-[10px] bg-neutral-900 text-neutral-300 px-3 py-1.5 rounded-lg group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
              Analyze weak points
            </button>
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
            <p className="text-center text-[9px] text-neutral-600 mt-2">Tako bot can make mistakes. Always verify important decisions.</p>
          </div>

        </div>
      </div>
    </div>
  );
}