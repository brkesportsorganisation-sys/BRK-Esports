'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { User } from '@/lib/types';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
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
  Diamond
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
  isActive: boolean;
};

// 8 Spin Wheel Segments
const WHEEL_PRIZES = [
  { id: '1', label: '15 Coins', type: 'DIAMONDS', value: 15, color: '#F59E0B', text: '🪙 +15' },
  { id: '2', label: '৳ 5 Cash', type: 'WALLET', value: 5, color: '#10B981', text: '৳ 5' },
  { id: '3', label: '25 Coins', type: 'DIAMONDS', value: 25, color: '#EC4899', text: '🪙 +25' },
  { id: '4', label: 'Try Again', type: 'TRY_AGAIN', value: 0, color: '#64748B', text: '🍀 Luck' },
  { id: '5', label: '50 Mega Coins', type: 'DIAMONDS', value: 50, color: '#8B5CF6', text: '🪙 +50' },
  { id: '6', label: '৳ 10 Cash', type: 'WALLET', value: 10, color: '#3B82F6', text: '৳ 10' },
  { id: '7', label: '10 Coins', type: 'DIAMONDS', value: 10, color: '#F97316', text: '🪙 +10' },
  { id: '8', label: 'Diamond Pass', type: 'DIAMONDS', value: 30, color: '#06B6D4', text: '💎 30' },
];

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
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  
  const playerRef = useRef<any>(null);
  const lastTimeRef = useRef<number>(0);
  const checkIntervalRef = useRef<any>(null);

  // Spin Wheel State
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinResult, setSpinResult] = useState<any | null>(null);
  const [showSpinWinModal, setShowSpinWinModal] = useState(false);

  // Coin Convert State
  const [convertCoins, setConvertCoins] = useState(50);
  const [isConverting, setIsConverting] = useState(false);

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

  // Fetch Live Ads from API
  const fetchAds = async () => {
    setLoadingAds(true);
    try {
      const res = await fetch('/api/ads', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const settings = data.adSettings;
        setAdsEnabled(settings?.isActive ?? true);
        
        const validAds = (settings?.ads || []).filter((a: AdItem) => a.isActive && a.videoId);
        if (validAds.length > 0) {
          setActiveAds(validAds);
          initYouTubePlayer(validAds[0].videoId);
        } else {
          setWatchStatus('FINISHED_ALL');
        }
      }
    } catch (err) {
      console.warn('Failed to load ads:', err);
    } finally {
      setLoadingAds(false);
    }
  };

  useEffect(() => {
    const cur = db.getCurrentUser();
    if (cur) {
      setCurrentUser(cur);
      refreshUser(cur.id);
    }
    fetchAds();

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, []);

  const extractCleanVideoId = (vid: string) => {
    if (!vid) return '7Y4lFvP9gZc';
    if (vid.length === 11 && !vid.includes('/')) return vid;
    const match = vid.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match ? match[1] : vid;
  };

  const initYouTubePlayer = (rawVideoId: string) => {
    const videoId = extractCleanVideoId(rawVideoId);

    const setupPlayer = () => {
      if (playerRef.current) {
        try {
          playerRef.current.loadVideoById(videoId);
          return;
        } catch {}
      }

      try {
        playerRef.current = new window.YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            controls: 1,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: () => setPlayerReady(true),
            onStateChange: onPlayerStateChange,
          },
        });
      } catch (e) {
        console.warn('YT player init retry:', e);
      }
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setupPlayer();
      };
    } else {
      setupPlayer();
    }
  };

  const onPlayerStateChange = (event: any) => {
    if (watchStatus === 'COMPLETED' || watchStatus === 'CLAIMED' || watchStatus === 'FINISHED_ALL') return;

    if (event.data === window.YT.PlayerState.PLAYING) {
      setWatchStatus('WATCHING');
      setErrorMsg('');

      // Anti-skip protection timer
      checkIntervalRef.current = setInterval(() => {
        if (!playerRef.current?.getCurrentTime) return;
        const currentTime = playerRef.current.getCurrentTime();

        if (currentTime > lastTimeRef.current + 2.5) {
          playerRef.current.seekTo(lastTimeRef.current);
          setErrorMsg('No skipping allowed! Please watch the complete clip to earn your coins.');
        } else {
          lastTimeRef.current = currentTime;
        }

        const duration = playerRef.current.getDuration();
        if (duration > 0 && currentTime >= duration - 1) {
          clearInterval(checkIntervalRef.current);
          setWatchStatus('COMPLETED');
        }
      }, 1000);
    } else {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    }

    if (event.data === window.YT.PlayerState.ENDED) {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      setWatchStatus('COMPLETED');
    }
  };

  const handleClaimAdCoins = async () => {
    if (!currentUser || watchStatus !== 'COMPLETED') return;
    const currentAd = activeAds[currentAdIndex];
    if (!currentAd) return;

    setIsProcessingClaim(true);
    try {
      const res = await fetch('/api/ads/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: currentAd.rewardAmount,
        }),
      });

      if (res.ok) {
        setWatchStatus('CLAIMED');
        await refreshUser(currentUser.id);
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to claim reward.');
      }
    } catch {
      setErrorMsg('Network error while claiming coins.');
    } finally {
      setIsProcessingClaim(false);
    }
  };

  const handleNextAd = () => {
    const nextIndex = currentAdIndex + 1;
    if (nextIndex < activeAds.length) {
      setCurrentAdIndex(nextIndex);
      setWatchStatus('IDLE');
      lastTimeRef.current = 0;
      setErrorMsg('');
      const nextVid = extractCleanVideoId(activeAds[nextIndex].videoId);
      if (playerRef.current?.loadVideoById) {
        playerRef.current.loadVideoById(nextVid);
      } else {
        initYouTubePlayer(nextVid);
      }
    } else {
      setWatchStatus('FINISHED_ALL');
    }
  };

  // Spin Wheel Execution
  const handleSpinWheel = async () => {
    if (isSpinning || !currentUser) {
      if (!currentUser) alert('Please login to spin the wheel!');
      return;
    }

    setIsSpinning(true);
    setShowSpinWinModal(false);

    // Pick a prize randomly
    const prizeIndex = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const selectedPrize = WHEEL_PRIZES[prizeIndex];

    // Compute rotation (each slice is 360/8 = 45 deg)
    const segmentAngle = 360 / WHEEL_PRIZES.length;
    // Align index with pointer at top (270 deg / offset)
    const targetAngle = 360 * 5 + (360 - (prizeIndex * segmentAngle + segmentAngle / 2));
    const finalRotation = wheelRotation + targetAngle;

    setWheelRotation(finalRotation);

    // Wait for wheel animation to complete (4s)
    setTimeout(async () => {
      try {
        const res = await fetch('/api/ads/spin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            rewardType: selectedPrize.type,
            value: selectedPrize.value,
            label: selectedPrize.label,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setSpinResult({
            ...selectedPrize,
            serverMsg: data.message,
          });
          setShowSpinWinModal(true);
          await refreshUser(currentUser.id);
        }
      } catch (err) {
        console.warn('Spin api error:', err);
      } finally {
        setIsSpinning(false);
      }
    }, 4200);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (convertCoins > (currentUser.coinBalance || 0)) {
      alert(`Insufficient coins! You have ${currentUser.coinBalance || 0} Coins.`);
      return;
    }

    setIsConverting(true);
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
        alert(data.message || 'Coins converted successfully!');
        await refreshUser(currentUser.id);
      } else {
        alert(data.message || 'Conversion failed.');
      }
    } catch {
      alert('Conversion request failed.');
    } finally {
      setIsConverting(false);
    }
  };

  const currentAd = activeAds[currentAdIndex];
  const userCoins = currentUser?.coinBalance || 0;
  const userWallet = currentUser?.walletBalance || 0;

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col font-body pb-24 lg:pb-0">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-[#0F172A] border-b border-slate-800 py-10 sm:py-14 text-center relative overflow-hidden">
        <div className="absolute -top-24 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-4 space-y-3 relative z-10">
          <span className="text-xs font-black text-amber-400 uppercase tracking-widest inline-flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>BlackRock Free Rewards & Coin System</span>
          </span>

          <h1 className="font-heading font-black text-3xl sm:text-5xl text-white tracking-tight">
            REWARDS & COIN ARENA
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
            Watch clips, spin the lucky wheel, and convert your Coins directly into real tournament entry cash!
          </p>

          {/* User Live Balance Pill */}
          <div className="inline-flex items-center gap-4 bg-slate-800/80 border border-slate-700/80 px-5 py-2.5 rounded-2xl shadow-xl mt-2">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Your Coins</div>
                <div className="font-heading font-black text-amber-400 text-base">{userCoins.toLocaleString()}</div>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-700"></div>

            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Wallet</div>
                <div className="font-heading font-black text-emerald-400 text-base">৳ {userWallet.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-4xl mx-auto px-4 w-full mt-6">
        <div className="grid grid-cols-3 gap-2 bg-slate-800/60 p-1.5 rounded-2xl border border-slate-700/80 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab('WATCH_EARN')}
            className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'WATCH_EARN'
                ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <PlaySquare className="w-4 h-4" />
            <span>Watch & Earn</span>
          </button>

          <button
            onClick={() => setActiveTab('LUCKY_SPIN')}
            className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'LUCKY_SPIN'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 shadow-lg font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <RotateCw className="w-4 h-4" />
            <span>Daily Lucky Spin</span>
          </button>

          <button
            onClick={() => setActiveTab('EXCHANGE')}
            className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'EXCHANGE'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Coin Exchange</span>
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">

        {/* ── TAB 1: WATCH & EARN ── */}
        {activeTab === 'WATCH_EARN' && (
          <div className="bg-slate-800/80 rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-4">
              <div>
                <h2 className="text-2xl font-heading font-black text-white flex items-center gap-2">
                  <PlaySquare className="w-6 h-6 text-red-500" />
                  <span>Free Fire Video Clip Rewards</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Watch official tournament gameplay clips without skipping to earn free Coins.
                </p>
              </div>

              {activeAds.length > 0 && watchStatus !== 'FINISHED_ALL' && (
                <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-bold text-amber-400 self-start sm:self-auto">
                  Clip {currentAdIndex + 1} of {activeAds.length} • +{currentAd?.rewardAmount || 10} Coins
                </span>
              )}
            </div>

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!adsEnabled ? (
              <div className="py-14 text-center space-y-3">
                <VideoOff className="w-16 h-16 text-slate-600 mx-auto" />
                <h3 className="text-xl font-bold text-slate-300">Watch & Earn is Temporarily Paused</h3>
                <p className="text-xs text-slate-500">Check back shortly or play the Lucky Spin Wheel!</p>
              </div>
            ) : watchStatus === 'FINISHED_ALL' ? (
              <div className="py-14 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">All Clips Completed!</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  You have watched all available promotional video clips for today. Spin the Lucky Wheel or check back tomorrow for more coins!
                </p>
                <button
                  onClick={() => setActiveTab('LUCKY_SPIN')}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs inline-flex items-center gap-2 shadow-lg transition-all"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>PLAY LUCKY SPIN WHEEL</span>
                </button>
              </div>
            ) : (
              <>
                {/* YouTube Video Player Container */}
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl border border-slate-700/80">
                  <div 
                    id="youtube-player" 
                    className="w-full h-full absolute top-0 left-0"
                    style={{ pointerEvents: watchStatus === 'CLAIMED' ? 'none' : 'auto' }}
                  ></div>

                  {watchStatus === 'CLAIMED' && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-20">
                      <div className="text-center p-6 bg-slate-900/90 rounded-3xl border border-emerald-500/40 space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                        <div className="text-xl font-heading font-black text-white">Reward Claimed!</div>
                        <div className="text-sm font-bold text-emerald-300">+{currentAd?.rewardAmount} Coins Credited to Balance</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Control Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <div className="text-xs text-slate-400 text-center sm:text-left">
                    {watchStatus === 'IDLE' && '▶️ Click the YouTube play button above to begin watching.'}
                    {watchStatus === 'WATCHING' && (
                      <span className="text-amber-400 font-bold animate-pulse flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-400" />
                        Watching gameplay clip... Keep playing without skipping!
                      </span>
                    )}
                    {watchStatus === 'COMPLETED' && (
                      <span className="text-emerald-400 font-bold">
                        ✅ Clip finished! Click below to claim your coins.
                      </span>
                    )}
                  </div>

                  {watchStatus === 'COMPLETED' && (
                    <button
                      onClick={handleClaimAdCoins}
                      disabled={isProcessingClaim}
                      className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105"
                    >
                      {isProcessingClaim ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <>
                          <Coins className="w-5 h-5 text-slate-950" />
                          <span>CLAIM {currentAd?.rewardAmount} COINS</span>
                        </>
                      )}
                    </button>
                  )}

                  {watchStatus === 'CLAIMED' && (
                    <button
                      onClick={handleNextAd}
                      className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105"
                    >
                      <span>Watch Next Clip</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            )}

          </div>
        )}

        {/* ── TAB 2: DAILY LUCKY SPIN WHEEL ── */}
        {activeTab === 'LUCKY_SPIN' && (
          <div className="bg-slate-800/80 rounded-3xl p-6 sm:p-10 border border-slate-700/80 shadow-2xl space-y-8 text-center">
            
            <div className="space-y-2">
              <h2 className="text-3xl font-heading font-black text-white flex items-center justify-center gap-2">
                <RotateCw className="w-7 h-7 text-amber-400" />
                <span>DAILY LUCKY SPIN WHEEL</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Spin the wheel to win Free Fire Diamonds, Cash prizes, or Coin bundles credited instantly to your account!
              </p>
            </div>

            {/* Glowing Spin Wheel Section */}
            <div className="relative w-72 h-72 sm:w-84 sm:h-84 mx-auto my-4 flex items-center justify-center">
              
              {/* Outer Glowing Ring */}
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.25)] animate-pulse pointer-events-none"></div>

              {/* Wheel Pointer */}
              <div className="absolute -top-4 z-30 flex flex-col items-center">
                <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 drop-shadow-md"></div>
              </div>

              {/* The Spinning Wheel Canvas/SVG */}
              <div 
                className="w-full h-full rounded-full border-4 border-slate-900 shadow-2xl relative overflow-hidden transition-transform duration-[4000ms] ease-out"
                style={{ transform: `rotate(${wheelRotation}deg)` }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {WHEEL_PRIZES.map((prize, idx) => {
                    const angle = 360 / WHEEL_PRIZES.length;
                    const startAngle = idx * angle;
                    const endAngle = startAngle + angle;

                    // Convert polar to cartesian
                    const x1 = 50 + 50 * Math.cos((Math.PI * (startAngle - 90)) / 180);
                    const y1 = 50 + 50 * Math.sin((Math.PI * (startAngle - 90)) / 180);
                    const x2 = 50 + 50 * Math.cos((Math.PI * (endAngle - 90)) / 180);
                    const y2 = 50 + 50 * Math.sin((Math.PI * (endAngle - 90)) / 180);

                    const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

                    // Text rotation & position
                    const textAngle = startAngle + angle / 2;
                    const rad = (Math.PI * (textAngle - 90)) / 180;
                    const tx = 50 + 33 * Math.cos(rad);
                    const ty = 50 + 33 * Math.sin(rad);

                    return (
                      <g key={prize.id}>
                        <path d={pathData} fill={prize.color} stroke="#0F172A" strokeWidth="1" />
                        <text
                          x={tx}
                          y={ty}
                          fill="#FFFFFF"
                          fontSize="5.5"
                          fontWeight="900"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textAngle}, ${tx}, ${ty})`}
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                        >
                          {prize.text}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Center Hub Button */}
              <button
                onClick={handleSpinWheel}
                disabled={isSpinning}
                className="absolute z-20 w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-4 border-slate-900 shadow-2xl flex flex-col items-center justify-center text-slate-950 font-heading font-black text-xs hover:scale-105 transition-transform disabled:opacity-75 cursor-pointer"
              >
                {isSpinning ? (
                  <Loader2 className="w-6 h-6 animate-spin text-slate-950" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>SPIN</span>
                  </>
                )}
              </button>
            </div>

            {/* Spin CTA Button */}
            <div className="space-y-2 max-w-sm mx-auto">
              <button
                onClick={handleSpinWheel}
                disabled={isSpinning}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-heading font-black text-base shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>SPINNING THE WHEEL...</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-5 h-5 text-slate-950" />
                    <span>SPIN THE LUCKY WHEEL NOW</span>
                  </>
                )}
              </button>
              <div className="text-[11px] text-slate-400 font-semibold">100% Free Daily Spin for registered players!</div>
            </div>

          </div>
        )}

        {/* ── TAB 3: COIN EXCHANGE & SHOP ── */}
        {activeTab === 'EXCHANGE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Exchange Form Box */}
            <div className="bg-slate-800/80 rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl space-y-5">
              <div className="space-y-1 border-b border-slate-700 pb-3">
                <h3 className="text-xl font-heading font-black text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span>Convert Coins to Wallet ৳</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Rate: <strong>10 Coins = ৳1.00 BDT</strong> Promo credit to book match slots.
                </p>
              </div>

              <form onSubmit={handleConvertSubmit} className="space-y-4 text-xs font-medium">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-300">Amount of Coins to Convert *</label>
                    <span className="text-[11px] text-amber-400 font-bold">Balance: {userCoins} Coins</span>
                  </div>

                  <input
                    type="number"
                    value={convertCoins}
                    onChange={(e) => setConvertCoins(Number(e.target.value))}
                    required
                    min={10}
                    max={userCoins}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-black text-lg focus:outline-none focus:border-amber-500"
                  />

                  {/* Percentage shortcuts */}
                  <div className="flex gap-2 mt-2">
                    {[0.25, 0.5, 0.75, 1].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setConvertCoins(Math.floor(userCoins * pct))}
                        className="px-3 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-200 font-bold text-[11px] transition-colors"
                      >
                        {pct * 100}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">You Will Receive</div>
                    <div className="text-2xl font-heading font-black text-emerald-400">৳ {(convertCoins / 10).toFixed(2)} BDT</div>
                  </div>
                  <Sparkles className="w-7 h-7 text-emerald-400" />
                </div>

                <button
                  type="submit"
                  disabled={isConverting || userCoins < 10}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-heading font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>CONFIRM COIN EXCHANGE</span>}
                </button>
              </form>
            </div>

            {/* How It Works & Tournament Pass Box */}
            <div className="bg-slate-800/80 rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-heading font-black text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>Use Coins in Tournaments</span>
                </h3>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                      1
                    </div>
                    <div>
                      <div className="font-bold text-white">Direct Match Entry</div>
                      <div className="text-slate-400 mt-0.5">You can pay tournament entry fees directly with Coins on any tournament page!</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                      2
                    </div>
                    <div>
                      <div className="font-bold text-white">Win Real Cash (bKash)</div>
                      <div className="text-slate-400 mt-0.5">Win match prize pools and per-kill rewards which credit directly to your Withdrawable Winning Wallet.</div>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href="/tournaments"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-heading font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <span>JOIN LIVE TOURNAMENTS</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        )}

      </main>

      {/* ── Spin Winner Modal ── */}
      {showSpinWinModal && spinResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full border-2 border-amber-500/50 shadow-2xl text-center space-y-4 relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/40">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">Congratulations!</div>
              <h3 className="text-2xl font-heading font-black text-white">{spinResult.label}</h3>
              <p className="text-xs text-slate-400">
                {spinResult.value > 0 ? 'Reward has been credited directly to your account balance!' : 'Better luck on your next daily spin!'}
              </p>
            </div>

            <button
              onClick={() => setShowSpinWinModal(false)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg transition-all"
            >
              COLLECT & CONTINUE
            </button>
          </div>
        </div>
      )}

      <MobileBottomNav />
      <Footer />
    </div>
  );
}
