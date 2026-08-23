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
  MicOff,
  Volume2, 
  VolumeX, 
  Headphones,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Phone,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { db } from '@/lib/db';
import { User as UserType, SupportMessage } from '@/lib/types';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'admin' | 'system';
  senderName?: string;
  content: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    link: string;
    icon?: string;
  };
}

const SUPPORT_PILLS = [
  { id: 'tournaments', label: '🏆 How to Join Match', query: 'কীভাবে টুর্নামেন্টে রেজিস্ট্রেশন ও স্লট বুক করব?' },
  { id: 'room', label: '🔑 Room ID & Pass', query: 'ম্যাচ শুরুর কতক্ষণ আগে Room ID এবং Password পাওয়া যাবে?' },
  { id: 'wallet', label: '💰 bKash Cashout', query: 'জয়ের টাকা কীভাবে বিকাশ বা নগদে ক্যাশআউট করব?' },
  { id: 'deposit', label: '💳 Add Money / Deposit', query: 'ওয়ালেটে টাকা ডিপোজিট করার নিয়ম কী?' },
  { id: 'squad', label: '👥 Find Squad (LFG)', query: 'টুর্নামেন্ট খেলার জন্য স্কোয়াড বা টিমমেট কীভাবে খুঁজব?' },
  { id: 'spin', label: '🎁 Free Rewards', query: 'কীভাবে ফ্রি লাকি স্পিন ও বোনাস রিওয়ার্ড পাওয়া যাবে?' }
];

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  senderName: 'EZBD AI',
  content: "👋 আসসালামু আলাইকুম! ESPORTS ZONE BD অফিসিয়াল এআই হেল্পডেস্কে আপনাকে স্বাগতম।\n\nটুর্নামেন্ট জয়েন, রুম আইডি ও পাসওয়ার্ড, ওয়ালেট ডিপোজিট/উইথড্র বা ফ্রি ফায়ার টুর্নামেন্ট সংক্রান্ত যেকোনো প্রশ্ন করুন। আমি আপনাকে তাৎক্ষণিক সাহায্য করতে প্রস্তুত!",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showHumanModal, setShowHumanModal] = useState(false);
  const [voiceToast, setVoiceToast] = useState<string | null>(null);

  // Unified Chat Stream
  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);
  const [hasSentFirstMsg, setHasSentFirstMsg] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const speechIndexRef = useRef<number>(0);

  // Load user data on mount
  useEffect(() => {
    const u = db.getCurrentUser();
    setCurrentUser(u);
  }, [isOpen]);

  // Pre-load voices for Web Speech API fallback
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      return () => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      };
    }
  }, []);

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

  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Stop any active audio/speech
  const stopAllSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    speechQueueRef.current = [];
    speechIndexRef.current = 0;
    setSpeakingId(null);
    setIsSpeechLoading(false);
  };

  // Helper: Start Fallback MediaRecorder Audio Recording & AI Transcription
  const startMediaRecorderFallback = async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr: any) {
        console.warn('Microphone permission error:', micErr);
        setIsListening(false);
        setIsRecordingAudio(false);
        setVoiceToast('⚠️ মাইক্রোফোন পারমিশন অন করুন (Please allow microphone access)');
        setTimeout(() => setVoiceToast(null), 4000);
        return;
      }

      mediaStreamRef.current = stream;
      const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
        ? 'audio/webm;codecs=opus'
        : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm'))
        ? 'audio/webm'
        : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4'))
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstart = () => {
        setIsRecordingAudio(true);
        setIsListening(true);
        setVoiceToast('🔴 রেকর্ড হচ্ছে... কথা শেষ হলে মাইকে আবার চাপুন');
      };

      recorder.onstop = async () => {
        setIsRecordingAudio(false);
        setIsListening(false);
        setVoiceToast('⚡ ভয়েস প্রসেসিং হচ্ছে...');
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch {}

        if (audioChunksRef.current.length === 0) {
          setVoiceToast(null);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice.webm');
        formData.append('mimeType', recorder.mimeType || 'audio/webm');

        try {
          const res = await fetch('/api/ai/stt', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.success && data.text) {
            setInput(data.text);
            setVoiceToast(null);
            setTimeout(() => {
              handleSendMessage(data.text);
            }, 250);
          } else {
            setVoiceToast('ভয়েস স্পষ্ট শোনা যায়নি। দয়া করে লিখে জানান বা আবার বলুন।');
            setTimeout(() => setVoiceToast(null), 3500);
          }
        } catch {
          setVoiceToast('ভয়েস প্রসেসিংয়ে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
          setTimeout(() => setVoiceToast(null), 3500);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(200);
    } catch (recErr) {
      console.warn('Recorder start error:', recErr);
      setIsListening(false);
      setIsRecordingAudio(false);
      setVoiceToast('ভয়েস রেকর্ড শুরু করা যায়নি।');
      setTimeout(() => setVoiceToast(null), 3500);
    }
  };

  // Robust Voice Input (Speech-to-Text) with Auto Permission & Fallbacks
  const toggleVoiceInput = async () => {
    if (typeof window === 'undefined') return;

    // If currently listening/recording, stop it
    if (isListening || isRecordingAudio) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
      }
      setIsListening(false);
      setIsRecordingAudio(false);
      return;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // 1. Try Native Web Speech Recognition first (Chrome, Edge, Safari)
    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'bn-BD';
        recognition.maxAlternatives = 1;

        let capturedText = '';

        recognition.onstart = () => {
          setIsListening(true);
          setVoiceToast('🎙️ শুনছি... এখন বাংলায় কথা বলুন...');
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

          const currentText = finalTranscript || interimTranscript;
          if (currentText && currentText.trim()) {
            capturedText = currentText.trim();
            setInput(capturedText);
          }

          if (finalTranscript && finalTranscript.trim()) {
            setIsListening(false);
            setVoiceToast(null);
            setTimeout(() => {
              handleSendMessage(finalTranscript.trim());
            }, 300);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
          setIsListening(false);

          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setVoiceToast('⚠️ ব্রাউজারে মাইক্রোফোন পারমিশন এলাও (Allow) করুন');
            setTimeout(() => setVoiceToast(null), 4000);
            return;
          }

          // If web speech had network/no-speech error, seamlessly activate MediaRecorder AI STT
          startMediaRecorderFallback();
        };

        recognition.onend = () => {
          setIsListening(false);
          setTimeout(() => {
            setVoiceToast((prev) => (prev?.includes('🎙️') ? null : prev));
          }, 800);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (speechErr) {
        console.warn('Native speech recognition failed, fallback to MediaRecorder:', speechErr);
      }
    }

    // 2. Fallback to MediaRecorder & Gemini Multimodal STT
    startMediaRecorderFallback();
  };

  // Robust Native Bangla Text-to-Speech (TTS)
  const speakMessage = async (text: string, id: string) => {
    if (typeof window === 'undefined') return;

    // If currently playing this message, toggle stop
    if (speakingId === id) {
      stopAllSpeech();
      return;
    }

    // Stop previous audio
    stopAllSpeech();

    setSpeakingId(id);
    setIsSpeechLoading(true);

    const cleanText = text
      .replace(/https?:\/\/[^\s]+/g, 'ওয়েবসাইট লিংক')
      .replace(/৳\s*([0-9]+)/g, (_match, p1) => `${p1} টাকা`)
      .replace(/([0-9]+)\s*৳/g, (_match, p1) => `${p1} টাকা`)
      .replace(/\b1v1\b/gi, '১ ভার্সেস ১')
      .replace(/\b4v4\b/gi, '৪ ভার্সেস ৪')
      .replace(/\b2v2\b/gi, '২ ভার্সেস ২')
      .replace(/\bbKash\b/gi, 'বিকাশ')
      .replace(/\bNagad\b/gi, 'নগদ')
      .replace(/\bRocket\b/gi, 'রকেট')
      .replace(/\bFree Fire\b/gi, 'ফ্রি ফায়ার')
      .replace(/\bESPORTS ZONE BD\b/gi, 'ইস্পোর্টস জোন বিডি')
      .replace(/\bEZBD\b/gi, 'ই জেড বি ডি')
      .replace(/\bBRK\b/gi, 'ই জেড বি ডি')
      .replace(/\bWallet\b/gi, 'ওয়ালেট')
      .replace(/\bTournament\b/gi, 'টুর্নামেন্ট')
      .replace(/\bTournaments\b/gi, 'টুর্নামেন্ট')
      .replace(/\bDeposit\b/gi, 'ডিপোজিট')
      .replace(/\bWithdraw\b/gi, 'উইথড্র')
      .replace(/\bCoins\b/gi, 'কয়েন')
      .replace(/\bCoin\b/gi, 'কয়েন')
      .replace(/\bBooyah\b/gi, 'বুয়াহ')
      .replace(/\bRoom\b/gi, 'রুম')
      .replace(/\bPassword\b/gi, 'পাসওয়ার্ড')
      .replace(/\bPass\b/gi, 'পাসওয়ার্ড')
      .replace(/\bSlot\b/gi, 'স্লট')
      .replace(/\bSlots\b/gi, 'স্লট')
      .replace(/\bID\b/gi, 'আইডি')
      .replace(/[*#_`~>\[\]\(\)\{\}\^\$\+\=\|\\]/g, ' ')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .replace(/[🎮🏆🔥💰⚡🎯🛡️💎🔑👉📌✨⚠️•🔔👑⚽🪖⚔️🎁]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      setSpeakingId(null);
      setIsSpeechLoading(false);
      return;
    }

    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audioRef.current = audio;
    }

    audio.pause();
    audio.currentTime = 0;

    audio.onplaying = () => {
      setIsSpeechLoading(false);
    };

    audio.onended = () => {
      setSpeakingId(null);
      setIsSpeechLoading(false);
    };

    audio.onerror = async () => {
      // If direct GET URL fails, fetch base64 from POST /api/tts
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.audio && audio) {
            audio.src = data.audio;
            await audio.play();
            return;
          }
        }
      } catch {}
      setSpeakingId(null);
      setIsSpeechLoading(false);
    };

    try {
      audio.src = `/api/tts?text=${encodeURIComponent(cleanText)}`;
      audio.load();
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch {
      // Autoplay or network fallback
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.audio && audio) {
            audio.src = data.audio;
            await audio.play();
            return;
          }
        }
      } catch {}
      setSpeakingId(null);
      setIsSpeechLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || isLoading) return;

    if (speakingId) {
      stopAllSpeech();
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

    // 1. Sync to Support Desk (/api/support)
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

    // 2. Query Smart AI Assistant
    try {
      const history = messages
        .filter(m => m.id !== 'welcome' && m.role !== 'system')
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
          senderName: 'EZBD AI',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedAction: data.suggestedAction || undefined
        };
        setMessages(prev => [...prev, assistantMsg]);

        // Check if AI expresses uncertainty, confusion, or inability to answer
        const lowerReply = (data.reply || '').toLowerCase();
        const isUncertainOrNeedsHuman = 
          lowerReply.includes('নিশ্চিত নই') ||
          lowerReply.includes('বলতে পারছি না') ||
          lowerReply.includes('জানাতে পারছি না') ||
          lowerReply.includes('সঠিক তথ্য নেই') ||
          lowerReply.includes('অ্যাডমিনের সাথে যোগাযোগ') ||
          lowerReply.includes('অ্যাডমিন সাপোর্ট') ||
          lowerReply.includes('লাইভ সাপোর্ট') ||
          lowerReply.includes('not sure') ||
          lowerReply.includes('uncertain') ||
          lowerReply.includes('cannot answer') ||
          lowerReply.includes('contact support') ||
          lowerReply.includes('contact admin') ||
          Boolean(data.requiresAdminEscalation);

        // ONLY show Discord Community Desk escalation if AI is uncertain or unable to answer
        if (isUncertainOrNeedsHuman) {
          setTimeout(() => {
            setMessages(prev => [
              ...prev,
              {
                id: `system_${Date.now()}`,
                role: 'system',
                senderName: 'ESPORTS ZONE Community Desk',
                content: "📌 এই বিষয়ে সরাসরি অ্যাডমিন সহায়তা ও দ্রুত সমাধানের জন্য আমাদের অফিসিয়াল Discord সার্ভারে যোগাযোগ করতে পারেন:",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestedAction: {
                  label: '👉 Join Discord Support',
                  link: 'https://discord.gg/esportszonebd'
                }
              }
            ]);
          }, 500);
        }
      } else {
        // AI failed to respond - escalate to Discord support
        setMessages(prev => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'assistant',
            senderName: 'EZBD AI',
            content: "দুঃখিত, এই মুহূর্তে আমি বিষয়টি নিশ্চিত করতে পারছি না। সরাসরি অ্যাডমিনের সাথে যোগাযোগ করতে আমাদের ডিসকর্ড সাপোর্ট ব্যবহার করতে পারেন।",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedAction: {
              label: '👉 Join Discord Support',
              link: 'https://discord.gg/esportszonebd'
            }
          }
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          senderName: 'EZBD AI',
          content: "সার্ভারে সাময়িক সমস্যা হয়েছে। সরাসরি অ্যাডমিনদের সাথে কথা বলতে Discord সার্ভারে যোগাযোগ করুন।",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedAction: {
            label: '👉 Join Discord Support',
            link: 'https://discord.gg/esportszonebd'
          }
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
    stopAllSpeech();
    setMessages([DEFAULT_WELCOME_MESSAGE]);
  };

  return (
    <>
      {/* Hidden persistent Audio element for seamless playback on mobile & web */}
      <audio ref={audioRef} className="hidden" preload="auto" />

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

      {/* Clean Chat Window with Crisp Mobile Readability */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed z-50 bottom-4 right-4 sm:bottom-6 sm:right-6 w-[94vw] sm:w-[410px] h-[580px] max-h-[86vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col font-sans"
          >
            {/* Header */}
            <div className="bg-[#2563EB] p-3.5 sm:p-4 flex items-center justify-between text-white select-none shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white text-[#2563EB] flex items-center justify-center shadow-xs flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm leading-tight text-white">AI Support</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <p className="text-[11px] text-blue-100 font-normal leading-tight mt-0.5">EZBD AI • Bangla & English</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Talk to Human Button */}
                <button
                  onClick={() => setShowHumanModal(!showHumanModal)}
                  title="Connect with Human Admin on Discord or WhatsApp"
                  className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-xs transition-all border border-white/20 flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Talk to Human</span>
                </button>

                {/* Clear Chat */}
                <button
                  onClick={handleClearChat}
                  title="Clear Chat History"
                  className="w-7 h-7 rounded-full hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    stopAllSpeech();
                    setShowHumanModal(false);
                    setIsOpen(false);
                  }}
                  className="w-7 h-7 rounded-full hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Talk to Human Quick Popup */}
            {showHumanModal && (
              <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs animate-fadeIn">
                <div className="space-y-0.5">
                  <span className="font-bold text-blue-950 block">লাইভ হিউম্যান সাপোর্ট:</span>
                  <span className="text-[11px] text-blue-700">অ্যাডমিনের সাথে সরাসরি কথা বলতে চ্যানেল বেছে নিন</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href="https://discord.gg/esportszonebd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <span>Discord</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://wa.me/8801700000000?text=Hello%20EZBD%20Support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <span>WhatsApp</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Live Voice Toast Alert */}
            {voiceToast && (
              <div className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold flex items-center justify-between gap-2 shadow-inner animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 truncate">
                  {isListening ? (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
                    </span>
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                  )}
                  <span className="truncate">{voiceToast}</span>
                </div>
                <button
                  onClick={() => setVoiceToast(null)}
                  className="text-white/80 hover:text-white text-xs p-0.5"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Pill Chips Row */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 overflow-x-auto scrollbar-none flex items-center gap-1.5">
              {SUPPORT_PILLS.map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => handleSendMessage(pill.query)}
                  className="text-xs font-medium px-3.5 py-1.5 rounded-full bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 transition-all flex-shrink-0 cursor-pointer shadow-2xs"
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const isAdmin = msg.role === 'admin';
                const isSystem = msg.role === 'system';

                if (isUser) {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="bg-[#2563EB] text-white rounded-2xl rounded-tr-xs px-4 py-3 text-[13.5px] sm:text-sm leading-relaxed max-w-[88%] sm:max-w-[85%] shadow-sm break-words font-normal">
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex items-start gap-2.5">
                    {/* Bot / Admin Icon */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs ${
                      isAdmin ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-blue-100 text-[#2563EB] border border-blue-200'
                    }`}>
                      {isAdmin ? <Headphones className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1.5 max-w-[88%] sm:max-w-[85%]">
                      {/* Name / Role Badge */}
                      <div className="flex items-center gap-1.5 px-1">
                        <span className={`text-[11px] font-bold ${isAdmin ? 'text-emerald-700' : 'text-slate-600'}`}>
                          {msg.senderName || (isAdmin ? 'Admin Support' : 'EZBD AI')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {msg.timestamp}
                        </span>
                      </div>

                      {/* Clean Message Bubble - Crisp High-Contrast Text for Mobile */}
                      <div className={`rounded-2xl rounded-tl-xs p-3.5 sm:p-4 text-[13.5px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                        isAdmin 
                          ? 'bg-emerald-50 border border-emerald-200 text-slate-900' 
                          : isSystem 
                          ? 'bg-indigo-50 border border-indigo-200 text-slate-900' 
                          : 'bg-white border border-slate-200/90 text-slate-900'
                      }`}>
                        <div className="select-text font-normal">{msg.content}</div>

                        {/* Optional Suggested Action */}
                        {msg.suggestedAction && (
                          <div className="pt-2.5">
                            {msg.suggestedAction.link.startsWith('http') ? (
                              <a
                                href={msg.suggestedAction.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                              >
                                <span>{msg.suggestedAction.label}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <Link
                                href={msg.suggestedAction.link}
                                onClick={() => setIsOpen(false)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-xs border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                              >
                                <span>{msg.suggestedAction.label}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Bar (Audio Listen & Copy) */}
                      {!isSystem && (
                        <div className="flex items-center gap-3 px-1 text-xs text-slate-500 font-medium">
                          {/* Listen in Bangla Button */}
                          <button
                            onClick={() => speakMessage(msg.content, msg.id)}
                            className="hover:text-blue-600 flex items-center gap-1.5 transition-colors cursor-pointer p-1 rounded-md hover:bg-slate-100"
                            title="Listen in Bangla (শুনুন)"
                          >
                            {speakingId === msg.id ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                                <span className="text-blue-600 font-bold">থামুন</span>
                              </>
                            ) : isSpeechLoading && speakingId === msg.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                <span className="text-blue-600">লোড হচ্ছে...</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>শুনুন</span>
                              </>
                            )}
                          </button>

                          <span className="text-slate-300">•</span>

                          {/* Copy Button */}
                          <button
                            onClick={() => handleCopyText(msg.content, msg.id)}
                            className="hover:text-blue-600 flex items-center gap-1.5 transition-colors cursor-pointer p-1 rounded-md hover:bg-slate-100"
                            title="Copy text"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600 font-bold">কপি হয়েছে</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>কপি</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing Animation */}
              {isLoading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-[#2563EB] border border-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4" />
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

            {/* Input Bar with Enhanced Voice Mic Button */}
            <div className="p-3 bg-white border-t border-slate-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className={`rounded-full px-4 py-1.5 flex items-center gap-2 border transition-all ${
                  isListening
                    ? 'bg-red-50/70 border-red-400 ring-2 ring-red-400/20'
                    : 'bg-slate-100 border-slate-200/80 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10'
                }`}
              >
                {/* Voice Mic Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  title={isListening ? 'ভয়েস ইনপুট বন্ধ করুন' : 'বাংলায় কথা বলুন (Speak in Bangla)'}
                  className={`p-2 rounded-full transition-all cursor-pointer flex-shrink-0 ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse shadow-md' 
                      : 'text-slate-500 hover:text-blue-600 hover:bg-slate-200/60'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Input Text Field */}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? '🎙️ শুনছি... এখন বাংলায় বলুন...' : 'Ask AI anything...'}
                  className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none py-1.5"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
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

      {/* Persistent Audio Tag for Native Bangla TTS Playback */}
      <audio ref={audioRef} preload="auto" playsInline className="hidden" />
    </>
  );
}
