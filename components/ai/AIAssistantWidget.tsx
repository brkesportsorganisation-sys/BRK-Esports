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
  Radio
} from 'lucide-react';
import { db } from '@/lib/db';
import { User as UserType } from '@/lib/types';
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 আসসালামু আলাইকুম! আমি **BRK AI**, Black Rock Esports এর অফিসিয়াল **AI গেমিং কোচ ও প্ল্যাটফর্ম অ্যাসিস্ট্যান্ট**।\n\n🎯 **আমি আপনাকে সাহায্য করতে পারি:**\n- লাইভ টুর্নামেন্ট শিডিউল ও স্লট বুকিং\n- কাস্টম রুম আইডি ও পাসওয়ার্ড তথ্য\n- সেরা ড্র্যাগ-হেডশট সেনসিটিভিটি ও DPI সেটিংস\n- রাশ ও স্নাইপার ক্যারেক্টার স্কিল কম্বো\n- বিকাশ/নগদ ইনস্ট্যান্ট প্রাইজমানি ক্যাশআউট\n\nবাংলা বা English যে কোনো ভাষায় সরাসরি প্রশ্ন করুন!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setCurrentUser(db.getCurrentUser());
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Web Speech API for Voice Input
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'bn-BD'; // Default to Bengali, fallback English

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSendMessage(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  };

  // Text-To-Speech (TTS)
  const speakMessage = (text: string, msgId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, '').replace(/\[.*?\]\(.*?\)/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

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
      // Build conversation history
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
            content: "⚠️ দুঃখিত, কানেকশনে সাময়িক সমস্যা হয়েছে। আপনি কি প্রশ্নটি আবার করবেন?",
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
          content: "🎮 **BRK AI:** সার্ভার রেসপন্স করতে পারছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।",
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
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "✨ চ্যাট হিস্ট্রি ক্লিয়ার করা হয়েছে। নতুন কোনো টুর্নামেন্ট স্ট্র্যাটেজি বা হেল্প লাগলে জিজ্ঞাসা করুন!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <>
      {/* Floating Trigger Launcher */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(true)}
              className="relative group p-4 rounded-full bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 text-black shadow-2xl shadow-orange-500/40 border border-yellow-300/40 flex items-center justify-center transition-all duration-300"
              aria-label="Open BRK AI Assistant"
            >
              {/* Glowing Pulse Aura */}
              <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 opacity-60 blur-md group-hover:opacity-100 transition duration-300 animate-pulse" />
              
              <div className="relative flex items-center gap-2">
                <Bot className="w-7 h-7 text-black drop-shadow-md animate-bounce" />
                <span className="hidden sm:inline font-black text-xs uppercase tracking-wider text-black pr-1">
                  BRK AI Coach
                </span>
              </div>

              {/* Online Indicator Badge */}
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full animate-ping" />
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
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
            className={`fixed z-50 flex flex-col bg-slate-950/95 backdrop-blur-2xl border border-orange-500/30 rounded-3xl shadow-2xl shadow-orange-950/40 overflow-hidden font-sans transition-all duration-300 ${
              isExpanded 
                ? 'inset-4 md:inset-10' 
                : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[420px] md:w-[460px] h-[640px] max-h-[88vh]'
            }`}
          >
            {/* Header */}
            <div className="relative p-4 bg-gradient-to-r from-slate-900 via-orange-950/50 to-slate-900 border-b border-orange-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 text-black">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white tracking-wide">BRK AI Gaming Coach</h3>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      GEMINI 2.5
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    Free Fire Pro Coach • 24/7 Live
                  </p>
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearChat}
                  title="Clear Chat"
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Minimize' : 'Expand'}
                  className="hidden sm:inline-flex p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close Assistant"
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Coaching Suggestion Pills */}
            <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 overflow-x-auto scrollbar-none flex items-center gap-1.5">
              {COACHING_PILLS.map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => handleSendMessage(pill.query)}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-orange-500/20 hover:border-orange-500/40 border border-slate-700 text-slate-300 hover:text-orange-400 transition-all flex-shrink-0 flex items-center gap-1 shadow-sm"
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
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-black flex items-center justify-center flex-shrink-0 shadow-md mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`space-y-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg relative group ${
                          isUser
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black font-semibold rounded-tr-none'
                            : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        <div className="whitespace-pre-line break-words space-y-1">
                          {msg.content}
                        </div>

                        {/* Interactive Suggested Action Button */}
                        {msg.suggestedAction && (
                          <div className="pt-2">
                            <Link
                              href={msg.suggestedAction.link}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black text-xs hover:from-orange-400 hover:to-amber-400 transition-all shadow-md shadow-orange-500/20"
                            >
                              <span>{msg.suggestedAction.label}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}

                        {/* Action buttons (Copy, TTS) */}
                        {!isUser && (
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 mt-2 text-[10px] text-slate-500">
                            <button
                              onClick={() => handleCopyText(msg.content, msg.id)}
                              className="hover:text-slate-300 flex items-center gap-1 transition-colors"
                              title="Copy Answer"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => speakMessage(msg.content, msg.id)}
                              className="hover:text-slate-300 flex items-center gap-1 transition-colors"
                              title="Listen Audio"
                            >
                              {speakingId === msg.id ? (
                                <>
                                  <VolumeX className="w-3 h-3 text-orange-400" />
                                  <span className="text-orange-400">Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3 h-3" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>

                            <span className="ml-auto font-mono text-[9px]">{msg.timestamp}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Thinking / Loading Animation */}
              {isLoading && (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none text-xs text-slate-400 flex items-center gap-2 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    BRK AI কোচ অ্যানালাইসিস করছে...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800/80">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-3 rounded-2xl border transition-all ${
                    isListening
                      ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-500/30'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                  }`}
                  title={isListening ? 'Listening... Speak now' : 'Voice Input (বাংলা বা English)'}
                >
                  {isListening ? <Mic className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Text Input */}
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="ম্যাচ, সেনসিটিভিটি বা উইথড্র সম্পর্কে লিখুন..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-950 border border-slate-700/80 focus:border-orange-500 rounded-2xl pl-4 pr-10 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
                  />
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black transition-all shadow-lg shadow-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center justify-between text-[10px] text-slate-500 px-2 pt-2">
                <span>Free Fire Esports Coach</span>
                <span>Powered by Gemini 2.5 Flash</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
