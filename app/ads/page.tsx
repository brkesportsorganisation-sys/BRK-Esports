'use client';

import React, { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/db';
import { PlaySquare, Coins, AlertTriangle, CheckCircle2, ChevronRight, VideoOff } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type AdItem = {
  id: string;
  videoId: string;
  rewardAmount: number;
  isActive: boolean;
};

export default function AdsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adSettings, setAdSettings] = useState<any>(null);
  const [activeAds, setActiveAds] = useState<AdItem[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'WATCHING' | 'COMPLETED' | 'CLAIMED' | 'FINISHED_ALL'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const playerRef = useRef<any>(null);
  const lastTimeRef = useRef<number>(0);
  const checkIntervalRef = useRef<any>(null);

  useEffect(() => {
    setCurrentUser(db.getCurrentUser());
    const settings = db.getAdSettings();
    setAdSettings(settings);

    if (settings?.isActive && settings?.ads) {
      const availableAds = settings.ads.filter((ad: AdItem) => ad.isActive && ad.videoId);
      setActiveAds(availableAds);
      
      if (availableAds.length === 0) {
        setStatus('FINISHED_ALL');
        return;
      }

      // Load YouTube API
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
          initPlayer(availableAds[0].videoId);
        };
      } else {
        initPlayer(availableAds[0].videoId);
      }
    } else {
        setStatus('FINISHED_ALL');
    }

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, []);

  const initPlayer = (videoId: string) => {
    if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
        return;
    }
    
    playerRef.current = new window.YT.Player('youtube-player', {
      height: '315',
      width: '100%',
      videoId: videoId,
      playerVars: {
        controls: 1,
        disablekb: 1, // Disable keyboard controls to prevent skipping
        fs: 0,
        rel: 0,
        modestbranding: 1
      },
      events: {
        onReady: () => setPlayerReady(true),
        onStateChange: onPlayerStateChange
      }
    });
  };

  const onPlayerStateChange = (event: any) => {
    if (status === 'COMPLETED' || status === 'CLAIMED' || status === 'FINISHED_ALL') return;

    if (event.data === window.YT.PlayerState.PLAYING) {
      setStatus('WATCHING');
      setErrorMsg('');
      
      // Start monitoring playback to prevent skipping
      checkIntervalRef.current = setInterval(() => {
        const currentTime = playerRef.current.getCurrentTime();
        
        // If they skipped forward by more than 2 seconds
        if (currentTime > lastTimeRef.current + 2) {
          playerRef.current.seekTo(lastTimeRef.current);
          setErrorMsg('No skipping allowed! Please watch the full ad.');
        } else {
          lastTimeRef.current = currentTime;
        }

        // Check if finished
        const duration = playerRef.current.getDuration();
        if (duration > 0 && currentTime >= duration - 1) { // 1 second buffer
          clearInterval(checkIntervalRef.current);
          setStatus('COMPLETED');
        }
      }, 1000);
    } else {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    }
    
    if (event.data === window.YT.PlayerState.ENDED) {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      setStatus('COMPLETED');
    }
  };

  const handleClaim = async () => {
    if (!currentUser || status !== 'COMPLETED') return;
    
    const currentAd = activeAds[currentAdIndex];
    if (!currentAd) return;

    setIsProcessing(true);
    try {
      // Create transaction via our API
      const response = await fetch('/api/ads/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, amount: currentAd.rewardAmount })
      });
      
      if (response.ok) {
        // Also update local mock for immediate UI feedback
        const updated = db.updateUser(currentUser.id, { 
          coinBalance: (currentUser.coinBalance || 0) + currentAd.rewardAmount 
        });
        if (updated) {
          setCurrentUser(updated);
        }
        setStatus('CLAIMED');
      } else {
        setErrorMsg('Failed to claim reward. Please try again.');
      }
    } catch (e) {
      setErrorMsg('Something went wrong!');
    }
    setIsProcessing(false);
  };

  const handleNextAd = () => {
      const nextIndex = currentAdIndex + 1;
      if (nextIndex < activeAds.length) {
          setCurrentAdIndex(nextIndex);
          setStatus('IDLE');
          lastTimeRef.current = 0;
          setErrorMsg('');
          if (playerRef.current) {
              playerRef.current.loadVideoById(activeAds[nextIndex].videoId);
          } else {
              initPlayer(activeAds[nextIndex].videoId);
          }
      } else {
          setStatus('FINISHED_ALL');
      }
  };

  if (!adSettings?.isActive) {
    return (
      <div className="min-h-[90vh] bg-[#fdfaf6] flex flex-col items-center justify-center p-4 text-center">
        <VideoOff className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900">Ads Currently Disabled</h2>
        <p className="text-slate-600 font-medium mt-2">Check back later for opportunities to earn free coins!</p>
      </div>
    );
  }

  const currentAd = activeAds[currentAdIndex];

  return (
    <div className="min-h-[90vh] bg-[#fdfaf6] p-4 lg:p-8 pb-32">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-xl border border-slate-200">
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
              <PlaySquare className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-heading font-black text-slate-900">Watch & Earn</h1>
            {status !== 'FINISHED_ALL' && currentAd ? (
                <p className="text-slate-600 font-medium mt-2 text-sm md:text-base">
                  Watch the full video without skipping to earn <span className="font-bold text-brand-orange">{currentAd.rewardAmount} Coins</span>!
                  <span className="block mt-1 text-xs font-bold text-slate-600">Ad {currentAdIndex + 1} of {activeAds.length}</span>
                </p>
            ) : (
                <p className="text-slate-600 font-medium mt-2 text-sm md:text-base">
                  You've caught up!
                </p>
            )}
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {errorMsg}
            </div>
          )}

          {status === 'FINISHED_ALL' ? (
             <div className="py-12 flex flex-col items-center text-center">
                 <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
                 <h2 className="text-2xl font-bold text-slate-800">You're all caught up!</h2>
                 <p className="text-slate-600 font-medium mt-2 max-w-md">
                     You have watched all available ads for now. Please check back later for more opportunities to earn coins.
                 </p>
             </div>
          ) : (
              <>
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video shadow-lg mb-8">
                    <div id="youtube-player" className="w-full h-full absolute top-0 left-0 pointer-events-none" style={{ pointerEvents: status === 'CLAIMED' ? 'none' : 'auto' }}></div>
                    {status === 'CLAIMED' && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                             <div className="text-center p-6 bg-white/10 rounded-3xl border border-white/20">
                                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                                <div className="text-xl font-bold text-white mb-1">Reward Claimed!</div>
                                <div className="text-emerald-200 font-medium">+{currentAd?.rewardAmount} Coins Added</div>
                             </div>
                        </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center min-h-[60px]">
                    {status === 'IDLE' && (
                      <p className="text-slate-600 font-medium">Play the video above to start earning.</p>
                    )}
                    
                    {status === 'WATCHING' && (
                      <div className="flex items-center gap-3 text-brand-orange font-bold animate-pulse">
                        <PlaySquare className="w-5 h-5" />
                        Watching... Do not skip!
                      </div>
                    )}
                    
                    {status === 'COMPLETED' && (
                      <button 
                        onClick={handleClaim}
                        disabled={isProcessing}
                        className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {isProcessing ? 'Claiming...' : (
                          <>
                            <Coins className="w-6 h-6" />
                            Claim {currentAd?.rewardAmount} Coins
                          </>
                        )}
                      </button>
                    )}

                    {status === 'CLAIMED' && (
                      <button 
                         onClick={handleNextAd}
                         className="w-full md:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105"
                      >
                          Watch Next Ad
                          <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
              </>
          )}
          
        </div>
      </div>
    </div>
  );
}
