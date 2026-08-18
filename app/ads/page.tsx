'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { User, LotteryRewardItem } from '@/lib/types';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import DailyQuests from '@/components/rewards/DailyQuests';
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
  const [activeTab, setActiveTab] = useState<'WATCH_EARN' | 'LUCKY_SPIN' | 'EXCHANGE'>('WATCH_EARN');
  
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

  // Coin Convert State
  const [coinsToBdtRatio, setCoinsToBdtRatio] = useState(50);
  const [convertCoins, setConvertCoins] = useState(50);
  const [isConverting, setIsConverting] = useState(false);
  const [convertSuccessMsg, setConvertSuccessMsg] = useState('');

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
            setCoinsToBdtRatio(data.settings.coinsToBdtRatio || 50);
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
    if (!currentUser || !currentAd || isProcessingClaim) return;
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
    if (!currentUser || isSpinning || !isLotteryActive) return;
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
        const winningIdx = data.winningIndex ?? 0;
        const totalSegments = lotteryRewards.length || 8;
        const segmentAngle = 360 / totalSegments;

        // Calculate destination angle to land on target segment with random spins
        const targetAngle = 360 - (winningIdx * segmentAngle + segmentAngle / 2);
        const fullSpins = 360 * 5; // 5 full rotations
        const finalRotation = wheelRotation + fullSpins + targetAngle;

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

  // Convert Coins to Real Wallet Cash
  const handleConvertCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isConverting) return;
    if (convertCoins > (currentUser.coinBalance || 0)) {
      alert('You do not have enough coins to convert.');
      return;
    }

    setIsConverting(true);
    setConvertSuccessMsg('');

    try {
      const res = await fetch('/api/wallet/convert-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          coins: convertCoins,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setConvertSuccessMsg(data.message || `Successfully converted ${convertCoins} coins to ৳${(convertCoins / coinsToBdtRatio).toFixed(2)} cash!`);
        if (data.user) {
          setCurrentUser(data.user);
          db.setCurrentUser(data.user);
        }
        setTimeout(() => setConvertSuccessMsg(''), 5000);
      } else {
        alert(data.message || 'Failed to convert coins.');
      }
    } catch (err: any) {
      alert(err.message || 'Error converting coins.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 font-sans flex flex-col selection:bg-orange-500 selection:text-black">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-orange-950/40 via-amber-950/30 to-slate-900 border border-orange-500/30 p-6 md:p-10 shadow-2xl shadow-orange-950/30">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                FREE REWARDS & CASH HUB
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                Earn Rewards & <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400">Lottery Wheel</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
                Watch video ads to earn BRK Coins, spin the high-reward lottery wheel for real bKash cash & diamonds, or convert coins directly to wallet balance.
              </p>
            </div>

            {/* User Coin & Balance Widget */}
            {currentUser && (
              <div className="bg-slate-950/80 border border-orange-500/30 rounded-2xl p-4 md:p-5 flex items-center gap-6 shadow-lg flex-shrink-0">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Your Coins</span>
                  <div className="text-xl md:text-2xl font-black text-amber-400 flex items-center gap-1.5">
                    <Coins className="w-5 h-5" />
                    {(currentUser.coinBalance || 0).toLocaleString()}
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-slate-800" />
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Real Cash</span>
                  <div className="text-xl md:text-2xl font-black text-emerald-400 flex items-center gap-1.5">
                    <DollarSign className="w-5 h-5" />
                    ৳ {(currentUser.walletBalance || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 7-Day Login Streak Rewards */}
        <DailyQuests />

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 gap-2 max-w-lg mx-auto sm:mx-0">
          <button
            onClick={() => setActiveTab('WATCH_EARN')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'WATCH_EARN'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-lg shadow-orange-500/25 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlaySquare className="w-4 h-4" />
            Watch & Earn
          </button>
          <button
            onClick={() => setActiveTab('LUCKY_SPIN')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'LUCKY_SPIN'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4" />
            Lottery Wheel
          </button>
          <button
            onClick={() => setActiveTab('EXCHANGE')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'EXCHANGE'
                ? 'bg-slate-800 text-white border border-slate-700 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCw className="w-4 h-4" />
            Coin Exchange
          </button>
        </div>

        {/* TAB 1: WATCH & EARN VIDEO ADS */}
        {activeTab === 'WATCH_EARN' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              
              {/* Video Player Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="font-black text-sm text-white">
                      {currentAd?.title || 'Free Fire Sponsored Tournament Ad'}
                    </h3>
                  </div>
                  {currentAd && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      +{currentAd.rewardAmount} Coins
                    </span>
                  )}
                </div>

                {/* Video Frame */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner flex items-center justify-center">
                  {loadingAds ? (
                    <div className="text-center text-slate-400 space-y-2">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-400" />
                      <p className="text-xs">Loading video ads stream...</p>
                    </div>
                  ) : !adsEnabled || activeAds.length === 0 ? (
                    <div className="text-center text-slate-400 p-8 space-y-3">
                      <VideoOff className="w-12 h-12 mx-auto text-slate-600" />
                      <h4 className="font-bold text-white text-sm">No Video Ads Available</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Check back in a few minutes or spin the Lottery Wheel to claim rewards!
                      </p>
                    </div>
                  ) : watchStatus === 'FINISHED_ALL' ? (
                    <div className="text-center text-slate-300 p-8 space-y-3">
                      <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
                      <h4 className="font-bold text-white text-base">You've Watched All Ads!</h4>
                      <p className="text-xs text-slate-400">Awesome job! Come back tomorrow for fresh video ad rewards.</p>
                    </div>
                  ) : (
                    <div id="yt-ad-player" className="w-full h-full" />
                  )}
                </div>

                {/* Watch Progress & Claim Bar */}
                {currentAd && watchStatus !== 'FINISHED_ALL' && (
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          {watchStatus === 'COMPLETED' || watchStatus === 'CLAIMED' ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Watch requirement completed!
                            </span>
                          ) : (
                            <span>Watch countdown: <strong className="text-amber-400">{watchSecondsRemaining}s</strong></span>
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
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-bold">
                    {errorMsg}
                  </div>
                )}
              </div>
            </div>

            {/* Right Guide Card */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="font-black text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <ShieldCheck className="w-4 h-4 text-orange-400" />
                  Watch & Earn Rules
                </h3>
                <ul className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold mt-0.5">•</span>
                    <span>Watch the entire video ad without switching tabs or skipping.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold mt-0.5">•</span>
                    <span>Each completed ad grants instant BRK coins directly to your balance.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold mt-0.5">•</span>
                    <span>Daily limit is <strong>{dailyAdLimit} ads</strong> per account to ensure fair play.</span>
                  </li>
                </ul>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('LUCKY_SPIN')}
                    className="w-full py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Use Coins in Lottery Wheel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LOTTERY & LUCKY WHEEL */}
        {activeTab === 'LUCKY_SPIN' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Interactive Wheel */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 bg-slate-900/60 border border-purple-500/30 rounded-3xl shadow-2xl shadow-purple-950/20 space-y-6">
              
              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  High-Reward Lucky Draw
                </span>
                <h2 className="text-2xl font-black text-white">Spin & Win Real Cash & Diamonds</h2>
                <p className="text-xs text-slate-400">
                  Cost per spin: <strong className="text-amber-400">{spinCoinCost} Coins</strong>
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
                  className="w-full h-full rounded-full border-4 border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.3)] transition-transform duration-[5000ms] ease-out relative overflow-hidden"
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
                            stroke="#0f172a"
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
                  className="absolute z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-2xl shadow-purple-500/50 border-4 border-slate-950 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCw className={`w-5 h-5 mb-0.5 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>{isSpinning ? 'SPINNING' : 'SPIN'}</span>
                </button>
              </div>

              {/* Spin Trigger CTA */}
              <button
                disabled={isSpinning || !isLotteryActive || !currentUser}
                onClick={handleSpinWheel}
                className="w-full sm:w-80 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-purple-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Gift className="w-5 h-5" />
                Spin Wheel ({spinCoinCost} Coins)
              </button>
            </div>

            {/* Right: Prizes Table Showcase */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="font-black text-base text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Award className="w-5 h-5 text-purple-400" />
                  Available Lottery Prizes
                </h3>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {lotteryRewards.map((reward, index) => (
                    <div
                      key={reward.id}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between hover:border-purple-500/40 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span 
                          className="w-7 h-7 rounded-lg text-black font-black text-xs flex items-center justify-center shadow-md font-mono"
                          style={{ backgroundColor: reward.color || '#F59E0B' }}
                        >
                          #{index + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-white">{reward.label}</h4>
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            Type: {reward.type}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-purple-300 block">
                          {reward.probabilityPercent}% Chance
                        </span>
                        {reward.maxWinnersLimit && (
                          <span className="text-[10px] text-slate-500 block">
                            Left: {Math.max(0, reward.maxWinnersLimit - (reward.currentWonCount || 0))}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COIN EXCHANGE */}
        {activeTab === 'EXCHANGE' && (
          <div className="max-w-xl mx-auto bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="border-b border-slate-800 pb-4 text-center space-y-1">
              <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                <Coins className="w-6 h-6 text-amber-400" />
                Coin to Real Cash Converter
              </h2>
              <p className="text-xs text-slate-400">
                Exchange rate: <strong className="text-white">{coinsToBdtRatio} Coins = ৳1 Real Wallet Cash</strong>
              </p>
            </div>

            {convertSuccessMsg && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                {convertSuccessMsg}
              </div>
            )}

            <form onSubmit={handleConvertCoins} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex justify-between">
                  <span>Coins to Convert</span>
                  <span className="text-amber-400">Available: {(currentUser?.coinBalance || 0)} Coins</span>
                </label>
                <input
                  type="number"
                  min="50"
                  step="10"
                  max={currentUser?.coinBalance || 5000}
                  value={convertCoins}
                  onChange={(e) => setConvertCoins(parseInt(e.target.value, 10) || 50)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              {/* Conversion Preview */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-slate-400">You Will Receive:</span>
                <span className="text-lg font-black text-emerald-400 flex items-center gap-1">
                  ৳ {(convertCoins / coinsToBdtRatio).toFixed(2)} Real Cash
                </span>
              </div>

              <button
                type="submit"
                disabled={isConverting || !currentUser || convertCoins > (currentUser.coinBalance || 0)}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Convert Coins to Wallet Balance
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* Lottery Winning Modal */}
      {showSpinWinModal && spinResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 text-center shadow-2xl shadow-purple-950/40">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-500/30">
              <Gift className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Lottery Wheel Result</span>
              <h3 className="text-2xl font-black text-white">{spinResult.label}</h3>
              <p className="text-xs text-slate-300">
                {spinResult.value > 0 
                  ? 'Your reward has been instantly credited to your platform account!' 
                  : 'Better luck next time! Keep spinning to unlock massive cash prizes.'}
              </p>
            </div>

            <button
              onClick={() => setShowSpinWinModal(false)}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-purple-500/25"
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
