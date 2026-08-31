'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { db } from '@/lib/db';
import { User, Conversation, Message } from '@/lib/types';
import { 
  MessageSquare, 
  Send, 
  ShieldAlert, 
  ShieldCheck, 
  Phone, 
  Lock, 
  Unlock, 
  Sparkles, 
  AlertTriangle, 
  Search, 
  User as UserIcon, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Zap,
  Info,
  DollarSign,
  UserPlus,
  Plus,
  X
} from 'lucide-react';

function MessagesInboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Conversations & Active Chat State
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConvMeta, setActiveConvMeta] = useState<any | null>(null);
  const [contactInfo, setContactInfo] = useState<{
    isUnlocked: boolean;
    sellerPhone?: string | null;
    sellerWhatsApp?: string | null;
    unlockedAt?: string | null;
  }>({ isUnlocked: false });
  const [unlockFee, setUnlockFee] = useState(20);

  // Message Sending & Filtering State
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [filterWarning, setFilterWarning] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedContact, setCopiedContact] = useState(false);

  // Search Player by EZBD ID Modal State
  const [isSearchPlayerModalOpen, setIsSearchPlayerModalOpen] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingPlayers, setIsSearchingPlayers] = useState(false);
  const [startingChatUserId, setStartingChatUserId] = useState<string | null>(null);

  // Unlock Modal State
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(0);
  const targetConvIdParam = searchParams.get('id');
  const targetSellerIdParam = searchParams.get('sellerId');

  const scrollToBottom = (smooth = true) => {
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  // Load User and Conversations
  const fetchConversations = async (userId: string) => {
    try {
      const res = await fetch(`/api/messages/conversations?userId=${userId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const convList = data.conversations || [];
        setConversations(convList);

        // Auto select first conversation or target from URL param
        if (targetConvIdParam) {
          setActiveConvId(targetConvIdParam);
        } else if (convList.length > 0 && !activeConvId) {
          setActiveConvId(convList[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  // If sellerId param passed, create/start thread
  const initFromSellerParam = async (buyerId: string, sellerId: string) => {
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId, sellerId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          setActiveConvId(data.conversation.id);
          await fetchConversations(buyerId);
        }
      }
    } catch (err) {
      console.warn('Failed to init thread with seller:', err);
    }
  };

  useEffect(() => {
    const cur = db.getCurrentUser();
    if (!cur) {
      router.replace('/login?redirect=/messages');
      return;
    }
    setCurrentUser(cur);

    if (targetSellerIdParam && targetSellerIdParam !== cur.id) {
      initFromSellerParam(cur.id, targetSellerIdParam);
    } else {
      fetchConversations(cur.id);
    }
  }, [targetSellerIdParam, targetConvIdParam]);

  // Load Messages when activeConvId changes
  const loadMessages = async (convId: string, userId: string, isSilent = false) => {
    if (!isSilent) {
      setLoadingMessages(true);
    }
    setFilterWarning(null);
    try {
      const res = await fetch(`/api/messages?conversationId=${convId}&userId=${userId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const msgList = data.messages || [];
        setMessages(msgList);
        setActiveConvMeta(data.conversation);
        setContactInfo(data.contactInfo || { isUnlocked: false });
        if (data.unlockFee) setUnlockFee(data.unlockFee);

        if (!isSilent || msgList.length > prevMsgCountRef.current) {
          prevMsgCountRef.current = msgList.length;
          setTimeout(() => scrollToBottom(!isSilent), 50);
        }
      }
    } catch (err) {
      console.warn('Failed to load messages:', err);
    } finally {
      if (!isSilent) {
        setLoadingMessages(false);
      }
    }
  };

  useEffect(() => {
    if (activeConvId && currentUser?.id) {
      prevMsgCountRef.current = 0;
      loadMessages(activeConvId, currentUser.id, false);

      // Periodic silent polling for new messages every 5s without reloading spinner
      const interval = setInterval(() => {
        loadMessages(activeConvId, currentUser.id, true);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [activeConvId, currentUser?.id]);

  // Send Message with Client & Server-side Security Filter
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConvId || !currentUser || isSending) return;

    setFilterWarning(null);
    setIsSending(true);
    const content = inputMessage.trim();

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConvId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          content,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle blocked links or phone numbers
        if (data.blocked) {
          setFilterWarning(data.message || 'Security Warning: Links and phone numbers cannot be sent directly in chat.');
        } else {
          alert(data.message || 'Failed to send message.');
        }
        return;
      }

      setInputMessage('');
      setMessages((prev) => [...prev, data.message]);
      scrollToBottom();
      fetchConversations(currentUser.id);
    } catch {
      alert('Network error while sending message.');
    } finally {
      setIsSending(false);
    }
  };

  // Unlock Seller Contact Info (Service Charge Flow)
  const handleUnlockContact = async () => {
    if (!activeConvId || !currentUser || !activeConvMeta) return;

    const sellerId = activeConvMeta.buyerId === currentUser.id ? activeConvMeta.sellerId : activeConvMeta.buyerId;

    setUnlocking(true);
    try {
      const res = await fetch('/api/messages/unlock-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConvId,
          buyerId: currentUser.id,
          sellerId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Failed to unlock contact info.');
        return;
      }

      setContactInfo(data.contactInfo);
      setIsUnlockModalOpen(false);
      alert('Contact Unlocked! You can now chat directly via WhatsApp or Phone.');
      loadMessages(activeConvId, currentUser.id);
    } catch {
      alert('Network error during contact unlock.');
    } finally {
      setUnlocking(false);
    }
  };

  const copyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedContact(true);
    setTimeout(() => setCopiedContact(false), 2000);
  };

  const handleSearchPlayers = async (query: string) => {
    setPlayerSearchQuery(query);
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearchingPlayers(true);
    try {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}&currentUserId=${currentUser?.id || ''}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.players || []);
      }
    } catch (err) {
      console.warn('Failed to search players:', err);
    } finally {
      setIsSearchingPlayers(false);
    }
  };

  const handleStartChatWithPlayer = async (targetPlayer: any) => {
    if (!currentUser) return;
    setStartingChatUserId(targetPlayer.id);
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: currentUser.id,
          sellerId: targetPlayer.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          setIsSearchPlayerModalOpen(false);
          setPlayerSearchQuery('');
          setSearchResults([]);
          await fetchConversations(currentUser.id);
          setActiveConvId(data.conversation.id);
        }
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to start conversation.');
      }
    } catch {
      alert('Network error starting conversation.');
    } finally {
      setStartingChatUserId(null);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);
  const otherUser = activeConversation?.otherUser;

  const filteredConversations = conversations.filter((c) => {
    const name = c.otherUser?.name?.toLowerCase() || '';
    const acc = c.otherUser?.accountNumber?.toLowerCase() || '';
    const msg = c.lastMessage?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return name.includes(q) || acc.includes(q) || msg.includes(q);
  });

  return (
    <div className="h-[100dvh] bg-[#F8FAFC] text-slate-900 flex flex-col font-body overflow-hidden">
      <Navbar />

      <main className="max-w-7xl mx-auto px-1 sm:px-4 lg:px-8 py-1.5 sm:py-4 flex-1 w-full flex flex-col min-h-0 overflow-hidden pb-16 lg:pb-2">
        
        {/* Main Inbox Container */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col lg:flex-row min-h-0 h-full">
          
          {/* ── LEFT COLUMN: Conversations List ── */}
          <div className={`w-full lg:w-80 border-r border-slate-200 flex flex-col bg-white ${
            activeConvId ? 'hidden lg:flex' : 'flex'
          }`}>
            
            {/* Header & Search */}
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-heading font-black text-base text-slate-900">
                  <MessageSquare className="w-5 h-5 text-brand-orange" />
                  <span>MESSAGES INBOX</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchPlayerModalOpen(true);
                    setPlayerSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-2xs hover:brightness-110 transition-all flex items-center gap-1 text-[11px] font-heading font-black cursor-pointer"
                  title="Search Player by EZBD ID"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ New Chat</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chats or EZBD ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange"
                />
              </div>

              {searchQuery.trim().length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const q = searchQuery.trim();
                    setIsSearchPlayerModalOpen(true);
                    handleSearchPlayers(q);
                  }}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-brand-orange text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-orange-200"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Search player by &quot;{searchQuery}&quot;</span>
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loadingConversations ? (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-orange" />
                  <span className="text-xs mt-2 block font-medium">Loading chats...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <MessageCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-xs font-bold">No Conversations</div>
                  <div className="text-[11px] text-slate-400">
                    Visit any player profile or LFG squad post to start a private chat.
                  </div>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === activeConvId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all ${
                        isSelected ? 'bg-orange-50/70 border-l-4 border-brand-orange' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-orange to-brand-red text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                        {conv.otherUser?.name?.[0]?.toUpperCase() || 'P'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {conv.otherUser?.name || 'Player'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <p className="text-[11px] text-slate-500 truncate font-medium">
                            {conv.lastMessage}
                          </p>
                          {conv.isUnlocked && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase shrink-0">
                              Unlocked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* ── RIGHT COLUMN: Active Chat Thread ── */}
          {activeConvId ? (
            <div className="flex-1 flex flex-col bg-[#F8FAFC]">
              
              {/* Active Chat Header */}
              <div className="p-3.5 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConvId(null)}
                    className="lg:hidden p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    {otherUser?.name?.[0]?.toUpperCase() || 'P'}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900">{otherUser?.name || 'Seller'}</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {otherUser?.accountNumber || 'EZBD-MEMBER'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Secure In-App Chat • Links & direct phone exchange are protected
                    </div>
                  </div>
                </div>

                {/* Unlock Contact Action Button in Header */}
                {!contactInfo.isUnlocked ? (
                  <button
                    onClick={() => setIsUnlockModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Unlock WhatsApp (৳{unlockFee})</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Contact Unlocked</span>
                  </div>
                )}
              </div>

              {/* ── UNLOCKED WHATSAPP / CONTACT CARD BANNER ── */}
              {contactInfo.isUnlocked && (
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-3 sm:p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-200">
                        Verified WhatsApp & Direct Contact
                      </div>
                      <div className="font-mono font-black text-sm sm:text-base tracking-wide">
                        {contactInfo.sellerWhatsApp || contactInfo.sellerPhone || '017XXXXXXXX'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => copyNumber(contactInfo.sellerWhatsApp || contactInfo.sellerPhone || '')}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedContact ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedContact ? 'Copied' : 'Copy'}</span>
                    </button>

                    {(contactInfo.sellerWhatsApp || contactInfo.sellerPhone) && (
                      <a
                        href={`https://wa.me/${(() => {
                          const digits = (contactInfo.sellerWhatsApp || contactInfo.sellerPhone || '').replace(/[^0-9]/g, '');
                          return digits.startsWith('88') ? digits : (digits.startsWith('0') ? `88${digits}` : `880${digits}`);
                        })()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-lg bg-white text-emerald-800 font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-emerald-50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Chat on WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Security Warning Toast */}
              {filterWarning && (
                <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold flex items-start gap-2 animate-shake">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <div>{filterWarning}</div>
                    <div className="text-[10px] text-red-500 font-normal mt-0.5">
                      To protect both players from off-platform fraud, use the "Unlock WhatsApp" button above.
                    </div>
                  </div>
                  <button onClick={() => setFilterWarning(null)} className="text-red-400 hover:text-red-700">
                    ✕
                  </button>
                </div>
              )}

              {/* Messages Thread Container */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[360px] max-h-[500px]">
                {loadingMessages ? (
                  <div className="py-16 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-orange" />
                    <span className="text-xs mt-2 block font-medium">Loading thread...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                    <div className="text-xs font-bold text-slate-600">Start the conversation!</div>
                    <div className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Send a message below to discuss match slots, tournament coaching, or deals.
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-2xs whitespace-pre-line ${
                            isMe
                              ? 'bg-slate-900 text-white rounded-br-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                          }`}
                        >
                          {msg.content}
                        </div>

                        <span className="text-[10px] text-slate-400 mt-1 font-mono px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type your message... (Links & phone numbers are protected)"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange"
                  />

                  <button
                    type="submit"
                    disabled={isSending || !inputMessage.trim()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </form>

            </div>
          ) : (
            <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-10 text-center bg-slate-50 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-orange-50 text-brand-orange flex items-center justify-center border border-orange-100 shadow-sm">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-heading font-black text-xl text-slate-900">Select a Conversation</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Pick a chat from the left panel or click "Message" on any user's profile to begin a private conversation.
              </p>
            </div>
          )}

        </div>

      </main>

      {/* ── UNLOCK CONTACT SERVICE MODAL ── */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">UNLOCK DIRECT CONTACT</h3>
                <div className="text-xs text-slate-500 font-medium">Off-platform WhatsApp & phone disclosure</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-2">
              <div className="font-bold text-amber-900 flex items-center justify-between">
                <span>Unlock Fee:</span>
                <span className="text-base font-black text-amber-700">৳ {unlockFee} BDT</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                By unlocking, the verified WhatsApp and mobile number of <strong>{otherUser?.name || 'this seller'}</strong> will be revealed in this chat for direct calling and WhatsApp messaging.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Your Available Wallet Balance:</span>
              <span className="font-black text-blue-600">৳ {currentUser?.walletBalance ?? 0}</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={unlocking || (currentUser?.walletBalance ?? 0) < unlockFee}
                onClick={handleUnlockContact}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>CONFIRM & UNLOCK (৳{unlockFee})</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FIND & START CHAT BY EZBD ID MODAL ── */}
      {isSearchPlayerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-brand-orange border border-orange-200 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg text-slate-900">
                    Find Player by EZBD ID
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Search any player by EZBD ID (e.g. EZBD-132083), IGN or UID to send a message request.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSearchPlayerModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Enter EZBD ID (e.g. EZBD-132083), Player Name, or FF UID..."
                value={playerSearchQuery}
                onChange={(e) => handleSearchPlayers(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange focus:bg-white transition-all shadow-xs"
              />
              {isSearchingPlayers && (
                <Loader2 className="w-4 h-4 text-brand-orange animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Results List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {playerSearchQuery.trim().length < 2 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium space-y-1">
                  <Search className="w-8 h-8 mx-auto text-slate-300" />
                  <div>Type at least 2 letters or digits of the EZBD ID to search.</div>
                </div>
              ) : isSearchingPlayers ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  Searching player database...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-medium space-y-1">
                  <UserIcon className="w-8 h-8 mx-auto text-slate-300" />
                  <div className="font-bold text-slate-700">No player found</div>
                  <div>No player matched &quot;{playerSearchQuery}&quot;. Please verify the EZBD ID.</div>
                </div>
              ) : (
                searchResults.map((player) => (
                  <div
                    key={player.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-brand-orange/40 hover:bg-orange-50/40 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}`}
                        alt={player.name}
                        className="w-11 h-11 rounded-2xl object-cover border border-slate-200 bg-white shadow-2xs shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-heading font-black text-sm text-slate-900 truncate flex items-center gap-1.5">
                          <span>{player.inGameName || player.name}</span>
                        </div>
                        <div className="text-[11px] font-mono text-blue-600 font-bold mt-0.5">
                          {player.accountNumber}
                        </div>
                        {player.freeFireUid && (
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            UID: {player.freeFireUid}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={startingChatUserId === player.id || player.isCurrentUser}
                      onClick={() => handleStartChatWithPlayer(player)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {startingChatUserId === player.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-brand-orange" />
                      )}
                      <span>{player.isCurrentUser ? 'You' : 'Start Chat'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer Close */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSearchPlayerModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagesInboxPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
          <span className="text-xs font-bold text-slate-500 font-sans">Loading Messages Inbox...</span>
        </div>
      }
    >
      <MessagesInboxContent />
    </Suspense>
  );
}
