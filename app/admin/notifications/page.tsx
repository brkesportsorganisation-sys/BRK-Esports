'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Send, 
  CheckCircle2, 
  Bell, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  Sparkles, 
  Users, 
  User, 
  MessageSquare, 
  Search, 
  X, 
  Check, 
  Trophy, 
  ShieldAlert, 
  DollarSign, 
  Gamepad2, 
  Gift, 
  Info, 
  Link as LinkIcon, 
  ExternalLink,
  Copy,
  Eye,
  Radio,
  Clock,
  ArrowRight,
  Image as ImageIcon,
  Bot,
  Play,
  Pause,
  Plus,
  Zap,
  AlertTriangle,
  Flame,
  Calendar,
  Layers,
  ChevronRight,
  MessageCircle,
  CornerDownLeft,
  CalendarClock,
  Hash
} from 'lucide-react';
import { NotificationType, NotificationPriority, NotificationSchedule } from '@/lib/types';

interface NotificationRecipientUser {
  id: string;
  name: string;
  email: string;
  inGameName?: string;
  freeFireUid?: string;
  accountNumber?: string;
  avatar?: string;
  walletBalance?: number;
}

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  link?: string;
  imageUrl?: string;
  icon?: string;
  isRead: boolean;
  createdAt: string;
  user?: NotificationRecipientUser;
}

interface TournamentItem {
  id: string;
  title: string;
  registeredCount: number;
  maxTeams: number;
  status: string;
  prizePool?: number;
  entryFee?: number;
}

interface ChatMessage {
  id: string;
  sender: 'ADMIN' | 'AI';
  text: string;
  time: string;
  proposal?: any;
}

type AudienceMode = 'ALL' | 'ACTIVE_PLAYERS' | 'SINGLE' | 'MULTIPLE' | 'TOURNAMENT';
type ActiveTab = 'COMPOSER' | 'AI_CHAT_BOT' | 'SCHEDULES' | 'HISTORY';

const CATEGORY_CONFIG: Record<NotificationType, { label: string; icon: any; color: string; bg: string; border: string }> = {
  GENERAL: { label: 'General Announcement', icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  MATCH: { label: 'Match & Tournament', icon: Gamepad2, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  ROOM_ID: { label: 'Room ID & Pass', icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  PAYOUT: { label: 'Wallet & Payout', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  REWARD: { label: 'Reward & Bonus', icon: Gift, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  WARNING: { label: 'Security & Warning', icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  SYSTEM: { label: 'System Update', icon: Radio, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
};

const SAMPLE_IMAGE_PRESETS = [
  { label: '🏆 Booyah Trophy', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80' },
  { label: '🔥 Cyber Arena', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80' },
  { label: '💰 Golden Cashout', url: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&auto=format&fit=crop&q=80' },
  { label: '🛡️ Anti-Cheat Shield', url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80' },
];

export default function AdminNotificationsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('COMPOSER');

  // Composer state
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<NotificationType>('GENERAL');
  const [priority, setPriority] = useState<NotificationPriority>('NORMAL');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionLink, setActionLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Target users state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Conversational AI Chat Bot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'AI',
      text: 'আসসালামু আলাইকুম! 👋 আমি আপনার **AI নোটিফিকেশন ক্যাম্পেইন ম্যানেজার**।\nআপনি আমাকে বাংলায় বা ইংরেজিতে বলুন:\n- কখন নোটিফিকেশন দেওয়া শুরু করতে হবে\n- কখন শেষ করতে হবে\n- কত মিনিট পর পর পাঠাতে হবে\n- এবং মোট কয়টি মেসেজ পাঠাতে হবে।\n\nযেমন: *"আজকে সন্ধ্যা ৭টা থেকে রাত ১০টা পর্যন্ত প্রতি ৪৫ মিনিট পর পর ৪টি মেসেজ পাঠাও টুর্নামেন্ট রেজিস্ট্রেশনের জন্য"*',
      time: 'Just now',
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Schedules state
  const [schedules, setSchedules] = useState<NotificationSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [newScheduleModal, setNewScheduleModal] = useState(false);
  const [newScheduleData, setNewScheduleData] = useState({
    name: '',
    prompt: '',
    category: 'MATCH' as NotificationType,
    targetAudience: 'ALL' as 'ALL' | 'ACTIVE_PLAYERS' | 'TOURNAMENT',
    intervalMinutes: 60,
    startTime: '',
    endTime: '',
    maxRuns: 5,
    imageUrl: '',
    actionLink: '/tournaments',
    triggerImmediately: false,
  });
  const [triggeringScheduleId, setTriggeringScheduleId] = useState<string | null>(null);

  // Data state
  const [availableUsers, setAvailableUsers] = useState<NotificationRecipientUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [availableTournaments, setAvailableTournaments] = useState<TournamentItem[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);

  // History & actions state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'READ' | 'UNREAD'>('ALL');

  // Load notification history
  const loadNotifications = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/admin/notifications', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notifications history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load AI schedules
  const loadSchedules = async () => {
    setLoadingSchedules(true);
    try {
      const res = await fetch(`/api/admin/notifications/schedules?t=${Date.now()}`, { 
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadSchedules();
  }, []);

  useEffect(() => {
    if (activeTab === 'SCHEDULES') {
      loadSchedules();
    }
  }, [activeTab]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatThinking]);

  // Handle Conversational AI Chat Submission
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatThinking) return;

    const userText = chatInput.trim();
    setChatInput('');

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'ADMIN',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsChatThinking(true);

    try {
      const res = await fetch('/api/admin/notifications/ai-chat-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: userText }),
      });

      const data = await res.json();

      if (res.ok && data.replyMessage) {
        const aiMsg: ChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'AI',
          text: data.replyMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          proposal: data.scheduleProposal,
        };
        setChatMessages(prev => [...prev, aiMsg]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: 'AI',
            text: 'দুঃখিত, কমান্ডটি প্রসেস করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার বলুন।',
            time: 'Just now',
          }
        ]);
      }
    } catch (err) {
      console.error('Chat AI error:', err);
    } finally {
      setIsChatThinking(false);
    }
  };

  // Confirm AI Proposed Schedule from Chat
  const handleConfirmProposedSchedule = async (proposal: any) => {
    try {
      const res = await fetch('/api/admin/notifications/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...proposal,
          triggerImmediately: false,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(`🚀 বট সফলভাবে সক্রিয় করা হয়েছে: "${proposal.name}"!`);
        await loadSchedules();
        setActiveTab('SCHEDULES');
        setTimeout(() => setFeedbackMsg(''), 4000);
      } else {
        alert(data.message || 'Failed to activate schedule.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error creating schedule.');
    }
  };

  // AI Instant Draft Generator
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/admin/notifications/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          category: selectedCategory,
          tournamentId: selectedTournamentId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setTitle(data.data.title || '');
          setMessage(data.data.message || '');
          setSelectedCategory(data.data.category || selectedCategory);
          setPriority(data.data.priority || 'NORMAL');
          if (data.data.suggestedActionLink) {
            setActionLink(data.data.suggestedActionLink);
          }
          setAiModalOpen(false);
          setFeedbackMsg('✨ AI generated notification copy ready!');
          setTimeout(() => setFeedbackMsg(''), 3500);
        }
      }
    } catch (err) {
      console.error('AI generation error:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Send Direct Push Notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Please provide both Title and Message.');
      return;
    }

    setIsSending(true);
    setSentSuccess(false);

    try {
      const payload = {
        title,
        message,
        type: selectedCategory,
        priority,
        link: actionLink,
        imageUrl,
        targetGroup: audienceMode === 'SINGLE' || audienceMode === 'MULTIPLE' ? 'SPECIFIC' : audienceMode,
        userIds: selectedUserIds,
        tournamentId: selectedTournamentId,
      };

      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setSentSuccess(true);
        setFeedbackMsg(data.message || 'Notification dispatched successfully!');
        setTitle('');
        setMessage('');
        setActionLink('');
        setImageUrl('');
        setSelectedUserIds([]);
        loadNotifications();
        setTimeout(() => {
          setSentSuccess(false);
          setFeedbackMsg('');
        }, 5000);
      } else {
        alert(data.message || 'Failed to dispatch notification.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error occurred while sending notification.');
    } finally {
      setIsSending(false);
    }
  };

  // Create Manual Schedule with Timer
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleData.name.trim() || !newScheduleData.prompt.trim()) {
      alert('Please provide a schedule name and AI prompt.');
      return;
    }

    try {
      const res = await fetch('/api/admin/notifications/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScheduleData),
      });

      const data = await res.json();
      if (res.ok) {
        setNewScheduleModal(false);
        setFeedbackMsg('🤖 AI Notification Schedule created successfully!');
        setNewScheduleData({
          name: '',
          prompt: '',
          category: 'MATCH',
          targetAudience: 'ALL',
          intervalMinutes: 60,
          startTime: '',
          endTime: '',
          maxRuns: 5,
          imageUrl: '',
          actionLink: '/tournaments',
          triggerImmediately: false,
        });
        loadSchedules();
        loadNotifications();
        setTimeout(() => setFeedbackMsg(''), 4000);
      } else {
        alert(data.message || 'Failed to create schedule.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create schedule.');
    }
  };

  // Toggle Schedule Active State
  const handleToggleSchedule = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/notifications/schedules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      if (res.ok) {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, isActive: !currentActive } : s));
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  // Trigger Schedule Immediately
  const handleTriggerScheduleNow = async (id: string) => {
    setTriggeringScheduleId(id);
    try {
      const res = await fetch('/api/admin/notifications/schedules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, triggerNow: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(`⚡ ${data.message || 'AI notification triggered!'}`);
        loadSchedules();
        loadNotifications();
        setTimeout(() => setFeedbackMsg(''), 4000);
      } else {
        alert(data.message || 'Failed to trigger schedule.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error triggering schedule.');
    } finally {
      setTriggeringScheduleId(null);
    }
  };

  // Delete Schedule
  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AI automation schedule?')) return;
    try {
      const res = await fetch(`/api/admin/notifications/schedules?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSchedules(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Delete schedule error:', err);
    }
  };

  // Filtered History
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (historyFilter === 'READ' && !n.isRead) return false;
      if (historyFilter === 'UNREAD' && n.isRead) return false;
      if (historySearch.trim()) {
        const query = historySearch.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(query);
        const matchMsg = n.message.toLowerCase().includes(query);
        const matchUser = n.user?.name.toLowerCase().includes(query) || n.user?.email.toLowerCase().includes(query) || n.user?.accountNumber?.toLowerCase().includes(query);
        return matchTitle || matchMsg || matchUser;
      }
      return true;
    });
  }, [notifications, historyFilter, historySearch]);

  const CategoryIcon = CATEGORY_CONFIG[selectedCategory]?.icon || Info;

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-2xl">
              <Bell className="w-6 h-6 text-orange-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Notification & AI Auto-Timer Suite
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 font-bold">
                  AI CAMPAIGN V2
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Direct push with picture banners, conversational AI schedule builder, and intelligent timers.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 gap-1">
            <button
              onClick={() => setActiveTab('COMPOSER')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'COMPOSER'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Direct Push
            </button>
            <button
              onClick={() => setActiveTab('AI_CHAT_BOT')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'AI_CHAT_BOT'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chat AI Scheduler
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[9px] font-black">NEW</span>
            </button>
            <button
              onClick={() => setActiveTab('SCHEDULES')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'SCHEDULES'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Active Timers ({schedules.length})
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'HISTORY'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              History ({notifications.length})
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {feedbackMsg}
            </div>
            <button onClick={() => setFeedbackMsg('')} className="text-emerald-400/60 hover:text-emerald-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: PUSH COMPOSER */}
        {activeTab === 'COMPOSER' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <form onSubmit={handleSendNotification} className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
                
                {/* AI Magic Bar */}
                <div className="p-4 bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">AI Magic Copywriter</h4>
                      <p className="text-xs text-slate-400">Generate high-converting gamer copy in seconds</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiModalOpen(true)}
                    className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Draft with AI
                  </button>
                </div>

                {/* Audience Mode */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-400" />
                    Target Audience
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'ALL', label: 'All Players', desc: 'Broadcast' },
                      { id: 'ACTIVE_PLAYERS', label: 'Active', desc: 'Top 200' },
                      { id: 'TOURNAMENT', label: 'Tournament', desc: 'Registered' },
                      { id: 'MULTIPLE', label: 'Custom User', desc: 'Pick IDs' },
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAudienceMode(item.id as AudienceMode)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          audienceMode === item.id
                            ? 'bg-orange-500/10 border-orange-500/50 text-orange-400 shadow-sm'
                            : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className="text-[10px] text-slate-500">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category & Priority Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as NotificationType)}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                    >
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Priority Level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['NORMAL', 'HIGH', 'URGENT'] as NotificationPriority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                            priority === p
                              ? p === 'URGENT'
                                ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                                : p === 'HIGH'
                                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                : 'bg-blue-500/20 border-blue-500 text-blue-400'
                              : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Notification Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 🔥 Booyah Night: ৳5,000 Prize Pool Open Now!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Message Body */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Message Content</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Squad battle entries are filling up fast! Register your squad before 7 PM and get ready to drop into Bermuda."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                  />
                </div>

                {/* Picture / Image URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-orange-400" />
                      Picture / Banner Image URL (Optional)
                    </span>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="text-[10px] text-rose-400 hover:underline"
                      >
                        Clear Image
                      </button>
                    )}
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or direct image link"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />

                  {/* Preset Banner Quick-picks */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[10px] text-slate-500 font-bold self-center">Presets:</span>
                    {SAMPLE_IMAGE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImageUrl(preset.url)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-orange-500 hover:text-orange-400 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Link */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-orange-400" />
                    Action Link URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /tournaments or /wallet or /ads"
                    value={actionLink}
                    onChange={(e) => setActionLink(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSending || !title.trim() || !message.trim()}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-black font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Broadcasting Notification...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Dispatch Notification Now
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right: Live Preview Card */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sticky top-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-bold text-white">Mobile In-App Push Preview</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                    Live UI
                  </span>
                </div>

                {/* Simulated Phone Notification */}
                <div className="p-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl shadow-inner space-y-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-orange-400">
                      <Flame className="w-3.5 h-3.5" />
                      ESPORTS ZONE BD
                    </div>
                    <span>Just now</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${CATEGORY_CONFIG[selectedCategory]?.bg} ${CATEGORY_CONFIG[selectedCategory]?.border} border`}>
                        <CategoryIcon className={`w-5 h-5 ${CATEGORY_CONFIG[selectedCategory]?.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-white line-clamp-1">
                          {title || '🔥 Tournament Notification Title Preview'}
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-3">
                          {message || 'Your dynamic notification message will be rendered here. Fast, clear and action-oriented.'}
                        </p>
                      </div>
                    </div>

                    {imageUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 max-h-48">
                        <img
                          src={imageUrl}
                          alt="Notification Preview"
                          className="w-full h-36 object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {actionLink && (
                      <div className="pt-1">
                        <div className="w-full py-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/40 rounded-xl text-center text-xs font-bold text-orange-400 flex items-center justify-center gap-1">
                          View Event <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-800/30 border border-slate-800 rounded-2xl text-xs space-y-2 text-slate-400">
                  <div className="flex justify-between">
                    <span>Target Audience:</span>
                    <span className="font-bold text-white">{audienceMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Category:</span>
                    <span className="font-bold text-orange-400">{CATEGORY_CONFIG[selectedCategory]?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Priority:</span>
                    <span className="font-bold text-emerald-400">{priority}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CHAT AI SCHEDULER & TIMER BUILDER (NEW!) */}
        {activeTab === 'AI_CHAT_BOT' && (
          <div className="bg-slate-900/70 border border-purple-500/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl shadow-purple-950/20">
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Bot className="w-6 h-6 text-purple-400" />
                  Conversational AI Campaign Assistant
                </h2>
                <p className="text-xs text-slate-400">
                  AI কে বাংলায় বা ইংরেজিতে বলুন কয়টা মেসেজ, কখন শুরু করতে হবে, কখন শেষ করতে হবে—সব স্বয়ংক্রিয়ভাবে তৈরি হবে।
                </p>
              </div>
              <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold rounded-xl self-start sm:self-auto">
                Gemini AI Engine
              </span>
            </div>

            {/* Chat Box */}
            <div
              ref={chatScrollRef}
              className="space-y-4 max-h-[500px] overflow-y-auto p-4 bg-slate-950/80 border border-slate-800 rounded-2xl"
            >
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'AI' && (
                    <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-400 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`space-y-3 max-w-xl ${
                    msg.sender === 'ADMIN'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black rounded-2xl rounded-tr-none p-4 font-medium'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl rounded-tl-none p-4 shadow-md'
                  }`}>
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>

                    {/* AI Proposal Card */}
                    {msg.proposal && (
                      <div className="p-4 bg-slate-950 border border-purple-500/40 rounded-xl space-y-3 mt-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="font-bold text-purple-400 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4" />
                            {msg.proposal.name}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono">
                            Every {msg.proposal.intervalMinutes}m
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                          <div>
                            <span className="text-slate-500 block">Total Quota:</span>
                            <strong className="text-white">{msg.proposal.maxRuns ? `${msg.proposal.maxRuns} Messages` : 'Unlimited'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Target Audience:</span>
                            <strong className="text-orange-400">{msg.proposal.targetAudience}</strong>
                          </div>
                        </div>

                        {/* Sample Draft */}
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sample Draft:</span>
                          <div className="font-bold text-white text-xs">{msg.proposal.sampleDraftTitle}</div>
                          <div className="text-slate-300 text-[11px]">{msg.proposal.sampleDraftMessage}</div>
                        </div>

                        {/* Confirm Button */}
                        <button
                          onClick={() => handleConfirmProposedSchedule(msg.proposal)}
                          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Confirm & Launch Automated Bot
                        </button>
                      </div>
                    )}

                    <div className={`text-[10px] font-mono text-right ${msg.sender === 'ADMIN' ? 'text-black/60' : 'text-slate-500'}`}>
                      {msg.time}
                    </div>
                  </div>

                  {msg.sender === 'ADMIN' && (
                    <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isChatThinking && (
                <div className="flex items-center gap-2 text-xs text-purple-400 p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI Campaign Manager চিন্তা করছে ও শিডিউল বানাচ্ছে...
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="যেমন: আজ রাত ৮টা থেকে ১০টা পর্যন্ত প্রতি ৩০ মিনিট পর পর ৪টি নোটিফিকেশন পাঠাও..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatThinking}
                className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-500/25 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: ACTIVE SCHEDULES & TIMERS */}
        {activeTab === 'SCHEDULES' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <CalendarClock className="w-6 h-6 text-orange-400" />
                  Active AI Notification Schedulers & Timers
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  View and manage all automated timer rules, execution intervals, and quotas.
                </p>
              </div>
              <button
                onClick={() => setNewScheduleModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Manual Timer Rule
              </button>
            </div>

            {/* Schedules Grid */}
            {loadingSchedules ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
                <p className="text-sm">Loading timers...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4">
                <CalendarClock className="w-12 h-12 mx-auto text-slate-600" />
                <h3 className="text-base font-bold text-white">No Timers Active</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Talk to the AI Scheduler or create a manual timer to automatically broadcast tournament reminders.
                </p>
                <button
                  onClick={() => setActiveTab('AI_CHAT_BOT')}
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl"
                >
                  Open AI Chat Scheduler
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`p-6 rounded-3xl border transition-all space-y-4 ${
                      schedule.isActive
                        ? 'bg-slate-900/70 border-purple-500/30 shadow-lg shadow-purple-950/20'
                        : 'bg-slate-900/30 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          {schedule.category}
                        </span>
                        <h3 className="text-base font-black text-white mt-1.5">{schedule.name}</h3>
                      </div>
                      <button
                        onClick={() => handleToggleSchedule(schedule.id, schedule.isActive)}
                        className={`p-2 rounded-xl transition-all ${
                          schedule.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        }`}
                        title={schedule.isActive ? 'Pause Timer' : 'Activate Timer'}
                      >
                        {schedule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Prompt Box */}
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed font-mono">
                      <span className="text-purple-400 font-bold block mb-1">AI Prompt Guideline:</span>
                      "{schedule.prompt}"
                    </div>

                    {/* Schedule Stats */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
                      <div>
                        <span className="text-slate-500 block">Frequency</span>
                        <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-orange-400" />
                          Every {schedule.intervalMinutes}m
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Dispatched / Max</span>
                        <span className="font-bold text-emerald-400 mt-0.5 block">
                          {schedule.totalDispatched} / {schedule.maxRuns || '∞'}
                        </span>
                      </div>
                    </div>

                    {/* Start / End Time details */}
                    {(schedule.startTime || schedule.endTime) && (
                      <div className="text-[10px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl space-y-1">
                        {schedule.startTime && (
                          <div>Start: <span className="text-slate-200">{new Date(schedule.startTime).toLocaleString()}</span></div>
                        )}
                        {schedule.endTime && (
                          <div>End: <span className="text-slate-200">{new Date(schedule.endTime).toLocaleString()}</span></div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        disabled={triggeringScheduleId === schedule.id}
                        onClick={() => handleTriggerScheduleNow(schedule.id)}
                        className="flex-1 py-2 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-500/40 rounded-xl text-xs font-bold text-purple-300 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {triggeringScheduleId === schedule.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5 text-purple-400" />
                        )}
                        Trigger Cycle Now
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="p-2 text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                        title="Delete Timer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LOGS & HISTORY */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search notifications, player names, or IDs..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {(['ALL', 'UNREAD', 'READ'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setHistoryFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      historyFilter === filter
                        ? 'bg-orange-500 text-black font-black'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
                <button
                  onClick={loadNotifications}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                  title="Refresh History"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loadingHistory ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-400" />
                <p className="text-sm">Loading notification logs...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-slate-500">
                No notification logs found.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notif) => {
                  const ItemIcon = CATEGORY_CONFIG[notif.type || 'GENERAL']?.icon || Info;
                  return (
                    <div
                      key={notif.id}
                      className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl ${CATEGORY_CONFIG[notif.type || 'GENERAL']?.bg} ${CATEGORY_CONFIG[notif.type || 'GENERAL']?.border} border flex-shrink-0`}>
                          <ItemIcon className={`w-5 h-5 ${CATEGORY_CONFIG[notif.type || 'GENERAL']?.color}`} />
                        </div>

                        {notif.imageUrl && (
                          <img
                            src={notif.imageUrl}
                            alt="Notification Banner"
                            className="w-16 h-16 rounded-xl object-cover border border-slate-800 flex-shrink-0"
                          />
                        )}

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-white">{notif.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              notif.isRead ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {notif.isRead ? 'Read' : 'Unread'}
                            </span>
                            {notif.priority && notif.priority !== 'NORMAL' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                                {notif.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{notif.message}</p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                            <span>To: <strong className="text-slate-300">{notif.user?.name || notif.userId}</strong></span>
                            <span>{new Date(notif.createdAt).toLocaleString()}</span>
                            {notif.link && (
                              <a href={notif.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                                Link <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* AI Generator Modal for Push Composer */}
        {aiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl shadow-purple-950/40">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-black text-white">AI Magic Notification Generator</h3>
                </div>
                <button onClick={() => setAiModalOpen(false)} className="text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-300">
                  Write a short description or goal, and Gemini AI will automatically create an engaging push title, message, and category.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">What is this notification about?</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Announce ৳10,000 Free Fire BR weekend tournament with 48 slots and instant bKash winning payouts"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAiModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isGeneratingAI || !aiPrompt.trim()}
                  onClick={handleGenerateAI}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-500/25 disabled:opacity-50"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate & Fill Form
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Timer Modal */}
        {newScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl shadow-purple-950/40 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-black text-white">Create Manual Timer Rule</h3>
                </div>
                <button onClick={() => setNewScheduleModal(false)} className="text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSchedule} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Bot Rule Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Evening BR Match Alert Bot"
                    value={newScheduleData.name}
                    onChange={(e) => setNewScheduleData({ ...newScheduleData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">AI Prompt Guideline</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Remind all players that evening Free Fire squad tournaments are filling fast."
                    value={newScheduleData.prompt}
                    onChange={(e) => setNewScheduleData({ ...newScheduleData, prompt: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Frequency Interval</label>
                    <select
                      value={newScheduleData.intervalMinutes}
                      onChange={(e) => setNewScheduleData({ ...newScheduleData, intervalMinutes: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="15">Every 15 Minutes</option>
                      <option value="30">Every 30 Minutes</option>
                      <option value="45">Every 45 Minutes</option>
                      <option value="60">Every 1 Hour</option>
                      <option value="120">Every 2 Hours</option>
                      <option value="240">Every 4 Hours</option>
                      <option value="1440">Daily (24h)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Max Messages Quota</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="e.g. 5"
                      value={newScheduleData.maxRuns}
                      onChange={(e) => setNewScheduleData({ ...newScheduleData, maxRuns: parseInt(e.target.value, 10) || 5 })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={newScheduleData.startTime}
                      onChange={(e) => setNewScheduleData({ ...newScheduleData, startTime: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={newScheduleData.endTime}
                      onChange={(e) => setNewScheduleData({ ...newScheduleData, endTime: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setNewScheduleModal(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/25"
                  >
                    Save & Activate Timer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
