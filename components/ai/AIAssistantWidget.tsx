'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Send, 
  X, 
  Copy, 
  Check, 
  Mic, 
  Volume2, 
  VolumeX, 
  Headphones,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { db } from '@/lib/db';
import { User as UserType, SupportMessage } from '@/lib/types';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'admin';
  senderName?: string;
  content: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    link: string;
    icon?: string;
  };
}

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Minimal Chat Stream
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      senderName: 'BlackRock AI',
      content: "Hello! I am here to provide BlackRock AI Support. How can I help you today?",
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
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load user data on mount
  useEffect(() => {
    const u = db.getCurrentUser();
    setCurrentUser(u);
  }, [isOpen]);

  // Polling for live Admin Replies from /api/support
  useEffect(() => {
    if (!isOpen) return;
    const uid = currentUser ? currentUser.id : 'guest_user';

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/support?userId=${uid}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages)) {
            const adminMsgs: SupportMessage[] = data.messages.filter((m: SupportMessage) => m.senderRole === 'ADMIN');
            
            setMessages(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newAdminMsgs: Message[] = [];

              for (const am of adminMsgs) {
                if (!existingIds.has(am.id)) {
                  newAdminMsgs.push({
                    id: am.id,
                    role: 'admin',
                    senderName: am.userName || 'Admin Support',
                    content: am.content,
                    timestamp: new Date(am.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  });
                }
              }

              if (newAdminMsgs.length > 0) {
                return [...prev, ...newAdminMsgs];
              }
              return prev;
            });
          }
        }
      } catch {}
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen, currentUser?.id]);

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
      alert('ভয়েস ইনপুটের জন্য Google Chrome, Edge অথবা Safari ব্রাউজার ব্যবহার করুন।');
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
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'bn-BD';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            setInput(event.results[i][0].transcript);
          }
        }
        if (finalTranscript) {
          setInput(finalTranscript);
          setIsListening(false);
          setTimeout(() => {
            handleSendMessage(finalTranscript);
          }, 300);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  // Free Google Bangla Text to Speech (TTS)
  const speakMessage = async (text: string, id: string) => {
    if (typeof window === 'undefined') return;

    if (speakingId === id) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      window.speechSynthesis?.cancel();
      setSpeakingId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    setSpeakingId(id);

    try {
      const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error('API TTS error');
      
      const data = await res.json();
      if (!data.urls || !Array.isArray(data.urls) || data.urls.length === 0) {
        throw new Error('No audio urls');
      }

      let currentIndex = 0;
      const playNextChunk = () => {
        if (currentIndex >= data.urls.length) {
          setSpeakingId(null);
          currentAudioRef.current = null;
          return;
        }

        const audio = new Audio(data.urls[currentIndex]);
        currentAudioRef.current = audio;

        audio.onended = () => {
          currentIndex++;
          playNextChunk();
        };

        audio.onerror = () => {
          currentIndex++;
          playNextChunk();
        };

        audio.play().catch(() => {
          setSpeakingId(null);
        });
      };

      playNextChunk();
    } catch {
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const cleanText = text
          .replace(/https?:\/\/[^\s]+/g, '')
          .replace(/[*#_`~>\[\]\(\)]/g, ' ')
          .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
          .replace(/[🎮🏆🔥💰⚡🎯🛡️💎🔑👉📌✨⚠️]/g, '')
          .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'bn-BD';
        utterance.rate = 0.95;

        const voices = window.speechSynthesis.getVoices();
        const bnVoice = voices.find(v => v.lang.includes('bn') || v.name.toLowerCase().includes('bangla') || v.name.toLowerCase().includes('bengali'));
        if (bnVoice) utterance.voice = bnVoice;

        utterance.onend = () => setSpeakingId(null);
        utterance.onerror = () => setSpeakingId(null);

        window.speechSynthesis.speak(utterance);
      } else {
        setSpeakingId(null);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || isLoading) return;

    if (speakingId) {
      window.speechSynthesis?.cancel();
      setSpeakingId(null);
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Sync to Support Desk
    const uid = currentUser ? currentUser.id : 'guest_user';
    const uName = currentUser ? (currentUser.inGameName || currentUser.name) : 'Guest Player';
    const uEmail = currentUser?.email;
    const uPhone = currentUser?.phone || currentUser?.accountNumber;

    fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'SEND_USER_MESSAGE',
        userId: uid,
        userName: uName,
        userEmail: uEmail,
        userPhone: uPhone,
        content: messageContent,
      }),
    }).catch(() => {});

    // Query AI
    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .slice(-6)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content
        }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
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
          senderName: 'BlackRock AI',
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
            senderName: 'BlackRock AI',
            content: "দুঃখিত, সার্ভার রেসপন্স করতে সাময়িক সমস্যা হয়েছে। আপনি কি প্রশ্নটি আবার করবেন?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          senderName: 'BlackRock AI',
          content: "সার্ভারে কানেক্ট করা যাচ্ছে না। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
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

  const handleTalkToHuman = () => {
    window.open('https://discord.gg/blackrock-esports', '_blank');
  };

  return (
    <>
      {/* Floating Trigger Launcher Button */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white shadow-xl shadow-blue-500/25 flex items-center justify-center transition-all cursor-pointer relative"
              aria-label="Open AI Support"
            >
              <Bot className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Minimal Clean Chat Window (Matching Reference Screenshot) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed z-50 bottom-4 right-4 sm:bottom-6 sm:right-6 w-[92vw] sm:w-[380px] h-[520px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col font-sans"
          >
            {/* Minimal Blue Header */}
            <div className="bg-[#2563EB] p-4 flex items-center justify-between text-white select-none">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white text-[#2563EB] flex items-center justify-center shadow-xs flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight text-white">AI Support</h3>
                  <p className="text-[11px] text-blue-100 font-normal leading-tight mt-0.5">BlackRock AI</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Talk to Human Pill Button */}
                <button
                  onClick={handleTalkToHuman}
                  title="Talk to Human Admin on Discord"
                  className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-xs transition-all border border-white/20 flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <span>Talk to Human</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    if (speakingId) {
                      window.speechSynthesis?.cancel();
                      setSpeakingId(null);
                    }
                    setIsOpen(false);
                  }}
                  className="w-7 h-7 rounded-full hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';

                if (isUser) {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="bg-[#2563EB] text-white rounded-2xl rounded-tr-xs px-4 py-2.5 text-xs leading-relaxed max-w-[85%] shadow-xs break-words">
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex items-start gap-2.5">
                    {/* Bot Icon on Left */}
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>

                    <div className="space-y-1 max-w-[85%]">
                      {/* Clean Message Bubble */}
                      <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-800 shadow-xs leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}

                        {/* Optional Suggested Action */}
                        {msg.suggestedAction && (
                          <div className="pt-2">
                            {msg.suggestedAction.link.startsWith('http') ? (
                              <a
                                href={msg.suggestedAction.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-[11px] border border-blue-200 transition-colors"
                              >
                                <span>{msg.suggestedAction.label}</span>
                                <ArrowRight className="w-3 h-3" />
                              </a>
                            ) : (
                              <Link
                                href={msg.suggestedAction.link}
                                onClick={() => setIsOpen(false)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-[11px] border border-blue-200 transition-colors"
                              >
                                <span>{msg.suggestedAction.label}</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Bar (Audio & Copy) */}
                      <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400">
                        <button
                          onClick={() => speakMessage(msg.content, msg.id)}
                          className="hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Listen in Bangla"
                        >
                          {speakingId === msg.id ? (
                            <>
                              <VolumeX className="w-3 h-3 text-blue-600 animate-pulse" />
                              <span className="text-blue-600 font-semibold">থামুন</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" />
                              <span>শুনুন</span>
                            </>
                          )}
                        </button>

                        <span>•</span>

                        <button
                          onClick={() => handleCopyText(msg.content, msg.id)}
                          className="hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">কপি হয়েছে</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>কপি</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing Animation */}
              {isLoading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center space-x-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Minimal Rounded Input Bar */}
            <div className="p-3 bg-white border-t border-slate-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="bg-slate-100 rounded-full px-3.5 py-1.5 flex items-center gap-2 border border-slate-200/60 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10 transition-all"
              >
                {/* Voice Mic Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  title={isListening ? 'Listening...' : 'Speak in Bangla'}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                    isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-blue-600'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>

                {/* Input Text Field */}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? 'শুনছি... বলুন...' : 'Ask AI anything...'}
                  className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                    input.trim()
                      ? 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm'
                      : 'bg-slate-300 text-slate-500 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
