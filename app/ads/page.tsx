'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { User, LotteryRewardItem } from '@/lib/types';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import DailyQuests from '@/components/rewards/DailyQuests';
import ReferralSection from '@/components/rewards/ReferralSection';
import { 
  PlaySquare, 
  Coins, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  VideoOff,
  Sparkles,
  Trophy,
  Gift,
  RotateCw,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Diamond,
  DollarSign,
  Clock,
  Award,
  ExternalLink,
  Flame,
  Check,
  X
} from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type AdItem = {
  id: string;
  videoId: string;
  title?: string;
  rewardAmount: number;
  durationSeconds?: number;
  isActive: boolean;
};

export default function RewardsHubPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'WATCH_EARN' | 'LUCKY_SPIN'>('WATCH_EARN');
  
  // Watch & Earn State
  const [activeAds, setActiveAds] = useState<AdItem[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [loadingAds, setLoadingAds] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [watchStatus, setWatchStatus] = useState<'IDLE' | 'WATCHING' | 'COMPLETED' | 'CLAIMED' | 'FINISHED_ALL'>('IDLE');
  const [watchSecondsRemaining, setWatchSecondsRemaining] = useState(15);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const [dailyAdLimit, setDailyAdLimit] = useState(10);
  const [adsWatchedToday, setAdsWatchedToday] = useState(0);

  const playerRef = useRef<any>(null);
  const checkIntervalRef = useRef<any>(null);

  // Spin Wheel State
  const [lotteryRewards, setLotteryRewards] = useState<LotteryRewardItem[]>([]);
  const [spinCoinCost, setSpinCoinCost] = useState(20);
  const [isLotteryActive, setIsLotteryActive] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinResult, setSpinResult] = useState<LotteryRewardItem | null>(null);
  const [showSpinWinModal, setShowSpinWinModal] = useState(false);

  // Load User Data
  const refreshUser = async (uid: string) => {
    try {
      const res = await fetch(`/api/auth/me?id=${uid}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          db.setCurrentUser(data.user);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  };

  // Fetch Live Settings from API
  useEffect(() => {
    const user = db.getCurrentUser();
    setCurrentUser(user);
    if (user?.id) refreshUser(user.id);

    async function loadRewardsData() {
      setLoadingAds(true);
      try {
        const res = await fetch('/api/ads', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setAdsEnabled(data.settings.isWatchEarnActive !== false);
            setDailyAdLimit(data.settings.dailyAdLimit || 10);
            setSpinCoinCost(data.settings.spinCoinCost ?? 20);
            setIsLotteryActive(data.settings.isLotteryActive !== false);

            if (data.settings.ads && data.settings.ads.length > 0) {
              setActiveAds(data.settings.ads.filter((a: any) => a.isActive));
            }
            if (data.settings.lotteryRewards && data.settings.lotteryRewards.length > 0) {
              setLotteryRewards(data.settings.lotteryRewards.filter((r: any) => r.isActive));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load rewards data:', err);
      } finally {
        setLoadingAds(false);
      }
    }

    loadRewardsData();
  }, []);

  // YouTube Player Initialization
  const currentAd = activeAds[currentAdIndex];

  useEffect(() => {
    if (activeTab !== 'WATCH_EARN' || !currentAd || !adsEnabled) return;

    const currentDuration = currentAd.durationSeconds || 15;
    setWatchSecondsRemaining(currentDuration);
    setWatchStatus('IDLE');

    // Load YouTube API script if needed
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        createPlayer(currentAd.videoId, currentDuration);
      };
    } else if (window.YT && window.YT.Player) {
      createPlayer(currentAd.videoId, currentDuration);
    }

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [currentAdIndex, activeAds, activeTab, adsEnabled]);

  const createPlayer = (videoId: string, reqDuration: number) => {
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch {}
    }

    try {
      playerRef.current = new window.YT.Player('yt-ad-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            setPlayerReady(true);
          },
          onStateChange: (event: any) => {
            // Playing
            if (event.data === 1) {
              setWatchStatus('WATCHING');
              startWatchTimer(reqDuration);
            } else if (event.data === 2 || event.data === 0) {
              // Paused or Ended
              if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
              if (event.data === 0 && watchSecondsRemaining <= 0) {
                setWatchStatus('COMPLETED');
              }
            }
          },
        },
      });
    } catch (err) {
      console.warn('Player creation error:', err);
    }
  };

  const startWatchTimer = (totalSeconds: number) => {
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);

    let remaining = watchSecondsRemaining > 0 ? watchSecondsRemaining : totalSeconds;

    checkIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setWatchSecondsRemaining(Math.max(0, remaining));

      if (remaining <= 0) {
        clearInterval(checkIntervalRef.current);
        setWatchStatus('COMPLETED');
      }
    }, 1000);
  };

  // Claim Ad Reward
  const handleClaimAdReward = async () => {
    if (!currentUser) {
      alert('ভিডিও রিওয়ার্ড কয়েন আপনার একাউন্টে ক্লেইম করতে অনুগ্রহ করে লগইন করুন!');
      window.location.href = '/login?redirect=/ads';
      return;
    }
    if (!currentAd || isProcessingClaim) return;
    setIsProcessingClaim(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/ads/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          adId: currentAd.id,
          rewardAmount: currentAd.rewardAmount || 10,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setWatchStatus('CLAIMED');
        setAdsWatchedToday(prev => prev + 1);
        if (data.user) {
          setCurrentUser(data.user);
          db.setCurrentUser(data.user);
        }

        // Move to next ad after 2 seconds
        setTimeout(() => {
          if (currentAdIndex + 1 < activeAds.length) {
            setCurrentAdIndex(prev => prev + 1);
            setWatchStatus('IDLE');
          } else {
            setWatchStatus('FINISHED_ALL');
          }
        }, 2000);
      } else {
        setErrorMsg(data.message || 'Failed to claim reward.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error claiming ad reward.');
    } finally {
      setIsProcessingClaim(false);
    }
  };

  // Spin Wheel Action
  const handleSpinWheel = async () => {
    if (!currentUser) {
      alert('লাকি স্পিন ঘুরাতে ও ক্যাশ রিওয়ার্ড জিততে অনুগ্রহ করে একাউন্টে লগইন করুন!');
      window.location.href = '/login?redirect=/ads';
      return;
    }
    if (isSpinning || !isLotteryActive) return;
    if (lotteryRewards.length === 0) return;

    if (spinCoinCost > 0 && (currentUser.coinBalance || 0) < spinCoinCost) {
      alert(`You need ${spinCoinCost} coins to spin the wheel. Watch some video ads to earn free coins!`);
      return;
    }

    setIsSpinning(true);
    setSpinResult(null);

    try {
      const res = await fetch('/api/ads/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Find exact index of the reward in client's active lotteryRewards list
        const targetReward = data.reward;
        let winningIdx = lotteryRewards.findIndex(r => r.id === targetReward?.id);
        if (winningIdx === -1) {
          winningIdx = data.winningIndex ?? 0;
        }

        const totalSegments = lotteryRewards.length || 8;
        const segmentAngle = 360 / totalSegments;

        // Target angle to position winning segment center under top pointer (12 o'clock)
        const targetAngle = (360 - (winningIdx * segmentAngle + segmentAngle / 2)) % 360;
        const currentMod = wheelRotation % 360;
        let delta = (targetAngle - currentMod + 360) % 360;
        if (delta === 0) delta = 360;

        const fullSpins = 360 * 5; // 5 full rotations (1800 deg)
        const finalRotation = wheelRotation + fullSpins + delta;

        setWheelRotation(finalRotation);

        setTimeout(() => {
          setIsSpinning(false);
          setSpinResult(data.reward);
          setShowSpinWinModal(true);
          if (data.user) {
            setCurrentUser(data.user);
            db.setCurrentUser(data.user);
          }
        }, 5000);
      } else {
        setIsSpinning(false);
        alert(data.message || 'Failed to spin lottery wheel.');
      }
    } catch (err: any) {
      setIsSpinning(false);
      alert(err.message || 'Error occurred while spinning wheel.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white via-red-50/25 to-orange-50/35 border border-red-200/80 p-6 md:p-10 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-brand-orange text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                FREE REWARDS & CASH HUB
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight font-heading">
                Earn Rewards & <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red via-brand-orange to-amber-500">Lottery Wheel</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-600 max-w-xl leading-relaxed">
                Watch video ads to earn BRK Coins, spin the high-reward lottery wheel for real bKash cash & diamonds, or convert coins directly to wallet balance.
              </p>
            </div>

            {/* User Coin & Balance Widget / Guest CTA */}
            {currentUser ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex items-center gap-6 shadow-sm flex-shrink-0">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Your Coins</span>
                  <div className="text-xl md:text-2xl font-black text-amber-600 flex items-center gap-1.5 font-heading">
                    <Coins className="w-5 h-5" />
                    {(currentUser.coinBalance || 0).toLocaleString()}
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-slate-200" />
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Real Cash</span>
                  <div className="text-xl md:text-2xl font-black text-emerald-600 flex items-center gap-1.5 font-heading">
                    <DollarSign className="w-5 h-5" />
                    ৳ {(currentUser.walletBalance || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-center gap-4 shadow-sm flex-shrink-0">
                <div className="space-y-0.5 text-center sm:text-left">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Claim & Earn</span>
                  <div className="text-xs font-black text-slate-900">
                    লগইন করে রিওয়ার্ড জমা করুন
                  </div>
                </div>
                <Link
                  href="/login?redirect=/ads"
                  className="px-4 py-2 bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  লগইন করুন
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 7-Day Login Streak Rewards */}
        <DailyQuests />

        {/* Monthly Referral Rewards Crusade */}
        <ReferralSection />

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start bg-white p-1.5 rounded-2xl border border-slate-200 gap-2 max-w-lg mx-auto sm:mx-0 shadow-2xs">
          <button
            onClick={() => setActiveTab('WATCH_EARN')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'WATCH_EARN'
                ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-md font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <PlaySquare className="w-4 h-4" />
            Watch & Earn
          </button>
          <button
            onClick={() => setActiveTab('LUCKY_SPIN')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'LUCKY_SPIN'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Gift className="w-4 h-4" />
            Lottery Wheel
          </button>
        </div>

        {/* TAB 1: WATCH & EARN VIDEO ADS */}
        {activeTab === 'WATCH_EARN' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              
              {/* Video Player Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="font-black text-sm text-slate-900">
                      {currentAd?.title || 'Free Fire Sponsored Tournament Ad'}
                    </h3>
                  </div>
                  {currentAd && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-brand-orange font-bold flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      +{currentAd.rewardAmount} Coins
                    </span>
                  )}
                </div>

                {/* Video Frame */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner flex items-center justify-center">
                  {loadingAds ? (
                    <div className="text-center text-slate-400 space-y-2">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-orange" />
                      <p className="text-xs">Loading video ads stream...</p>
                    </div>
                  ) : !adsEnabled || activeAds.length === 0 ? (
                    <div className="text-center text-slate-400 p-8 space-y-3">
                      <VideoOff className="w-12 h-12 mx-auto text-slate-600" />
                      <h4 className="font-bold text-white text-sm">No Video Ads Available</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Check back in a few minutes or spin the Lottery Wheel to claim rewards!
                      </p>
                    </div>
                  ) : watchStatus === 'FINISHED_ALL' ? (
                    <div className="text-center text-slate-300 p-8 space-y-3">
                      <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
                      <h4 className="font-bold text-white text-base">You've Watched All Ads!</h4>
                      <p className="text-xs text-slate-300">Awesome job! Come back tomorrow for fresh video ad rewards.</p>
                    </div>
                  ) : (
                    <div id="yt-ad-player" className="w-full h-full" />
                  )}
                </div>

                {/* Watch Progress & Claim Bar */}
                {currentAd && watchStatus !== 'FINISHED_ALL' && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-orange-100 text-brand-orange">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          {watchStatus === 'COMPLETED' || watchStatus === 'CLAIMED' ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Watch requirement completed!
                            </span>
                          ) : (
                            <span>Watch countdown: <strong className="text-brand-orange">{watchSecondsRemaining}s</strong></span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Do not close or skip the video until the timer reaches zero.
                        </p>
                      </div>
                    </div>

                    {/* Claim Button */}
                    <button
                      disabled={watchStatus !== 'COMPLETED' || isProcessingClaim || !currentUser}
                      onClick={handleClaimAdReward}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isProcessingClaim ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Claiming Coins...
                        </>
                      ) : watchStatus === 'CLAIMED' ? (
                        <>
                          <Check className="w-4 h-4" />
                          Claimed +{currentAd.rewardAmount} Coins!
                        </>
                      ) : (
                        <>
                          <Gift className="w-4 h-4" />
                          Claim +{currentAd.rewardAmount} Coins
                        </>
                      )}
                    </button>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-bold">
                    {errorMsg}
                  </div>
                )}
              </div>
            </div>

            {/* Right Guide Card */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 font-heading">
                  <ShieldCheck className="w-4 h-4 text-brand-orange" />
                  Watch & Earn Rules
                </h3>
                <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-orange font-bold mt-0.5">•</span>
                    <span>Watch the entire video ad without switching tabs or skipping.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-orange font-bold mt-0.5">•</span>
                    <span>Each completed ad grants instant BRK coins directly to your balance.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-orange font-bold mt-0.5">•</span>
                    <span>Daily limit is <strong className="text-slate-900">{dailyAdLimit} ads</strong> per account to ensure fair play.</span>
                  </li>
                </ul>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('LUCKY_SPIN')}
                    className="w-full py-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Use Coins in Lottery Wheel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LOTTERY & LUCKY WHEEL */}
        {activeTab === 'LUCKY_SPIN' && (
          <div className="max-w-2xl mx-auto w-full">
            {/* Interactive Wheel Card */}
            <div className="flex flex-col items-center justify-center p-6 sm:p-10 bg-white border border-purple-200 rounded-3xl shadow-sm space-y-6">
              
              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-purple-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  High-Reward Lucky Draw
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading">Spin & Win Real Cash & Diamonds</h2>
                <p className="text-xs text-slate-600">
                  Cost per spin: <strong className="text-amber-600">{spinCoinCost} Coins</strong>
                </p>
              </div>

              {/* Wheel Container */}
              <div className="relative w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center my-4">
                
                {/* Pointer / Marker */}
                <div className="absolute -top-3 z-30 transform -translate-x-1/2 left-1/2 drop-shadow-xl">
                  <div className="w-6 h-8 bg-gradient-to-b from-amber-400 to-orange-500 clip-pointer" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
                </div>

                {/* Rotating SVG Wheel */}
                <div
                  className="w-full h-full rounded-full border-4 border-purple-400/80 shadow-xl transition-transform duration-[5000ms] ease-out relative overflow-hidden"
                  style={{ transform: `rotate(${wheelRotation}deg)` }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    {lotteryRewards.map((prize, idx) => {
                      const total = lotteryRewards.length || 8;
                      const angle = 360 / total;
                      const startAngle = idx * angle;
                      const endAngle = startAngle + angle;

                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (endAngle * Math.PI) / 180;

                      const x1 = 50 + 50 * Math.cos(startRad);
                      const y1 = 50 + 50 * Math.sin(startRad);
                      const x2 = 50 + 50 * Math.cos(endRad);
                      const y2 = 50 + 50 * Math.sin(endRad);

                      const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

                      const midAngle = startAngle + angle / 2;
                      const midRad = (midAngle * Math.PI) / 180;
                      const textX = 50 + 32 * Math.cos(midRad);
                      const textY = 50 + 32 * Math.sin(midRad);

                      return (
                        <g key={prize.id}>
                          <path
                            d={pathData}
                            fill={prize.color || (idx % 2 === 0 ? '#7C3AED' : '#4C1D95')}
                            stroke="#ffffff"
                            strokeWidth="0.8"
                          />
                          <text
                            x={textX}
                            y={textY}
                            fill="#ffffff"
                            fontSize="3.2"
                            fontWeight="900"
                            textAnchor="middle"
                            dominantBaseline="central"
                            transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                          >
                            {prize.label.length > 12 ? prize.label.slice(0, 10) + '..' : prize.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Center Spin Hub Button */}
                <button
                  disabled={isSpinning || !isLotteryActive || !currentUser}
                  onClick={handleSpinWheel}
                  className="absolute z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-xl border-4 border-white flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RotateCw className={`w-5 h-5 mb-0.5 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>{isSpinning ? 'SPINNING' : 'SPIN'}</span>
                </button>
              </div>

              {/* Spin Trigger CTA */}
              <button
                disabled={isSpinning || !isLotteryActive || !currentUser}
                onClick={handleSpinWheel}
                className="w-full sm:w-80 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Gift className="w-5 h-5" />
                Spin Wheel ({spinCoinCost} Coins)
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Lottery Winning Modal */}
      {showSpinWinModal && spinResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border-2 border-purple-200 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 text-center shadow-2xl text-slate-900">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-amber-500 text-white flex items-center justify-center mx-auto shadow-md">
              <Gift className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-purple-600">Lottery Wheel Result</span>
              <h3 className="text-2xl font-black text-slate-900 font-heading">{spinResult.label}</h3>
              <p className="text-xs text-slate-600">
                {spinResult.value > 0 
                  ? 'Your reward has been instantly credited to your platform account!' 
                  : 'Better luck next time! Keep spinning to unlock massive cash prizes.'}
              </p>
            </div>

            <button
              onClick={() => setShowSpinWinModal(false)}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md cursor-pointer"
            >
              Collect & Continue
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
