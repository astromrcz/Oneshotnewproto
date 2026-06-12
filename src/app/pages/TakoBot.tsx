import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Lightbulb, Calendar, TrendingUp, Sparkles, User, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { useAppContext } from '../context/AppContext';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function TakoBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello Manager! I am Tako bot, your all-in-one AI Manager Assistant for One Shot Bar & Billiards. How can I help you today? I can analyze your earnings, suggest marketing ideas, or plan holiday events.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { addActivity } = useAppContext();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
    setInput('');
    setIsTyping(true);
    
    addActivity('tako_action', `Asked Tako Bot: "${userMsg.substring(0, 30)}..."`);

    // Simulate AI response
    setTimeout(() => {
      let botResponse = "I'm analyzing your request. Based on our current data, I'd suggest pushing a new walk-in promo during our slow hours (2PM-5PM).";
      
      if (userMsg.toLowerCase().includes('marketing')) {
        botResponse = "For marketing, we could partner with local university orgs! Offer a 'Student Billiards League' promo code for 10% off. Should I generate the promo code for you?";
      } else if (userMsg.toLowerCase().includes('event') || userMsg.toLowerCase().includes('promo')) {
        botResponse = "Upcoming holiday idea: 'Spooky Shots Halloween Tournament'. We can block out Table 1 and 2 for the tournament bracket and charge a 500 PHP entry fee. This usually increases our beverage sales by 30%.";
      } else if (userMsg.toLowerCase().includes('earning') || userMsg.toLowerCase().includes('analytic')) {
        botResponse = "I've reviewed this week's earnings. We're up 15% in Table reservations, but down 5% in walk-in traffic. I recommend activating a temporary Happy Hour Promo to boost walk-ins tomorrow.";
      }
      
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: botResponse }]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      
      {/* Left Column: Dashboard Cards */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-1 pb-4">
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Bot size={24} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-100">Tako Bot</h2>
            <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Managerial AI Assistant</p>
          </div>
        </div>

        <Card className="bg-neutral-900 border-neutral-800 border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-neutral-200">
              <Lightbulb size={18} className="text-amber-500" />
              Marketing Ideas
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">AI-generated growth strategies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 hover:border-amber-500/50 transition-colors cursor-pointer" onClick={() => handleSuggestionClick("Generate a marketing campaign for university students")}>
              <p className="text-sm text-neutral-300 font-medium">Student Billiards League</p>
              <p className="text-xs text-neutral-500 mt-1">Target local universities with a 10% discount to fill afternoon slots.</p>
            </div>
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 hover:border-amber-500/50 transition-colors cursor-pointer" onClick={() => handleSuggestionClick("How can we improve weekend walk-in traffic?")}>
              <p className="text-sm text-neutral-300 font-medium">Weekend Walk-in Rush</p>
              <p className="text-xs text-neutral-500 mt-1">Launch a flash promo on social media every Friday at noon.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800 border-l-4 border-l-rose-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-neutral-200">
              <Calendar size={18} className="text-rose-500" />
              Suggested Events & Promos
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">Calendar arrangement & seasonal events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 hover:border-rose-500/50 transition-colors cursor-pointer" onClick={() => handleSuggestionClick("Plan a Halloween Billiards Tournament")}>
              <p className="text-sm text-neutral-300 font-medium">Spooky Shots Tournament</p>
              <p className="text-xs text-neutral-500 mt-1">October 31st. 500 PHP entry fee. Projected revenue: +30%</p>
            </div>
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 hover:border-rose-500/50 transition-colors cursor-pointer" onClick={() => handleSuggestionClick("Create a Payday Friday promo code")}>
              <p className="text-sm text-neutral-300 font-medium">Payday Friday Promo</p>
              <p className="text-xs text-neutral-500 mt-1">15% off reservations made on the 15th and 30th of the month.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-800 border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-neutral-200">
              <TrendingUp size={18} className="text-emerald-500" />
              Earnings Analytics
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">Decision support & financial analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Weekly Revenue</p>
                <p className="text-lg font-bold text-neutral-100 mt-0.5">₱ 45,250</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-emerald-400 font-bold">+15%</p>
                <p className="text-[10px] text-neutral-500">vs last week</p>
              </div>
            </div>
            <Button variant="outline" className="w-full text-xs border-neutral-700 bg-neutral-800 hover:bg-neutral-700 hover:text-white" onClick={() => handleSuggestionClick("Analyze this week's earnings and give recommendations")}>
              <Sparkles size={14} className="mr-2 text-emerald-400" />
              Ask AI to analyze trends
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* Right Column: Chat Interface */}
      <Card className="w-full lg:w-2/3 flex flex-col bg-neutral-950 border-neutral-800 h-[calc(100vh-8rem)]">
        <CardHeader className="border-b border-neutral-800 bg-neutral-900 rounded-t-xl pb-4">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-400">
            <Bot size={20} />
            Chat with Tako Bot
          </CardTitle>
          <CardDescription className="text-neutral-500">Your AI decision support system</CardDescription>
        </CardHeader>
        
        <div className="flex-1 overflow-hidden p-4 relative" ref={scrollRef} style={{ overflowY: 'auto' }}>
          <div className="space-y-6 max-w-3xl mx-auto pb-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-purple-400" />
                  </div>
                )}
                
                <div className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.role === 'user' 
                    ? 'bg-amber-500 text-neutral-950 rounded-tr-sm font-medium' 
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-sm'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center flex-shrink-0 mt-1">
                    <User size={16} className="text-amber-400" />
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={16} className="text-purple-400" />
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2 text-purple-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs font-medium">Tako Bot is thinking...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-neutral-800 bg-neutral-900 rounded-b-xl">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2 max-w-3xl mx-auto"
          >
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Tako bot to analyze earnings or suggest an event..." 
              className="flex-1 bg-neutral-950 border-neutral-800 focus-visible:ring-purple-500"
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isTyping}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Send size={18} className="mr-2" />
              Send
            </Button>
          </form>
          <div className="mt-2 text-center">
            <p className="text-[10px] text-neutral-600">Tako Bot can make mistakes. Consider verifying important financial decisions.</p>
          </div>
        </div>
      </Card>

    </div>
  );
}
