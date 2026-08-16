'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  User as UserIcon, 
  Wallet, 
  Trophy, 
  Flame, 
  Users, 
  ShieldCheck, 
  CreditCard, 
  Edit3, 
  Copy, 
  Check, 
  CheckCircle2, 
  PlusCircle, 
  ArrowUpRight,
  Gift,
  Lock,
  Unlock,
  Clock,
  Link as LinkIcon,
  Share2,
  MessageCircle,
  Facebook
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';
import { User, Tournament, Team, Payment } from '@/lib/types';

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfaf6]" />}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'teams' ? 'TEAMS' : 'OVERVIEW';

  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TOURNAMENTS' | 'TEAMS' | 'TRANSACTIONS'>(initialTab as any);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [passTimeLeft, setPassTimeLeft] = useState('');
  
  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [ffUid, setFfUid] = useState('');
  const [ign, setIgn] = useState('');
  const [avatar, setAvatar] = useState('');
  
  // Create Team Modal State
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');

  const [teams, setTeams] = useState<Team[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const refreshProfile = async (currentUser: User) => {
    try {
      const [uRes, tRes, pRes] = await Promise.all([
        fetch(`/api/auth/me?id=${currentUser.id}`),
        fetch(`/api/teams?userId=${currentUser.id}`),
        fetch(`/api/wallet/history?userId=${currentUser.id}`)
      ]);

      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData.user) {
          setUser(uData.user);
          setFfUid(uData.user.freeFireUid || '');
          setIgn(uData.user.inGameName || '');
          setAvatar(uData.user.avatar || '');
          db.setCurrentUser(uData.user);
        }
      }

      if (tRes.ok) {
        const tData = await tRes.json();
        if (tData.teams && tData.teams.length > 0) {
          setTeams(tData.teams);
        }
      }

      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.payments) {
          setPayments(pData.payments);
        }
      }
    } catch (err) {
      console.warn('Profile load error:', err);
    }
  };

  useEffect(() => {
    const curUser = db.getCurrentUser();
    if (curUser) {
      setUser(curUser);
      setFfUid(curUser.freeFireUid || '');
      setIgn(curUser.inGameName || '');
      setAvatar(curUser.avatar || '');
      refreshProfile(curUser);
    }
    setTeams(db.getTeams());
    setPayments(db.getPayments());

    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const diff = endOfMonth.getTime() - now.getTime();
      
      if (diff <= 0) return '0d 0h 0m';
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      return `${d}d ${h}h ${m}m`;
    };
    
    setPassTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setPassTimeLeft(calculateTimeLeft()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(user.referralCode || 'HELIAN99');
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          freeFireUid: ffUid,
          inGameName: ign,
          avatar: avatar || user.avatar,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        db.setCurrentUser(data.user);
        setIsEditModalOpen(false);
        return;
      }
    } catch (err) {
      console.warn('Profile update API error:', err);
    }

    const updated = db.updateUser(user.id, {
      freeFireUid: ffUid,
      inGameName: ign,
      avatar: avatar || user.avatar,
    });
    if (updated) {
      setUser({ ...updated });
      setIsEditModalOpen(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !teamTag) return;

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName,
          tag: teamTag,
          captainId: user.id,
          captainName: user.inGameName || user.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTeams([data.team, ...teams]);
        setIsTeamModalOpen(false);
        setTeamName('');
        setTeamTag('');
        return;
      }
    } catch (err) {
      console.warn('Team create API error:', err);
    }

    db.createTeam(teamName, teamTag);
    setTeams([...db.getTeams()]);
    setIsTeamModalOpen(false);
    setTeamName('');
    setTeamTag('');
  };

  const handleClaimMilestone = async (milestoneId: number, rewardType: 'COIN' | 'WALLET', rewardAmount: number) => {
    try {
      const res = await fetch('/api/user/milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          milestoneId,
          rewardType,
          rewardAmount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        db.setCurrentUser(data.user);
        return;
      }
    } catch (err) {
      console.warn('Milestone claim API error:', err);
    }

    const updated = db.claimReferralMilestone(user.id, milestoneId, rewardType, rewardAmount);
    if (updated) {
      setUser({ ...updated });
    }
  };

  const referralMilestones = [
    { id: 10, required: 10, rewardAmount: 50, rewardType: 'COIN' as const, label: '50 Coins' },
    { id: 50, required: 50, rewardAmount: 100, rewardType: 'COIN' as const, label: '100 Coins' },
    { id: 100, required: 100, rewardAmount: 200, rewardType: 'COIN' as const, label: '200 Coins' },
    { id: 300, required: 300, rewardAmount: 500, rewardType: 'WALLET' as const, label: '500 TK' },
  ];

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-slate-900 flex flex-col font-body">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        
        {/* User Hero Passport Card */}
        <div className="rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 bg-white shadow-xl shadow-slate-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-100 rounded-full blur-3xl pointer-events-none opacity-50"></div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            
            {/* User Avatar & Info */}
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg"
                />
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg bg-red-500 text-white text-[10px] font-black uppercase shadow-sm">
                  {user.role}
                </span>
              </div>

              <div className="space-y-1">
                <h1 className="font-heading font-black text-3xl text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
                  <span>{user.inGameName || user.name}</span>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <Edit3 className="w-4 h-4 text-orange-500" />
                  </button>
                </h1>

                <div className="text-xs text-slate-500 font-mono flex items-center gap-2 justify-center sm:justify-start">
                  <span>FF UID: <strong className="text-cyan-600">{user.freeFireUid || 'Not Verified'}</strong></span>
                  {user.freeFireUid && (
                    <span className="flex items-center text-green-600 text-[10px] font-bold gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> VERIFIED
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500">{user.email}</div>
              </div>
            </div>

            {/* Wallet & Referral Quick Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              
              {/* Wallet Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center sm:text-right min-w-[160px]">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Wallet Balance</div>
                <div className="text-2xl font-heading font-black text-amber-500">
                  ৳ {user.walletBalance.toLocaleString()}
                </div>
                <div className="text-[10px] text-cyan-600 font-semibold mt-0.5">
                  Earnings: ৳{user.earnings.toLocaleString()}
                </div>
              </div>

              {/* Referral Code Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center sm:text-left">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Referral Code</div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="font-mono font-extrabold text-orange-500 text-sm">{user.referralCode}</span>
                  <button
                    onClick={handleCopyRef}
                    className="p-1 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-slate-700 transition-colors text-xs"
                  >
                    {copiedRef ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1">
          {(['OVERVIEW', 'TOURNAMENTS', 'TEAMS', 'TRANSACTIONS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl font-heading font-bold text-sm transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview Stats */}
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1 relative overflow-hidden">
              <div className="text-xs text-slate-500 font-bold uppercase relative z-10">Total Kills</div>
              <div className="font-heading font-black text-3xl text-red-500 relative z-10">{user.totalKills}</div>
              <div className="text-[11px] text-slate-400 relative z-10">Career Frags</div>
              <div className="absolute -bottom-4 -right-4 text-slate-50 opacity-50 z-0"><Flame className="w-24 h-24" /></div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1 relative overflow-hidden">
              <div className="text-xs text-slate-500 font-bold uppercase relative z-10">Booyah Wins</div>
              <div className="font-heading font-black text-3xl text-amber-500 relative z-10">{user.totalWins}</div>
              <div className="text-[11px] text-slate-400 relative z-10">Championship Titles</div>
              <div className="absolute -bottom-4 -right-4 text-slate-50 opacity-50 z-0"><Trophy className="w-24 h-24" /></div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1 relative overflow-hidden">
              <div className="text-xs text-slate-500 font-bold uppercase relative z-10">Total Cash Won</div>
              <div className="font-heading font-black text-3xl text-orange-500 relative z-10">৳ {user.earnings}</div>
              <div className="text-[11px] text-slate-400 relative z-10">Withdrawn Payouts</div>
              <div className="absolute -bottom-4 -right-4 text-slate-50 opacity-50 z-0"><Wallet className="w-24 h-24" /></div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1 relative overflow-hidden">
              <div className="text-xs text-slate-500 font-bold uppercase relative z-10">Win Rate</div>
              <div className="font-heading font-black text-3xl text-cyan-600 relative z-10">38.4%</div>
              <div className="text-[11px] text-slate-400 relative z-10">Competitive Efficiency</div>
              <div className="absolute -bottom-4 -right-4 text-slate-50 opacity-50 z-0"><ShieldCheck className="w-24 h-24" /></div>
            </div>

          </div>
        )}

        {/* Tab 1 (Continued): Referral Booyah Pass */}
        {activeTab === 'OVERVIEW' && (
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-heading font-black text-2xl text-slate-900 flex items-center gap-2">
                  <Gift className="w-6 h-6 text-red-500" /> Referral Pass
                </h3>
                <p className="text-sm text-slate-500 mt-1 mb-1">Invite friends using your Referral Code to unlock rewards!</p>
                <div className="text-xs text-red-600 font-bold flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-lg inline-flex">
                  <Clock className="w-3.5 h-3.5" /> Note: This Referral Pass resets every 1 month. Ends in: {passTimeLeft}
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl text-center">
                <div className="text-[10px] text-orange-600 font-bold uppercase">Total Referrals</div>
                <div className="font-heading font-black text-2xl text-orange-500">{user.totalReferrals || 0}</div>
              </div>
            </div>

            {/* Referral Link Share Box */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LinkIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}?ref=${user.referralCode}` : ''}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 font-mono focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(`${window.location.origin}?ref=${user.referralCode}`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />} 
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.open(`https://wa.me/?text=Join me on Black Rock Esports and get rewards! ${window.location.origin}?ref=${user.referralCode}`, '_blank');
                    }
                  }}
                  className="flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '?ref=' + user.referralCode)}`, '_blank');
                    }
                  }}
                  className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  title="Share on Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pass Progress Line */}
            <div className="relative pt-8 pb-4 overflow-x-auto">
              <div className="min-w-[600px] relative px-4">
                {/* Background Line */}
                <div className="absolute top-4 left-4 right-4 h-2 bg-slate-100 rounded-full z-0"></div>
                
                {/* Active Progress Line */}
                <div 
                  className="absolute top-4 left-4 h-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full z-10 transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${Math.min(100, ((user.totalReferrals || 0) / 300) * 100)}%` 
                  }}
                ></div>

                {/* Milestone Nodes */}
                <div className="relative z-20 flex justify-between items-start -mt-3">
                  {referralMilestones.map((milestone) => {
                    const isUnlocked = (user.totalReferrals || 0) >= milestone.required;
                    const isClaimed = (user.claimedMilestones || []).includes(milestone.id);
                    
                    return (
                      <div key={milestone.id} className="flex flex-col items-center group w-24">
                        <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all ${
                          isClaimed 
                            ? 'bg-emerald-500 border-emerald-200 text-white shadow-lg shadow-emerald-500/30' 
                            : isUnlocked 
                              ? 'bg-gradient-to-br from-red-500 to-orange-500 border-orange-200 text-white shadow-lg shadow-orange-500/30 animate-pulse' 
                              : 'bg-white border-slate-200 text-slate-400'
                        }`}>
                          {isClaimed ? <Check className="w-5 h-5" /> : isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </div>
                        
                        <div className="mt-3 text-center">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">{milestone.required} Invites</div>
                          <div className={`text-xs font-black mt-0.5 ${isUnlocked ? 'text-slate-900' : 'text-slate-500'}`}>
                            {milestone.label}
                          </div>
                        </div>

                        {/* Claim Button */}
                        <div className="mt-3 h-8">
                          {isUnlocked && !isClaimed ? (
                            <button
                              onClick={() => handleClaimMilestone(milestone.id, milestone.rewardType, milestone.rewardAmount)}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm transition-colors"
                            >
                              Claim
                            </button>
                          ) : isClaimed ? (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold uppercase rounded-lg">
                              Claimed
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Joined Tournaments */}
        {activeTab === 'TOURNAMENTS' && (
          <div className="bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-heading font-bold text-xl text-slate-900">Joined Matches</h3>
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-orange-200 hover:shadow-md">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Free Fire Grand BR Squad Championship #42</div>
                  <div className="text-xs text-slate-500 mt-1">Status: Registered • Room ID Unlocked</div>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-bold text-center">
                  VERIFIED
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Squad & Team System */}
        {activeTab === 'TEAMS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-xl text-slate-900">My Gaming Clans</h3>
              <button
                onClick={() => setIsTeamModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-heading font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center space-x-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>CREATE CLAN</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teams.map((team) => (
                <div key={team.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4">
                    <img src={team.logo} alt={team.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-orange-100 shadow-sm" />
                    <div>
                      <div className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
                        <span>{team.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-100 font-mono font-bold">[{team.tag}]</span>
                      </div>
                      <div className="text-xs text-slate-500">Captain: {team.captainName}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 font-mono">Invite Code: <strong className="text-orange-500">{team.inviteCode}</strong></span>
                    <span className="text-cyan-600 font-bold bg-cyan-50 px-2 py-1 rounded-lg">{team.membersCount} Roster Members</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Transactions */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-4 pl-6">TrxID</th>
                    <th className="p-4">Method</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 font-mono text-xs text-cyan-600">{p.trxId}</td>
                      <td className="p-4 font-bold text-slate-900">{p.method}</td>
                      <td className="p-4 font-bold text-orange-500">৳ {p.amount}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          p.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          p.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                          'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-6">
            <h3 className="font-heading font-black text-2xl text-slate-900 text-center">EDIT GAMING PROFILE</h3>
            
            <div className="flex flex-col md:flex-row gap-8">
              {/* Form Side */}
              <form onSubmit={handleProfileUpdate} className="space-y-4 text-sm flex-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Free Fire In-Game UID *</label>
                  <input
                    type="text"
                    value={ffUid}
                    onChange={(e) => setFfUid(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-mono focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-300 transition-all shadow-sm"
                    placeholder="e.g. 1029384756"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">In-Game Name (IGN) *</label>
                  <input
                    type="text"
                    value={ign}
                    onChange={(e) => setIgn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-300 transition-all shadow-sm"
                    placeholder="e.g. HELIAN_DEVIL"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Avatar Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setAvatar(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-300 transition-all shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md hover:shadow-lg font-bold transition-all"
                  >
                    Save Profile
                  </button>
                </div>
              </form>

              {/* Preview Side */}
              <div className="w-full md:w-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-6 bg-slate-50">
                <div className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Avatar Preview</div>
                <div className="relative">
                  {avatar ? (
                    <img 
                      src={avatar} 
                      alt="Avatar Preview" 
                      className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-3xl border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center">
                      <UserIcon className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  {avatar && (
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-6">
            <h3 className="font-heading font-black text-2xl text-slate-900 text-center">CREATE NEW CLAN / SQUAD</h3>
            
            <form onSubmit={handleCreateTeam} className="space-y-4 text-sm">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Clan Name *</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  placeholder="e.g. Apex Predators"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-300 transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Clan Tag (3-5 letters) *</label>
                <input
                  type="text"
                  value={teamTag}
                  onChange={(e) => setTeamTag(e.target.value)}
                  required
                  placeholder="e.g. APEX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-mono uppercase focus:outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-300 transition-all shadow-sm"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md hover:shadow-lg font-bold transition-all"
                >
                  Create Clan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
