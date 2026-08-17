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
  Minimize2,
  Copy,
  Check
} from 'lucide-react';
import { db } from '@/lib/db';
import { User as UserType } from '@/lib/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: '🎮 How to get Room ID?', text: 'How do I receive the Room ID and Password for my registered match?' },
  { label: '💰 How does cash payout work?', text: 'How do tournament cash prize payouts work and how can I withdraw to bKash/Nagad?' },
  { label: '🔥 Best Free Fire Gun Combos', text: 'What are the top Free Fire weapon combos and squad rush strategies right now?' },
  { label: '🏆 How to join a tournament?', text: 'Step by step guide on how to register and pay for a tournament slot?' },
  { label: '🛡️ Anti-Cheat Policy', text: 'What are the fair play rules and what happens if someone uses script or emulator bypass?' }
];

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 Welcome to **Blackrock Esports**! I'm **BRK AI**, your 24/7 gaming coach and platform assistant.\n\nAsk me anything about match schedules, custom room IDs, Free Fire loadouts, squad tactics, or wallet cashouts! (বাংলা বা English যে কোনো ভাষায় প্রশ্ন করতে পারেন)",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentUser(db.getCurrentUser());
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

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
      // Build history for context (exclude welcome)
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
            walletBalance: currentUser.walletBalance,
            role: currentUser.role
          } : {}
        })
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        const aiMsg: Message = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const errorMsg: Message = {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: data.message || "Sorry, I encountered a temporary network issue. Please ask again!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: "Network error connecting to BRK AI server. Please check your internet connection.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Chat cleared! How can I assist your gaming journey today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      
      {/* Floating Trigger Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="relative group p-0.5 rounded-full bg-gradient-to-tr from-brand-red via-brand-orange to-brand-gold shadow-2xl shadow-orange-500/40 cursor-pointer flex items-center justify-center"
          title="BRK AI Gaming Assistant"
        >
          {/* Pulsing ring */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-brand-red to-brand-orange opacity-70 blur-sm group-hover:opacity-100 animate-pulse transition-opacity pointer-events-none" />
          
          <div className="w-14 h-14 rounded-full bg-[#0F172A] border border-orange-500/30 flex items-center justify-center relative overflow-hidden">
            <Flame className="w-6 h-6 text-brand-orange animate-pulse" />
            <Sparkles className="w-3.5 h-3.5 text-brand-gold absolute top-2 right-2 animate-spin" style={{ animationDuration: '4s' }} />
          </div>

          {/* Badge */}
          <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold text-[9px] shadow-sm uppercase tracking-wider border border-white">
            AI
          </span>
        </motion.button>
      )}

      {/* Expandable Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="w-[92vw] sm:w-[400px] h-[560px] max-h-[85vh] bg-[#0F172A] text-slate-100 rounded-3xl border border-slate-700/80 shadow-2xl shadow-black/60 flex flex-col overflow-hidden backdrop-blur-2xl"
          >
            
            {/* Header */}
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-red to-brand-orange p-0.5 shadow-md shadow-orange-500/20">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <Flame className="w-5 h-5 text-brand-red animate-pulse" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm text-white tracking-wide">BRK AI Assistant</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">Powered by Google Gemini 2.5</div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearChat}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Clear Chat"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Prompts Bar */}
            <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800/60 overflow-x-auto flex gap-1.5 no-scrollbar flex-shrink-0">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.text)}
                  disabled={isLoading}
                  className="whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-orange-500/20 hover:border-orange-500/40 text-[10px] font-bold text-slate-300 hover:text-brand-orange border border-slate-700/80 transition-all flex-shrink-0"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 pr-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl bg-orange-500/20 text-brand-orange flex items-center justify-center flex-shrink-0 border border-orange-500/30 text-xs font-bold mt-0.5">
                      <Flame className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className={`max-w-[82%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words relative group ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white rounded-br-none shadow-md shadow-orange-500/10'
                          : 'bg-slate-800/90 text-slate-200 border border-slate-700/70 rounded-bl-none'
                      }`}
                    >
                      <div className="whitespace-pre-line font-medium">{msg.content}</div>

                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 rounded-md bg-slate-900/80 text-slate-400 hover:text-white transition-all text-[10px]"
                          title="Copy"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    <div className={`text-[9px] text-slate-500 font-mono px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5 uppercase border border-slate-700">
                      {currentUser?.name?.[0] || 'U'}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-xl bg-orange-500/20 text-brand-orange flex items-center justify-center flex-shrink-0 border border-orange-500/30">
                    <Flame className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/70 text-xs text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-orange animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-brand-orange animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-brand-orange animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[11px] font-medium text-slate-400 ml-1">BRK AI is analyzing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-slate-900/95 border-t border-slate-800 flex-shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask BRK AI in English or বাংলা..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700/80 text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-orange transition-all"
                />

                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-2.5 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange hover:opacity-90 text-white shadow-md shadow-orange-500/20 disabled:opacity-40 transition-all flex-shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
