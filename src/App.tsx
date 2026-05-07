import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  Heart, 
  Plus, 
  MessageCircle, 
  History, 
  Send, 
  User, 
  Weight, 
  Activity, 
  MapPin, 
  Calendar as CalendarIcon, 
  Smile, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  Clock,
  Trash2,
  Stethoscope
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Toaster } from "@/components/ui/sonner"
import { format, differenceInDays, parseISO, addDays, getWeek } from 'date-fns';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { Profile, HealthLog, ChatMessage } from './types';
import { cn } from '@/lib/utils';

// Constants
const CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 0 };
const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #E5E0D8',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  fontSize: '12px'
};

const MOODS = [
  { score: 5, label: 'Joyful', emoji: '🌟' },
  { score: 4, label: 'Calm', emoji: '🌿' },
  { score: 3, label: 'Okay', emoji: '☁️' },
  { score: 2, label: 'Anxious', emoji: '🌊' },
  { score: 1, label: 'Low', emoji: '🌑' },
];

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior
        });
      }
    }
  }, []);

  useEffect(() => {
    // Scroll immediately on first load or when typing starts, smooth otherwise
    scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth');
  }, [messages, isTyping, scrollToBottom]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [profileRes, logsRes, chatRes] = await Promise.all([
        axios.get('/api/profile'),
        axios.get('/api/logs'),
        axios.get('/api/chat/history')
      ]);
      setProfile(profileRes.data);
      setLogs(logsRes.data);
      setMessages(chatRes.data);

      // Open profile dialog if basic info is missing
      if (!profileRes.data.due_date && !profileRes.data.last_period_date) {
        setIsProfileOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSendMessage = async (e?: React.FormEvent, starterText?: string) => {
    if (e) e.preventDefault();
    const text = starterText || input;
    if (!text.trim()) return;

    const newUserMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMsg]);
    if (!starterText) setInput('');
    setIsTyping(true);
    setIsCooldown(true);

    // 5 second cooldown for Gemini free tier
    setTimeout(() => setIsCooldown(false), 5000);

    try {
      const res = await axios.post('/api/chat', { message: text });
      setMessages(prev => [...prev, res.data.message]);
      
      // Refresh logs to capture any auto-logged health data
      const logsRes = await axios.get('/api/logs');
      setLogs(logsRes.data);
    } catch (err: any) {
      console.error('Chat error', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to send message';
      toast.error(errorMessage);
    } finally {
      setIsTyping(false);
    }
  };

  const addLog = async (type: HealthLog['type'], data: any) => {
    try {
      const res = await axios.post('/api/logs', { type, data });
      setLogs(prev => [res.data, ...prev]);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} logged`);
    } catch (err) {
      console.error('Add log error', err);
    }
  };

  const deleteLog = async (id: string) => {
    try {
      await axios.delete(`/api/logs/${id}`);
      setLogs(prev => prev.filter(l => l.id !== id));
      toast.info('Deleted');
    } catch (err) {
      console.error('Delete log error', err);
    }
  };

  const clearChat = async () => {
    try {
      await axios.delete('/api/chat/history');
      setMessages([]);
      toast.info('Chat history cleared');
    } catch (err) {
      console.error('Clear chat error', err);
    }
  };

  const saveProfile = async (data: Partial<Profile>) => {
    try {
      await axios.put('/api/profile', data);
      setProfile(prev => prev ? { ...prev, ...data as Profile } : data as Profile);
      setIsProfileOpen(false);
      toast.success('Profile updated');
    } catch (err) {
      console.error('Save profile error', err);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bone">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-sage flex items-center justify-center animate-pulse">
          <Heart className="text-white w-6 h-6" />
        </div>
        <p className="text-sage font-serif italic">Loading Aanya...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border-custom bg-white/80 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center">
              <Heart className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold leading-none text-sage">Aanya</h1>
              <p className="text-[10px] uppercase tracking-widest text-ink-muted">Maternal Healthcare AI</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-ink hidden sm:block">Hi, {profile?.name || 'Mom'}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full hover:bg-surface"
              onClick={() => setIsProfileOpen(true)}
              data-testid="profile-button"
            >
              <User className="w-5 h-5 text-sage" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        
        {/* Dashboard Area (65%) */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <PregnancySummary profile={profile} />
            <KicksCounter logs={logs} onAdd={addLog} />
            <MoodTracker logs={logs} onAdd={addLog} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <HealthChart 
              title="Weight Progress" 
              type="weight" 
              logs={logs} 
              onAdd={addLog} 
              dataKey="kg" 
              yLabel="Weight (kg)" 
              color="#4A6B5D"
            />
            <BloodPressureChart logs={logs} onAdd={addLog} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
             <HealthChart 
              title="Heart Rate" 
              type="hr" 
              logs={logs} 
              onAdd={addLog} 
              dataKey="bpm" 
              yLabel="BPM" 
              color="#D47A6A"
            />
            <SymptomsBox logs={logs} onAdd={addLog} />
            <AppointmentsBox logs={logs} onAdd={addLog} onDelete={deleteLog} />
          </div>
        </div>

        {/* Chatbot Area (35%, Sticky) */}
        <div className="relative h-[calc(100vh-140px)] min-h-[500px] lg:sticky lg:top-24">
          <div className="h-full flex flex-col bg-white rounded-3xl border border-border-custom shadow-custom overflow-hidden">
            <div className="p-4 border-b border-border-custom flex items-center justify-between bg-surface/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center">
                  <Sparkles className="text-white w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-sage">Talk to Aanya</h3>
                  <p className="text-[10px] uppercase text-ink-muted">Powered by Gemini 2.5 Flash</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={clearChat} className="h-8 text-xs text-ink-muted hover:text-terracotta">
                Clear
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0 container-overflow-fix" ref={scrollRef}>
              <div className="p-4 space-y-4 pb-8">
                {messages.length === 0 && (
                  <div className="py-8 text-center space-y-6">
                    <div className="space-y-2">
                       <p className="text-sm font-medium text-sage">Hello! I'm Aanya.</p>
                       <p className="text-xs text-ink-muted px-4">I'm here to support you through your pregnancy journey with evidence-based guidance and empathy.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 px-2">
                      {[
                        "What foods should I avoid in trimester 2?",
                        "I felt nauseous and tired today.",
                        "How can I track baby's kicks safely?",
                        "What's a healthy weight gain pace?"
                      ].map(starter => (
                        <Button 
                          key={starter} 
                          variant="outline" 
                          className="justify-start h-auto py-2 text-xs font-normal border-border-custom bg-bone/50 hover:bg-surface text-left"
                          onClick={() => handleSendMessage(undefined, starter)}
                        >
                          {starter}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex w-full",
                      m.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[85%] text-sm leading-relaxed break-words overflow-wrap-anywhere",
                      m.role === 'user' ? "chat-bubble-user" : "chat-bubble-assistant"
                    )}>
                      {m.content}
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="chat-bubble-assistant py-2 px-4 italic text-ink-muted text-xs animate-pulse">
                      Aanya is typing...
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 bg-bone/30 border-t border-border-custom shrink-0">
              <form 
                onSubmit={handleSendMessage}
                className="relative"
              >
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="pr-12 min-h-[80px] bg-white border-border-custom text-sm focus:ring-sage rounded-2xl resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  data-testid="chat-input"
                />
                <Button 
                  size="icon" 
                  type="submit"
                  disabled={!input.trim() || isTyping || isCooldown}
                  className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-sage hover:bg-sage-hover text-white transition-all shadow-lg shadow-sage/20 disabled:bg-sand"
                  data-testid="send-button"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-[9px] text-center mt-3 text-ink-muted">
                Aanya is an AI assistant and is not a substitute for professional medical advice.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Profile Dialog */}
      <ProfileDialog 
        open={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        profile={profile} 
        onSave={saveProfile} 
      />

      <footer className="py-12 border-t border-border-custom bg-bone/50">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col items-center text-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-sage flex items-center justify-center opacity-60">
              <Heart className="text-white w-3 h-3" />
            </div>
            <span className="font-serif text-lg text-sage">Aanya</span>
          </div>
          <p className="text-xs text-ink-muted max-w-xl italic">
            "Every child begins with a mother's hope. We are here to nurture that hope with care and wisdom."
          </p>
          <div className="text-[10px] text-ink-muted/60 uppercase tracking-[0.2em] mt-2">
            &copy; 2024 Aanya — Maternal Care Initiative
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Dashboard Components ---

function PregnancySummary({ profile }: { profile: Profile | null }) {
  if (!profile) return null;

  const summary = useMemo(() => {
    let date = profile.due_date ? parseISO(profile.due_date) : null;
    if (!date && profile.last_period_date) {
      date = addDays(parseISO(profile.last_period_date), 280);
    }
    if (!date) return null;

    const totalDays = 280;
    const remainingDays = Math.max(0, differenceInDays(date, new Date()));
    const daysPassed = totalDays - remainingDays;
    const progress = (daysPassed / totalDays) * 100;
    const weeks = Math.floor(daysPassed / 7);
    const days = daysPassed % 7;
    const trimester = weeks < 13 ? 1 : weeks < 27 ? 2 : 3;

    return { weeks, days, trimester, progress, remainingDays, dueDate: date };
  }, [profile]);

  if (!summary) return (
    <Card className="rounded-3xl border-none shadow-custom bg-white">
      <CardContent className="pt-6 text-center">
         <div className="w-12 h-12 rounded-full bg-surface mx-auto flex items-center justify-center mb-4">
           <CalendarIcon className="text-sage w-6 h-6" />
         </div>
         <p className="text-sm font-medium">No pregnancy info set</p>
         <p className="text-xs text-ink-muted mt-2">Update your profile to track progress</p>
      </CardContent>
    </Card>
  );

  return (
    <Card className="rounded-3xl border-none shadow-custom bg-white overflow-hidden">
      <div className="h-1 bg-surface w-full">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${summary.progress}%` }}
          className="h-full bg-sage"
        />
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="font-serif text-3xl font-semibold text-sage">Week {summary.weeks}</CardTitle>
          <Badge variant="outline" className="bg-bone/50 border-sage/20 text-sage uppercase text-[10px] px-2 py-0.5">
            Trimester {summary.trimester}
          </Badge>
        </div>
        <CardDescription className="text-ink-muted">+{summary.days} days along</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
           <div className="flex justify-between text-xs">
             <span className="text-ink-muted font-medium">Progress</span>
             <span className="text-sage font-bold">{summary.progress.toFixed(0)}%</span>
           </div>
           <div className="flex items-center gap-3 bg-bone p-3 rounded-2xl">
             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
               <Clock className="w-4 h-4 text-terracotta" />
             </div>
             <div>
               <p className="text-xs font-semibold text-ink">{summary.remainingDays} days to go</p>
               <p className="text-[10px] text-ink-muted">Estimated: {format(summary.dueDate, 'MMM d, yyyy')}</p>
             </div>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KicksCounter({ logs, onAdd }: { logs: HealthLog[], onAdd: (t: any, d: any) => void }) {
  const todayKicks = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return logs
      .filter(l => l.type === 'kicks' && format(parseISO(l.timestamp), 'yyyy-MM-dd') === today)
      .reduce((sum, l) => sum + (l.data.count || 0), 0);
  }, [logs]);

  return (
    <Card className="rounded-3xl border-none shadow-custom bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-serif">Kicks Today</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <button 
          onClick={() => onAdd('kicks', { count: 1 })}
          className="w-24 h-24 rounded-full bg-terracotta text-white flex flex-col items-center justify-center transition-all active:scale-95 shadow-lg shadow-terracotta/20 hover:bg-terracotta/90 group"
        >
          <span className="text-3xl font-bold">{todayKicks}</span>
          <Plus className="w-4 h-4 mt-1 opacity-60 group-hover:opacity-100" />
        </button>
        <p className="text-[10px] uppercase tracking-wider text-ink-muted mt-4">Tap to count a kick</p>
      </CardContent>
    </Card>
  );
}

function MoodTracker({ logs, onAdd }: { logs: HealthLog[], onAdd: (t: any, d: any) => void }) {
  const recentMoods = useMemo(() => {
    return logs
      .filter(l => l.type === 'mood')
      .slice(0, 7)
      .map(l => ({ label: l.data.label, emoji: MOODS.find(m => m.label === l.data.label)?.emoji || '✨' }));
  }, [logs]);

  return (
    <Card className="rounded-3xl border-none shadow-custom bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-serif">Mood Today</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between gap-1 mb-6">
          {MOODS.map(m => (
            <Button
              key={m.label}
              variant="ghost"
              size="icon"
              className="flex-1 h-12 flex flex-col items-center justify-center hover:bg-surface rounded-xl"
              onClick={() => onAdd('mood', { score: m.score, label: m.label })}
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="text-[8px] uppercase font-bold text-ink-muted mt-1">{m.label}</span>
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-bold text-ink-muted/60">Recently</p>
          <div className="flex flex-wrap gap-2">
            {recentMoods.map((m, i) => (
              <Badge key={i} variant="secondary" className="bg-bone border-none text-ink font-normal gap-1">
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthChart({ 
  title, 
  type, 
  logs, 
  onAdd, 
  dataKey, 
  yLabel, 
  color 
}: { 
  title: string, 
  type: string, 
  logs: HealthLog[], 
  onAdd: (t: any, d: any) => void,
  dataKey: string,
  yLabel: string,
  color: string
}) {
  const [val, setVal] = useState('');
  const data = useMemo(() => {
    return logs
      .filter(l => l.type === type)
      .slice(0, 30)
      .reverse()
      .map(l => ({
        date: format(parseISO(l.timestamp), 'MM/dd'),
        [dataKey]: l.data[dataKey]
      }));
  }, [logs, type, dataKey]);

  return (
    <Card className="rounded-3xl border-none shadow-custom bg-white">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-lg font-serif">{title}</CardTitle>
        <div className="flex gap-2">
           <Input 
             type="number" 
             value={val} 
             onChange={(e) => setVal(e.target.value)}
             className="w-16 h-8 text-xs rounded-lg border-border-custom bg-bone/50"
             placeholder={yLabel}
           />
           <Button 
             size="icon" 
             variant="ghost" 
             className="h-8 w-8 rounded-lg bg-surface hover:bg-sand"
             onClick={() => {
               if (val) {
                 onAdd(type as any, { [dataKey]: Number(val) });
                 setVal('');
               }
             }}
           >
             <Plus className="w-4 h-4 text-sage" />
           </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3EFE9" />
              <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#5C6661' }} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#5C6661' }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                fillOpacity={1} 
                fill={`url(#grad-${type})`} 
                strokeWidth={2}
                dot={{ r: 3, fill: color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function BloodPressureChart({ logs, onAdd }: { logs: HealthLog[], onAdd: (t: any, d: any) => void }) {
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');

  const data = useMemo(() => {
    return logs
      .filter(l => l.type === 'bp')
      .slice(0, 30)
      .reverse()
      .map(l => ({
        date: format(parseISO(l.timestamp), 'MM/dd'),
        systolic: l.data.systolic,
        diastolic: l.data.diastolic
      }));
  }, [logs]);

  return (
    <Card className="rounded-3xl border-none shadow-custom bg-white">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-lg font-serif">Blood Pressure</CardTitle>
        <div className="flex gap-1">
           <Input 
             type="number" 
             value={sys} 
             onChange={(e) => setSys(e.target.value)}
             className="w-14 h-8 text-[10px] rounded-lg border-border-custom bg-bone/50"
             placeholder="Sys"
           />
           <Input 
             type="number" 
             value={dia} 
             onChange={(e) => setDia(e.target.value)}
             className="w-14 h-8 text-[10px] rounded-lg border-border-custom bg-bone/50"
             placeholder="Dia"
           />
           <Button 
             size="icon" 
             className="h-8 w-8 rounded-lg bg-sage hover:bg-sage-hover text-white transition-colors"
             onClick={() => {
               if (sys && dia) {
                 onAdd('bp', { systolic: Number(sys), diastolic: Number(dia) });
                 setSys(''); setDia('');
               }
             }}
           >
             <Plus className="w-4 h-4" />
           </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADEC8" />
              <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#5C6661' }} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#5C6661' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="systolic" stroke="#D47A6A" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="diastolic" stroke="#4A6B5D" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function SymptomsBox({ logs, onAdd }: { logs: HealthLog[], onAdd: (t: any, d: any) => void }) {
  const [val, setVal] = useState('');
  const recentSymptoms = useMemo(() => {
    return logs.filter(l => l.type === 'symptom').slice(0, 10);
  }, [logs]);

  return (
    <Card className="rounded-3xl border-none shadow-custom bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-serif">Symptoms</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
           <Input 
             value={val} 
             onChange={(e) => setVal(e.target.value)}
             className="h-9 text-xs rounded-xl border-border-custom bg-bone/50"
             placeholder="e.g. Nausea"
           />
           <Button 
             size="icon" 
             className="h-9 w-9 rounded-xl bg-surface hover:bg-sand shrink-0 shadow-sm"
             onClick={() => {
               if (val) {
                 onAdd('symptom', { name: val });
                 setVal('');
               }
             }}
           >
             <Plus className="w-4 h-4 text-sage" />
           </Button>
        </div>
        <ScrollArea className="h-[100px]">
          <div className="flex flex-wrap gap-2">
            {recentSymptoms.map((l) => (
              <Badge key={l.id} variant="secondary" className="bg-surface/50 border-none text-ink-muted text-[10px] py-1 px-3">
                {l.data.name}
              </Badge>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AppointmentsBox({ logs, onAdd, onDelete }: { logs: HealthLog[], onAdd: (t: any, d: any) => void, onDelete: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date>();

  const upcoming = useMemo(() => {
    return logs
      .filter(l => l.type === 'appointment')
      .map(l => ({ ...l, date: parseISO(l.data.date) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [logs]);

  return (
    <Card className="rounded-3xl border-none shadow-custom bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-serif">Appointments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
           <Input 
             value={title} 
             onChange={(e) => setTitle(e.target.value)}
             className="h-8 text-xs rounded-lg border-border-custom"
             placeholder="Appointment title"
           />
           <div className="flex gap-2">
             <Popover>
               <PopoverTrigger className={cn(buttonVariants({ variant: "outline" }), "h-8 flex-1 text-[10px] justify-start text-ink-muted border-border-custom")}>
                 <CalendarIcon className="mr-2 h-3 w-3" />
                 {date ? format(date, 'MMM d') : 'Pick date'}
               </PopoverTrigger>
               <PopoverContent className="w-auto p-0 rounded-2xl">
                 <Calendar mode="single" selected={date} onSelect={setDate} />
               </PopoverContent>
             </Popover>
             <Button 
               size="sm" 
               className="h-8 bg-sage hover:bg-sage-hover text-white text-[10px]"
               onClick={() => {
                 if (title && date) {
                   onAdd('appointment', { title, date: date.toISOString() });
                   setTitle(''); setDate(undefined);
                 }
               }}
             >
               Add
             </Button>
           </div>
        </div>
        <div className="space-y-2">
          {upcoming.map(l => (
             <div key={l.id} className="flex items-center justify-between group p-2 rounded-xl hover:bg-bone transition-colors">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
                   <Stethoscope className="w-4 h-4 text-sage" />
                 </div>
                 <div className="overflow-hidden">
                   <p className="text-xs font-semibold text-ink truncate">{l.data.title}</p>
                   <p className="text-[10px] text-ink-muted">{format(l.date, 'MMM d, h:mm a')}</p>
                 </div>
               </div>
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-6 w-6 opacity-0 group-hover:opacity-100 text-terracotta hover:bg-white"
                 onClick={() => onDelete(l.id)}
               >
                 <Trash2 className="w-3 h-3" />
               </Button>
             </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileDialog({ open, onClose, profile, onSave }: { 
  open: boolean, 
  onClose: () => void, 
  profile: Profile | null, 
  onSave: (data: Partial<Profile>) => void 
}) {
  const [formData, setFormData] = useState<Partial<Profile>>({});

  useEffect(() => {
    if (profile) setFormData(profile);
  }, [profile]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-sage">Your Profile</DialogTitle>
          <CardDescription>
            Help Aanya personalize your maternal health experience.
          </CardDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium text-ink-muted">Name</label>
            <Input 
              value={formData.name || ''} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="col-span-3 rounded-xl border-border-custom" 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium text-ink-muted">Age</label>
            <Input 
              type="number" 
              value={formData.age || ''} 
              onChange={e => setFormData({ ...formData, age: e.target.value })}
              className="col-span-3 rounded-xl border-border-custom" 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium text-ink-muted text-[10px] leading-tight">Due Date</label>
            <div className="col-span-3">
              <Input 
                type="date" 
                value={formData.due_date ? formData.due_date.split('T')[0] : ''} 
                onChange={e => setFormData({ ...formData, due_date: new Date(e.target.value).toISOString() })}
                className="rounded-xl border-border-custom" 
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right text-sm font-medium text-ink-muted text-[10px] leading-tight">Last Period</label>
            <div className="col-span-3">
              <Input 
                type="date" 
                value={formData.last_period_date ? formData.last_period_date.split('T')[0] : ''} 
                onChange={e => setFormData({ ...formData, last_period_date: new Date(e.target.value).toISOString() })}
                className="rounded-xl border-border-custom" 
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <label className="text-right text-sm font-medium text-ink-muted pt-2">Notes</label>
            <Textarea 
              value={formData.notes || ''} 
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="col-span-3 rounded-xl border-border-custom min-h-[80px]" 
              placeholder="Any medical history or preferences..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            className="w-full rounded-full bg-sage hover:bg-sage-hover text-white h-11"
            onClick={() => onSave(formData)}
          >
            Save Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
