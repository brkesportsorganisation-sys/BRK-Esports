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
import { useLanguage } from '@/lib/language-context';
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
  const { isBangla } = useLanguage();
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
  const [spinCashCost, setSpinCashCost] = useState(10);
  const [spinPaymentMode, setSpinPaymentMode] = useState<'COINS_ONLY' | 'CASH_ONLY' | 'BOTH'>('BOTH');
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
            setSpinCashCost(data.settings.spinCashCost ?? 10);
            setSpinPaymentMode(data.settings.spinPaymentMode || 'BOTH');
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
  const handleSpinWheel = async (method: 'COINS' | 'CASH' = 'COINS') => {
    if (!currentUser) {
      alert('লাকি স্পিন ঘুরাতে ও ক্যাশ রিওয়ার্ড জিততে অনুগ্রহ করে একাউন্টে লগইন করুন!');
      window.location.href = '/login?redirect=/ads';
      return;
    }
    if (isSpinning || !isLotteryActive) return;
    if (lotteryRewards.length === 0) return;

    if (method === 'COINS') {
      if (spinCoinCost > 0 && (currentUser.coinBalance || 0) < spinCoinCost) {
        alert(`You need ${spinCoinCost} coins to spin the wheel. Watch some video ads to earn free coins!`);
        return;
      }
    } else {
      if (spinCashCost > 0 && (currentUser.walletBalance || 0) < spinCashCost) {
        alert(`You need ৳${spinCashCost} wallet cash to spin the wheel.`);
        return;
      }
    }

    setIsSpinning(true);
    setSpinResult(null);

    try {
      const res = await fetch('/api/ads/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, paymentMethod: method }),
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
                Watch video ads to earn EZBD Coins, spin the high-reward lottery wheel for real bKash cash & diamonds, or convert coins directly to wallet balance.
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

        {/* Watch & Earn Video Ads Section */}
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
                      Check back in a few minutes or spin the Lucky Wheel on the Home Page to claim rewards!
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
                  <span>Each completed ad grants instant EZBD coins directly to your balance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-orange font-bold mt-0.5">•</span>
                  <span>Daily limit is <strong className="text-slate-900">{dailyAdLimit} ads</strong> per account to ensure fair play.</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  href="/#home-lottery-section"
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-500/20"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Spin Lucky Wheel on Home Page →</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
