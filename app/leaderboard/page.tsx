'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Award, 
  Trophy, 
  Users, 
  Search, 
  Flame, 
  Shield, 
  Loader2, 
  Crown, 
  ExternalLink,
  Gift,
  Copy,
  Check,
  Share2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Medal,
  Zap
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';
import { User, ReferralLeaderboardEntry } from '@/lib/types';
import { useLanguage } from '@/lib/language-context';

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  tag?: string;
  avatar?: string;
  logo?: string;
  ffUid?: string;
  captainName?: string;
  captainId?: string;
  membersCount?: number;
  game?: string;
  kills: number;
  wins: number;
  earnings: number;
}

export default function LeaderboardPage() {
  const { t, isBangla } = useLanguage();
  const [activeTab, setActiveTab] = useState<'PLAYERS' | 'TEAMS' | 'REFERRALS'>('PLAYERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [teams, setTeams] = useState<LeaderboardEntry[]>([]);
  const [referrals, setReferrals] = useState<ReferralLeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players || []);
        setTeams(data.teams || []);
        setReferrals(data.referrals || []);
      }
    } catch (err) {
      console.warn('Leaderboard fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check URL query param or hash for tab initialization
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'referrals' || tabParam === 'referral' || window.location.hash === '#referrals' || window.location.hash === '#referral') {
        setActiveTab('REFERRALS');
      } else if (tabParam === 'teams' || tabParam === 'squads' || window.location.hash === '#teams') {
        setActiveTab('TEAMS');
      }
    }

    const user = db.getCurrentUser();
    setCurrentUser(user);

    loadLeaderboard();

    const handleLeaderboardPoll = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadLeaderboard();
    };

    const interval = setInterval(handleLeaderboardPoll, 30000);
    document.addEventListener('visibilitychange', handleLeaderboardPoll);

    return () => {
      document.removeEventListener('visibilitychange', handleLeaderboardPoll);
      clearInterval(interval);
    };
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const userReferralUrl = typeof window !== 'undefined' && currentUser?.referralCode
    ? `${window.location.origin}/register?ref=${currentUser.referralCode}`
    : '';

  const handleCopyUserLink = () => {
    if (!userReferralUrl) return;
    navigator.clipboard.writeText(userReferralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Find user's current referral rank
  const myReferralStanding = currentUser 
    ? referrals.find(r => r.id === currentUser.id || r.referralCode === currentUser.referralCode) 
    : null;

  // Filter lists based on active tab
  const filteredPlayers = players.filter(item =>
    (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.tag && item.tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.ffUid && item.ffUid.includes(searchQuery))
  );

  const filteredTeams = teams.filter(item =>
    (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.tag && item.tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.captainName && item.captainName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredReferrals = referrals.filter(item =>
    (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.inGameName && item.inGameName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.referralCode && item.referralCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.ffUid && item.ffUid.includes(searchQuery))
  );

  const currentList = activeTab === 'PLAYERS' ? filteredPlayers : activeTab === 'TEAMS' ? filteredTeams : filteredReferrals;

  const top1 = currentList[0];
  const top2 = currentList[1];
  const top3 = currentList[2];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-body">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 py-10 sm:py-14 relative overflow-hidden">
        <div className="absolute -top-24 right-1/4 w-96 h-96 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 left-10 w-80 h-80 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-2.5">
          <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-widest shadow-xs">
            <Trophy className="w-4 h-4 text-amber-600" />
            <span>{isBangla ? 'অফিসিয়াল এস্পোর্টস লিডারবোর্ড র‍্যাংকিং' : 'Official Esports Championship Rankings'}</span>
          </div>

          <h1 className="font-heading font-black text-3xl sm:text-5xl text-slate-900 tracking-tight">
            {activeTab === 'REFERRALS' ? (isBangla ? 'রেফারেল চ্যাম্পিয়ন লিডারবোর্ড' : 'REFERRAL CRUSADE LEADERBOARD') : (isBangla ? 'হল অফ চ্যাম্পিয়নস' : 'HALL OF CHAMPIONS')}
          </h1>
          
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            {activeTab === 'REFERRALS'
              ? (isBangla ? 'সর্বাধিক ফ্রেন্ডস ও স্কোয়াডমেট ইনভাইট করে সেরা রিওয়ার্ড অর্জনকারী লাইভ রেফারেল লিডারবোর্ড।' : 'Top players who invited the most squadmates, unlocked referral milestone passes, and earned real rewards.')
              : (isBangla ? 'সেরা ফ্রি ফায়ার প্লেয়ার ও ক্ল্যান যারা সর্বোচ্চ কিল ও প্রাইজমানি জিতে রাজত্ব করছে।' : 'The most formidable Free Fire players and clans fighting for total dominance and maximum prize earnings.')}
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        
        {/* Toggle Tabs & Search Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap sm:flex-nowrap items-center space-x-1.5 sm:space-x-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setActiveTab('PLAYERS')}
              className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl font-heading font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === 'PLAYERS'
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{isBangla ? 'প্লেয়ার র‍্যাংকিং' : 'Player Ranking'}</span>
            </button>
            <button
              onClick={() => setActiveTab('TEAMS')}
              className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl font-heading font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === 'TEAMS'
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>{isBangla ? 'ক্ল্যান / স্কোয়াড' : 'Clan / Squad'}</span>
            </button>
            <button
              onClick={() => setActiveTab('REFERRALS')}
              className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl font-heading font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === 'REFERRALS'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-brand-red text-white shadow-xs ring-2 ring-amber-400/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Gift className="w-4 h-4 text-amber-300" />
              <span className="flex items-center gap-1.5">
                <span>{isBangla ? 'রেফারেল চ্যাম্পিয়ন' : 'Top Referrals'}</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono font-bold uppercase tracking-wider">HOT</span>
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-88">
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === 'PLAYERS' 
                  ? (isBangla ? 'প্লেয়ার নাম বা FF UID দিয়ে খুঁজুন...' : 'Search player, tag, or FF UID...') 
                  : activeTab === 'TEAMS'
                  ? (isBangla ? 'স্কোয়াড নাম বা ক্যাপ্টেন দিয়ে খুঁজুন...' : 'Search squad name, tag, or captain...')
                  : (isBangla ? 'প্লেয়ার নাম বা রেফারেল কোড দিয়ে খুঁজুন (e.g. REF_6030)...' : 'Search player name, IGN, or code (e.g. REF_6030)...')
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange shadow-xs transition-colors"
            />
          </div>
        </div>

        {/* User's Current Standing Quick Card (if logged in and on Referrals tab) */}
        {activeTab === 'REFERRALS' && (
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-zinc-900 rounded-3xl p-5 sm:p-6 text-white shadow-md border border-slate-700 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Gift className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    {isBangla ? 'আপনার রেফারেল পজিশন' : 'YOUR REFERRAL STANDING'}
                  </span>
                  {myReferralStanding && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black">
                      #{myReferralStanding.rank} ON LEADERBOARD
                    </span>
                  )}
                </div>
                <h3 className="font-heading font-black text-lg sm:text-xl text-white mt-0.5">
                  {currentUser ? (currentUser.inGameName || currentUser.name) : (isBangla ? 'রেফারেল প্রোগ্রামে জয়েন করুন' : 'Join Referral Crusade')}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {currentUser 
                    ? (isBangla 
                        ? `মোট ইনভাইট: ${currentUser.totalReferrals || 0} জন • রেফারেল কোড: ${currentUser.referralCode || 'N/A'}` 
                        : `Total Invites: ${currentUser.totalReferrals || 0} Friends • Referral Code: ${currentUser.referralCode || 'N/A'}`)
                    : (isBangla 
                        ? 'লগইন করে আপনার রেফারেল লিংক শেয়ার করুন এবং রিয়েল ক্যাশ রিওয়ার্ড জিতুন!' 
                        : 'Log in to share your referral link and climb to the top of the leaderboard!')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto shrink-0">
              {currentUser?.referralCode ? (
                <>
                  <button
                    onClick={handleCopyUserLink}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white font-heading font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? (isBangla ? 'লিংক কপি হয়েছে!' : 'Link Copied!') : (isBangla ? 'রেফারেল লিংক কপি' : 'Copy Referral Link')}</span>
                  </button>
                  <Link
                    href="/profile#referral"
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-heading font-bold text-xs border border-white/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Gift className="w-4 h-4 text-amber-400" />
                    <span>{isBangla ? 'রেফারেল পাস ভিউ' : 'View Referral Pass'}</span>
                  </Link>
                </>
              ) : (
                <Link
                  href="/login?redirect=/leaderboard?tab=referrals"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white font-heading font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-2"
                >
                  <span>{isBangla ? 'লগইন করে রেফার শুরু করুন' : 'Log In & Start Referring'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Top 3 Podium Showcase */}
        {currentList.length >= 3 && !searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4 max-w-4xl mx-auto">
            
            {/* Rank 2 - Silver */}
            {top2 && (
              <div className="bg-white rounded-3xl p-6 text-center border-2 border-slate-300 shadow-sm relative order-2 md:order-1 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-800 font-heading font-black text-lg flex items-center justify-center mx-auto mb-3 shadow-xs">
                  🥈 #2
                </div>
                {top2.avatar ? (
                  <img src={top2.avatar} alt={top2.name} className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover border-2 border-slate-300 shadow-sm bg-slate-900" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-lg font-black mx-auto mb-3">
                    {top2.name?.charAt(0)}
                  </div>
                )}
                <h3 className="font-heading font-black text-lg text-slate-900 truncate">{top2.name}</h3>
                
                {activeTab === 'REFERRALS' ? (
                  <>
                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-bold">
                      <span>{(top2 as ReferralLeaderboardEntry).referralCode}</span>
                    </div>
                    <div className="text-xl font-heading font-extrabold text-orange-600 mt-2 flex items-center justify-center gap-1">
                      <Users className="w-4 h-4 text-orange-500 inline" />
                      <span>{(top2 as ReferralLeaderboardEntry).totalReferrals || 0} {isBangla ? 'রেফারেল' : 'Invites'}</span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium mt-1">
                      {(top2 as ReferralLeaderboardEntry).tierBadge || 'Top Recruiter'}
                    </div>
                  </>
                ) : (
                  <>
                    {'tag' in top2 && (top2 as LeaderboardEntry).tag && <div className="text-xs text-brand-orange font-bold font-mono">[{(top2 as LeaderboardEntry).tag}]</div>}
                    {'captainName' in top2 && (top2 as LeaderboardEntry).captainName && <div className="text-[11px] text-slate-500 font-medium mt-0.5">Captain: <strong>{(top2 as LeaderboardEntry).captainName}</strong></div>}
                    <div className="text-xl font-heading font-extrabold text-orange-600 mt-2">৳ {((top2 as LeaderboardEntry).earnings || 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-600 font-medium mt-1">{(top2 as LeaderboardEntry).kills || 0} Kills • {(top2 as LeaderboardEntry).wins || 0} Wins</div>
                  </>
                )}
              </div>
            )}

            {/* Rank 1 - Gold */}
            {top1 && (
              <div className="bg-white rounded-3xl p-8 text-center border-2 border-amber-400 shadow-xl relative order-1 md:order-2 md:-translate-y-4 ring-4 ring-amber-400/20">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Crown className="w-3.5 h-3.5" />
                  <span>{activeTab === 'REFERRALS' ? (isBangla ? 'টপ রেফারার' : 'TOP REFERRER') : (isBangla ? 'চ্যাম্পিয়ন' : 'CHAMPION')}</span>
                </div>

                <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-900 font-heading font-black text-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                  🥇 #1
                </div>
                {top1.avatar ? (
                  <img src={top1.avatar} alt={top1.name} className="w-20 h-20 rounded-2xl mx-auto mb-3 object-cover border-4 border-amber-400 shadow-md bg-slate-900" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center text-xl font-black mx-auto mb-3">
                    {top1.name?.charAt(0)}
                  </div>
                )}
                <h3 className="font-heading font-black text-2xl text-slate-900 truncate">{top1.name}</h3>

                {activeTab === 'REFERRALS' ? (
                  <>
                    <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-bold">
                      <span>{(top1 as ReferralLeaderboardEntry).referralCode}</span>
                    </div>
                    <div className="text-2xl font-heading font-black text-amber-600 mt-2 flex items-center justify-center gap-1.5">
                      <Flame className="w-5 h-5 text-brand-orange animate-pulse inline" />
                      <span>{(top1 as ReferralLeaderboardEntry).totalReferrals || 0} {isBangla ? 'রেফারেল সম্পন্ন' : 'Total Invites'}</span>
                    </div>
                    <div className="text-xs font-bold text-amber-700 bg-amber-100/70 py-1 px-3 rounded-full mt-2 inline-block">
                      {(top1 as ReferralLeaderboardEntry).tierBadge || 'Diamond Champion'}
                    </div>
                  </>
                ) : (
                  <>
                    {'tag' in top1 && (top1 as LeaderboardEntry).tag && <div className="text-xs text-amber-600 font-bold font-mono">[{(top1 as LeaderboardEntry).tag}]</div>}
                    {'captainName' in top1 && (top1 as LeaderboardEntry).captainName && <div className="text-xs text-slate-600 font-medium mt-0.5">Captain: <strong className="text-slate-900">{(top1 as LeaderboardEntry).captainName}</strong></div>}
                    <div className="text-2xl font-heading font-black text-amber-600 mt-2">৳ {((top1 as LeaderboardEntry).earnings || 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-600 font-semibold mt-1">{(top1 as LeaderboardEntry).kills || 0} Kills • {(top1 as LeaderboardEntry).wins || 0} Booyahs</div>
                  </>
                )}
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {top3 && (
              <div className="bg-white rounded-3xl p-6 text-center border-2 border-amber-700/30 shadow-sm relative order-3 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-full bg-amber-700 text-white font-heading font-black text-lg flex items-center justify-center mx-auto mb-3 shadow-xs">
                  🥉 #3
                </div>
                {top3.avatar ? (
                  <img src={top3.avatar} alt={top3.name} className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover border-2 border-amber-700/40 shadow-sm bg-slate-900" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-lg font-black mx-auto mb-3">
                    {top3.name?.charAt(0)}
                  </div>
                )}
                <h3 className="font-heading font-black text-lg text-slate-900 truncate">{top3.name}</h3>

                {activeTab === 'REFERRALS' ? (
                  <>
                    <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-bold">
                      <span>{(top3 as ReferralLeaderboardEntry).referralCode}</span>
                    </div>
                    <div className="text-xl font-heading font-extrabold text-orange-600 mt-2 flex items-center justify-center gap-1">
                      <Users className="w-4 h-4 text-orange-500 inline" />
                      <span>{(top3 as ReferralLeaderboardEntry).totalReferrals || 0} {isBangla ? 'রেফারেল' : 'Invites'}</span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium mt-1">
                      {(top3 as ReferralLeaderboardEntry).tierBadge || 'Top Recruiter'}
                    </div>
                  </>
                ) : (
                  <>
                    {'tag' in top3 && (top3 as LeaderboardEntry).tag && <div className="text-xs text-brand-orange font-bold font-mono">[{(top3 as LeaderboardEntry).tag}]</div>}
                    {'captainName' in top3 && (top3 as LeaderboardEntry).captainName && <div className="text-[11px] text-slate-500 font-medium mt-0.5">Captain: <strong>{(top3 as LeaderboardEntry).captainName}</strong></div>}
                    <div className="text-xl font-heading font-extrabold text-orange-600 mt-2">৳ {((top3 as LeaderboardEntry).earnings || 0).toLocaleString()}</div>
                    <div className="text-xs text-slate-600 font-medium mt-1">{(top3 as LeaderboardEntry).kills || 0} Kills • {(top3 as LeaderboardEntry).wins || 0} Wins</div>
                  </>
                )}
              </div>
            )}

          </div>
        )}

        {/* Detailed Leaderboard Table */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-[10px] sm:text-xs uppercase font-extrabold text-slate-600 tracking-wider">
              {activeTab === 'REFERRALS' ? (
                <tr>
                  <th className="py-3 px-2 sm:px-4 text-center w-10 sm:w-16">Rank</th>
                  <th className="py-3 px-2 sm:px-4">{isBangla ? 'রেফারার (প্লেয়ার)' : 'Referrer (Player)'}</th>
                  <th className="py-3 px-2 sm:px-4 text-center">{isBangla ? 'রেফারেল কোড' : 'Referral Code'}</th>
                  <th className="py-3 px-2 sm:px-4 text-center">{isBangla ? 'পাস টায়ার / স্ট্যাটাস' : 'Pass Tier / Status'}</th>
                  <th className="py-3 px-2 sm:px-4 text-right">{isBangla ? 'মোট ইনভাইট' : 'Friends Invited'}</th>
                </tr>
              ) : (
                <tr>
                  <th className="py-3 px-2 sm:px-4 text-center w-10 sm:w-16">Rank</th>
                  <th className="py-3 px-2 sm:px-4">{activeTab === 'PLAYERS' ? 'Player' : 'Squad / Clan'}</th>
                  <th className="py-3 px-1.5 sm:px-3 text-center w-12 sm:w-20">Kills</th>
                  <th className="py-3 px-1.5 sm:px-3 text-center w-12 sm:w-20">Wins</th>
                  <th className="py-3 px-2 sm:px-4 text-right w-20 sm:w-28">Prize</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-500 text-xs font-medium">
                    <Loader2 className="w-6 h-6 text-brand-orange animate-spin mx-auto mb-2" />
                    <div>{isBangla ? 'ডাটাবেজ থেকে লাইভ লিডারবোর্ড লোড হচ্ছে...' : 'Loading live rankings from database...'}</div>
                  </td>
                </tr>
              ) : currentList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-500 text-xs font-medium">
                    <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="font-bold text-slate-700">
                      {activeTab === 'REFERRALS'
                        ? (isBangla ? 'কোনো রেফারেল রেকর্ড খুঁজে পাওয়া যায়নি। আপনার রেফারেল লিংক শেয়ার করে প্রথম চ্যাম্পিয়ন হোন!' : 'No referral records found matching your search. Share your link to be the first!')
                        : activeTab === 'PLAYERS'
                        ? 'No player tournament rankings recorded yet in the database.'
                        : 'No squads registered yet in the database.'}
                    </div>
                  </td>
                </tr>
              ) : activeTab === 'REFERRALS' ? (
                // Referrals Table Rows
                (currentList as ReferralLeaderboardEntry[]).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Rank Badge */}
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center font-heading font-black">
                      <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-[10px] sm:text-xs font-black ${
                        item.rank === 1 ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs' :
                        item.rank === 2 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                        item.rank === 3 ? 'bg-orange-100 text-orange-900 border border-orange-200' :
                        'bg-slate-100 text-slate-600 font-bold'
                      }`}>
                        #{item.rank}
                      </span>
                    </td>

                    {/* Name / Avatar Cell */}
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-900"
                          />
                        ) : (
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {item.name?.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 truncate">
                            <span className="truncate">{item.inGameName || item.name}</span>
                            {currentUser?.id === item.id && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold shrink-0">
                                {isBangla ? 'আপনি' : 'YOU'}
                              </span>
                            )}
                          </div>
                          {item.ffUid && (
                            <div className="text-[10px] text-slate-400 font-mono truncate hidden sm:block">
                              UID: {item.ffUid}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Referral Code with Quick Copy */}
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center">
                      <button
                        onClick={() => handleCopyCode(item.referralCode)}
                        title="Click to copy referral code"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-mono text-[11px] sm:text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                      >
                        <span>{item.referralCode}</span>
                        {copiedCode === item.referralCode ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </td>

                    {/* Tier / Milestone Badge */}
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${
                        item.totalReferrals >= 300 ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        item.totalReferrals >= 100 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        item.totalReferrals >= 50 ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        item.totalReferrals >= 10 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        item.totalReferrals >= 1 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {item.tierBadge || 'Starter 🌱'}
                      </span>
                    </td>

                    {/* Total Friends Invited */}
                    <td className="py-2.5 sm:py-3.5 px-2 sm:px-4 text-right">
                      <div className="font-heading font-black text-xs sm:text-base text-orange-600 flex items-center justify-end gap-1.5">
                        <Users className="w-3.5 h-3.5 text-brand-orange" />
                        <span>{item.totalReferrals}</span>
                        <span className="text-[10px] text-slate-400 font-sans font-normal uppercase hidden sm:inline">
                          {isBangla ? 'জন' : 'Invites'}
                        </span>
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                // Players / Teams Table Rows
                (currentList as LeaderboardEntry[]).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Rank Badge */}
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center font-heading font-black">
                      <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-[10px] sm:text-xs font-black ${
                        item.rank === 1 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                        item.rank === 2 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                        item.rank === 3 ? 'bg-orange-100 text-orange-900 border border-orange-200' :
                        'bg-slate-100 text-slate-600 font-bold'
                      }`}>
                        #{item.rank}
                      </span>
                    </td>
                    
                    {/* Name / Avatar Cell */}
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 min-w-0">
                      {activeTab === 'TEAMS' ? (
                        <Link href={`/squads/${item.id}`} className="flex items-center gap-2 sm:gap-3 group cursor-pointer min-w-0">
                          {item.avatar || item.logo ? (
                            <img
                              src={item.avatar || item.logo}
                              alt={item.name}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl object-cover border border-slate-200 group-hover:border-amber-400 transition-colors shrink-0 bg-slate-900"
                            />
                          ) : (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {item.name?.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 group-hover:text-amber-600 transition-colors truncate">
                              <span className="truncate">{item.name}</span>
                              {item.tag && (
                                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono font-black uppercase shrink-0">
                                  [{item.tag}]
                                </span>
                              )}
                            </div>
                            {item.captainName && (
                              <div className="text-[10px] text-slate-500 font-medium truncate hidden sm:block">
                                Cap: {item.captainName}
                              </div>
                            )}
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt={item.name}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-900"
                            />
                          ) : (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {item.name?.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 truncate">
                              <span className="truncate">{item.name}</span>
                              {item.tag && (
                                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-orange-50 text-brand-orange border border-orange-200 font-extrabold uppercase shrink-0">
                                  [{item.tag}]
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Total Kills */}
                    <td className="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center font-bold text-slate-700 text-xs sm:text-sm">
                      {item.kills || 0}
                    </td>

                    {/* Total Wins */}
                    <td className="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center font-bold text-emerald-600 text-xs sm:text-sm">
                      {item.wins || 0}
                    </td>

                    {/* Total Earnings / Prize */}
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-right font-heading font-black text-amber-600 text-xs sm:text-sm whitespace-nowrap">
                      ৳ {(item.earnings || 0).toLocaleString()}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </main>

      <Footer />
    </div>
  );
}
