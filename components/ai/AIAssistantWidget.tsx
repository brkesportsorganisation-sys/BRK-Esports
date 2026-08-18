'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  RefreshCw, 
  Flame, 
  Gamepad2, 
  DollarSign, 
  Trophy, 
  ShieldAlert, 
  User, 
  MessageSquare, 
  ChevronDown, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Gift, 
  Crosshair, 
  Users, 
  ExternalLink, 
  ArrowRight,
  Zap,
  Radio,
  Headphones
} from 'lucide-react';
import { db } from '@/lib/db';
import { User as UserType, SupportTicket, SupportMessage } from '@/lib/types';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    link: string;
    icon?: string;
  };
}

const COACHING_PILLS = [
  { id: 'whatsapp', label: '💬 WhatsApp Support', query: 'I need to chat directly with Black Rock Esports Admin on WhatsApp' },
  { id: 'tournaments', label: '🏆 Live Tournaments', query: 'What active Free Fire tournaments are open for registration right now?' },
  { id: 'sens', label: '🎯 Headshot Sensitivities', query: 'What is the best Free Fire drag-headshot sensitivity and DPI settings for mobile?' },
  { id: 'combo', label: '⚡ Meta Character Combo', query: 'What are the top Free Fire character skill combos and gun loadouts for rushers?' },
  { id: 'room', label: '🔑 How to get Room ID?', query: 'How and when will I get the Custom Room ID and Password for my match?' },
  { id: 'wallet', label: '💰 bKash Cashout Guide', query: 'How does prize money payout work and how to withdraw to bKash/Nagad?' },
  { id: 'spin', label: '🎁 Free Spin & Diamonds', query: 'How can I get free coins, spins, and diamond rewards on Black Rock Esports?' }
];

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeTab, setActiveTab] = useState<'AI' | 'ADMIN_SUPPORT'>('ADMIN_SUPPORT');

  // Support Mode State
  const [supportTicket, setSupportTicket] = useState<SupportTicket | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportInput, setSupportInput] = useState('');
  const [sendingSupportMsg, setSendingSupportMsg] = useState(false);
  const [loadingSupport, setLoadingSupport] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 আসসালামু আলাইকুম! আমি **AI Assistant**, Black Rock Esports এর অফিসিয়াল **২৪/৭ স্মার্ট অ্যাসিস্ট্যান্ট**।\n\n🎯 **আমি আপনাকে যেকোনো বিষয়ে সাহায্য করতে পারি:**\n- লাইভ টুর্নামেন্ট শিডিউল ও স্লট বুকিং\n- কাস্টম রুম আইডি ও পাসওয়ার্ড তথ্য\n- সেরা হেডশট সেনসিটিভিটি ও DPI সেটিংস\n- রাশ ও স্নাইপার ক্যারেক্টার স্কিল কম্বো\n- বিকাশ/নগদ ইনস্ট্যান্ট প্রাইজমানি ক্যাশআউট\n\nযেকোনো প্রশ্ন বাংলায় লিখুন বা মাইক্রোফোনে বলুন!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supportEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Load User and Support Messages
  const loadSupportData = async (user: UserType | null) => {
    const uid = user ? user.id : 'guest_user';
    setLoadingSupport(true);
    try {
      const res = await fetch(`/api/support?userId=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setSupportTicket(data.ticket || null);
        setSupportMessages(data.messages || []);
        setTimeout(() => supportEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch {}
    finally {
      setLoadingSupport(false);
    }
  };

  useEffect(() => {
    const u = db.getCurrentUser();
    setCurrentUser(u);
    if (isOpen) {
      loadSupportData(u);
    }
  }, [isOpen]);

  // Support Polling when open and in Admin Support tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'ADMIN_SUPPORT') return;
    const uid = currentUser ? currentUser.id : 'guest_user';
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/support?userId=${uid}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length !== supportMessages.length) {
            setSupportMessages(data.messages);
            supportEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }
          if (data.ticket) {
            setSupportTicket(data.ticket);
          }
        }
      } catch {}
    }, 3500);
    return () => clearInterval(interval);
  }, [isOpen, activeTab, currentUser?.id, supportMessages.length]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Web Speech API for Bangla Voice Input
  const toggleVoiceInput = async () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) {
      alert('ভয়েস ইনপুটের জন্য অনুগ্রহ করে Google Chrome, Edge অথবা Safari ব্রাউজার ব্যবহার করুন।');
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    try {
      // Explicitly check / prompt for microphone permission
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // Create a fresh instance to avoid state lockups
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'bn-BD'; // Bangla (Bangladesh)
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const recognizedText = finalTranscript || interimTranscript;
        if (recognizedText) {
          setInput(recognizedText);
        }

        if (finalTranscript.trim()) {
          setTimeout(() => {
            handleSendMessage(finalTranscript.trim());
          }, 300);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech Recognition Event Error:', event?.error);
        setIsListening(false);
        if (event?.error === 'not-allowed' || event?.error === 'permission-denied') {
          alert('অনুগ্রহ করে আপনার ব্রাউজারের সেটিংস থেকে মাইক্রোফোন পারমিশন (Allow Microphone) চালু করুন।');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Voice input start error:', err);
      setIsListening(false);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        alert('মাইক্রোফোন পারমিশন দেওয়া হয়নি। ব্রাউজারের অ্যাড্রেস বারের লক আইকনে ক্লিক করে Microphone "Allow" করুন।');
      }
    }
  };

  // Natural Bangla Text-To-Speech (TTS)
  const speakMessage = (text: string, msgId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text for natural Bangla pronunciation
    const cleanText = text
      .replace(/[*_#`~>]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = 'bn-BD';

    // Prioritize Bangla Voices
    const voices = window.speechSynthesis.getVoices();
    const banglaVoice = voices.find(v => 
      v.lang.toLowerCase().includes('bn') || 
      v.lang.toLowerCase().includes('bengali') || 
      v.name.toLowerCase().includes('bangla') || 
      v.name.toLowerCase().includes('bengali')
    );

    if (banglaVoice) {
      utterance.voice = banglaVoice;
    }

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          userContext: currentUser ? {
            name: currentUser.name,
            inGameName: currentUser.inGameName,
            freeFireUid: currentUser.freeFireUid,
            walletBalance: currentUser.walletBalance,
            role: currentUser.role
          } : {}
        })
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        const assistantMsg: Message = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedAction: data.suggestedAction || undefined
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'assistant',
            content: "⚠️ দুঃখিত, সার্ভার রেসপন্স করতে সাময়িক সমস্যা হয়েছে। আপনি কি প্রশ্নটি আবার করবেন?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: "🤖 **AI Assistant:** সার্ভারে কানেক্ট করা যাচ্ছে না। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (speakingId) {
      window.speechSynthesis?.cancel();
      setSpeakingId(null);
    }
    if (activeTab === 'AI') {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "✨ চ্যাট হিস্ট্রি ক্লিয়ার করা হয়েছে। নতুন কোনো টুর্নামেন্ট তথ্য, ট্রিকস বা সাহায্য লাগলে বলুন!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const handleSendSupportMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supportInput.trim() || sendingSupportMsg) return;

    const content = supportInput.trim();
    setSupportInput('');
    setSendingSupportMsg(true);

    const uid = currentUser ? currentUser.id : 'guest_user';
    const uName = currentUser ? (currentUser.inGameName || currentUser.name) : 'Guest Player';
    const uEmail = currentUser?.email;
    const uPhone = currentUser?.phone || currentUser?.accountNumber;

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_USER_MESSAGE',
          userId: uid,
          userName: uName,
          userEmail: uEmail,
          userPhone: uPhone,
          content,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSupportTicket(data.ticket || null);
        setSupportMessages(data.messages || []);
        setTimeout(() => supportEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (err) {
      console.warn('Failed to send support message:', err);
    } finally {
      setSendingSupportMsg(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Launcher */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsOpen(true)}
              className="relative group px-4 py-3 sm:px-5 sm:py-3.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-xl shadow-emerald-500/30 border border-white/20 flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer"
              aria-label="Open WhatsApp & AI Assistant"
            >
              {/* Glowing Pulse Aura */}
              <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-60 blur-md group-hover:opacity-100 transition duration-300 animate-pulse" />
              
              <div className="relative flex items-center gap-2.5">
                {/* Official WhatsApp Icon */}
                <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                  <svg className="w-4.5 h-4.5 fill-white" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-heading font-black text-xs uppercase tracking-wider text-white leading-none">
                    Support & Chat
                  </span>
                  <span className="text-[9px] text-emerald-100 font-medium">
                    24/7 Admin & AI
                  </span>
                </div>
              </div>

              {/* Online Indicator Badge */}
              <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-emerald-300 border-2 border-slate-900 rounded-full animate-ping" />
              <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Floating or Expanded Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed z-50 flex flex-col bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden font-sans transition-all duration-300 ${
              isExpanded 
                ? 'inset-4 md:inset-10' 
                : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[420px] md:w-[460px] h-[640px] max-h-[88vh]'
            }`}
          >
            {/* Header */}
            <div className="relative p-3.5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md text-white">
                    <Headphones className="w-4.5 h-4.5" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-sm text-white tracking-wide">
                      Black Rock Support Desk
                    </h3>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    ২৪/৭ লাইভ অ্যাডমিন ও এআই সাপোর্ট
                  </p>
                </div>
              </div>

              {/* Window Controls + Direct WhatsApp Contact */}
              <div className="flex items-center gap-1">
                <a
                  href="https://discord.gg/blackrock-esports"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Join Discord Server"
                  className="px-2 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <span>Discord</span>
                </a>

                <a
                  href="https://wa.me/8801700000000?text=Hello%20Black%20Rock%20Esports%20Support%2C%20I%20need%20help"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Direct WhatsApp Support"
                  className="px-2 py-1 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <span>WhatsApp</span>
                </a>

                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Minimize' : 'Expand'}
                  className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    if (speakingId) {
                      window.speechSynthesis?.cancel();
                      setSpeakingId(null);
                    }
                    setIsOpen(false);
                  }}
                  title="Close Helpdesk"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="p-1.5 bg-slate-900 border-b border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setActiveTab('ADMIN_SUPPORT')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-heading font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'ADMIN_SUPPORT'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>👨‍💼 Live Admin Support</span>
              </button>

              <button
                onClick={() => setActiveTab('AI')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-heading font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'AI'
                    ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>🤖 AI Smart Coach</span>
              </button>
            </div>

            {/* TAB 1: LIVE ADMIN SUPPORT */}
            {activeTab === 'ADMIN_SUPPORT' ? (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
                {/* Support Messages Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
                  {/* Default Welcome & Discord Banner */}
                  <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-800/60 text-white text-xs space-y-2.5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-black text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        Black Rock Official Helpdesk
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                        Live Agent Online
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      যেকোনো টুর্নামেন্ট সমস্যা, রুম আইডি বা বিকাশ পেমেন্ট সংক্রান্ত বিষয়ে মেসেজ দিন। আমাদের অ্যাডমিন সরাসরি রিপ্লাই দেবেন।
                    </p>
                    <a
                      href="https://discord.gg/blackrock-esports"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <span>👉 Join Discord for Instant Support</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Render Message History */}
                  {supportMessages.map((msg) => {
                    const isUser = msg.senderRole === 'USER';
                    const isSystem = msg.senderRole === 'SYSTEM';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="p-3.5 rounded-2xl bg-slate-900 border border-indigo-500/30 text-slate-200 text-xs space-y-2 shadow-sm">
                          <div className="flex items-center gap-1.5 font-bold text-indigo-400 text-[11px]">
                            <Bot className="w-3.5 h-3.5" />
                            <span>অটোমেটেড সাপোর্ট মেসেজ</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed text-[11px]">
                            {msg.content}
                          </p>
                          <div className="text-[9px] text-slate-500 font-mono text-right">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1 mb-1 px-1">
                          <span className="text-[10px] font-bold text-slate-400">
                            {isUser ? 'You' : '🛡️ Admin Support'}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${
                            isUser
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs'
                              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}

                  <div ref={supportEndRef} />
                </div>

                {/* Support Message Input */}
                <form onSubmit={handleSendSupportMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="আপনার সমস্যার কথা বিস্তারিত লিখুন..."
                    value={supportInput}
                    onChange={(e) => setSupportInput(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!supportInput.trim() || sendingSupportMsg}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white shadow-md disabled:opacity-40 transition-all cursor-pointer flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              /* TAB 2: AI SMART COACH */
              <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
                {/* Quick Suggestion Pills */}
                <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 overflow-x-auto scrollbar-none flex items-center gap-1.5">
                  {COACHING_PILLS.map((pill) => (
                    <button
                      key={pill.id}
                      onClick={() => handleSendMessage(pill.query)}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-orange-500/20 hover:border-orange-500/40 border border-slate-700 text-slate-300 hover:text-orange-400 transition-all flex-shrink-0 flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
                  {messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {!isUser && (
                          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand-red to-brand-orange text-white flex items-center justify-center flex-shrink-0 shadow-md mt-0.5">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}

                        <div className={`space-y-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md relative group ${
                              isUser
                                ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white font-semibold rounded-tr-none'
                                : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                            }`}
                          >
                            <div className="whitespace-pre-line break-words space-y-1">
                              {msg.content}
                            </div>

                            {msg.suggestedAction && (
                              <div className="pt-2">
                                <Link
                                  href={msg.suggestedAction.link}
                                  onClick={() => setIsOpen(false)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold text-xs hover:brightness-110 transition-all shadow-md cursor-pointer"
                                >
                                  <span>{msg.suggestedAction.label}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            )}

                            {!isUser && (
                              <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800/80 mt-2 text-[10px] text-slate-500">
                                <button
                                  onClick={() => handleCopyText(msg.content, msg.id)}
                                  className="hover:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Copy Answer"
                                >
                                  {copiedId === msg.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">কপি হয়েছে</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>কপি</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => speakMessage(msg.content, msg.id)}
                                  className="hover:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="বাংলায় শুনুন"
                                >
                                  {speakingId === msg.id ? (
                                    <>
                                      <VolumeX className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                                      <span className="text-orange-400 font-bold">থামুন</span>
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                                      <span>শুনুন</span>
                                    </>
                                  )}
                                </button>

                                <span className="ml-auto font-mono text-[9px] text-slate-600">{msg.timestamp}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isLoading && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand-red to-brand-orange text-white flex items-center justify-center flex-shrink-0 shadow-md">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 rounded-tl-none flex items-center space-x-1.5">
                        <div className="w-2 h-2 rounded-full bg-brand-orange animate-bounce"></div>
                        <div className="w-2 h-2 rounded-full bg-brand-orange animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 rounded-full bg-brand-orange animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Form Bar */}
                <div className="p-3 bg-slate-900 border-t border-slate-800">
                  {isListening && (
                    <div className="mb-2 px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-between text-xs text-red-300">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                        <span className="font-bold">শুনছি... আপনার প্রশ্নটি বাংলায় বলুন</span>
                      </div>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      title={isListening ? 'শোনা হচ্ছে... থামাতে ক্লিক করুন' : 'বাংলায় কথা বলুন'}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                        isListening
                          ? 'bg-red-500 text-white border-red-400 animate-pulse shadow-lg shadow-red-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isListening ? <Mic className="w-4 h-4 text-white animate-bounce" /> : <Mic className="w-4 h-4" />}
                    </button>

                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isListening ? 'শুনছি... বলুন...' : 'ম্যাচ, সেনসিটিভিটি বা উইথড্র সম্পর্কে লিখুন...'}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange"
                    />

                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange hover:from-brand-red/90 hover:to-brand-orange/90 text-white shadow-md disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
