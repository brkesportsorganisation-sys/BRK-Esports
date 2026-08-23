import React from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { supabaseAdmin } from '@/lib/supabase';
import { Youtube, Flame, Trophy, Users, Calendar, Banknote, Radio, ExternalLink, MessageSquare, Share2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Live Tournament Broadcast | BRK Esports',
  description: 'Watch live Free Fire tournaments and championship matches on Black Rock Esports.',
};

export const revalidate = 5; // revalidate every 5 seconds for live stream updates

export default async function LivePage() {
  const { data: settings } = await supabaseAdmin
    .from('SiteSetting')
    .select('key, value');

  const settingsMap = (settings || []).reduce((acc: Record<string, string>, setting: any) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  const liveUrl = settingsMap.YOUTUBE_LIVE_URL || settingsMap.YOUTUBE_URL || '';
  const isLive = settingsMap.YOUTUBE_LIVE_IS_ACTIVE === 'true' || Boolean(liveUrl);
  const streamTitle = settingsMap.YOUTUBE_LIVE_TITLE || 'BRK Esports Free Fire Championship - Live Match';
  const streamDesc = settingsMap.YOUTUBE_LIVE_DESCRIPTION || 'Watch Bangladesh top Free Fire squads battle live for the championship trophy!';
  const channelUrl = settingsMap.YOUTUBE_CHANNEL_URL || 'https://youtube.com/@BRKEsports';

  // Extract YouTube ID
  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([^&?#]+)/);
    return match && match[1].length === 11 ? match[1] : null;
  };

  const videoId = getYoutubeId(liveUrl);

  // Fetch active upcoming tournaments
  const { data: tournaments } = await supabaseAdmin
    .from('Tournament')
    .select('*')
    .in('status', ['UPCOMING', 'LIVE'])
    .limit(4);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      <Navbar />

      <main className="flex-grow pt-6 sm:pt-8 pb-6 sm:pb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6 sm:space-y-8">
        
        {/* Stream Broadcast Banner Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-red-50 border border-red-200 text-brand-red font-bold uppercase tracking-widest text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{isLive ? 'Live YouTube Stream' : 'Official Broadcast Channel'}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black font-heading text-slate-900 tracking-tight leading-tight">
              {streamTitle}
            </h1>

            <p className="text-slate-600 text-xs sm:text-sm max-w-3xl">
              {streamDesc}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center flex-shrink-0">
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 hover:brightness-110 transition-all cursor-pointer"
            >
              <Youtube className="w-4 h-4" />
              <span>Subscribe on YouTube</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>

        {/* Video Player & Match Side-by-Side Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main 16:9 Video Embed Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video w-full rounded-3xl overflow-hidden bg-slate-950 relative group shadow-lg border border-slate-200">
              {videoId ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                  title={streamTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 border-0 w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-900">
                  <div className="w-16 h-16 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
                    <Youtube className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Broadcast Offline</h3>
                    <p className="text-xs text-slate-300 max-w-sm mt-1">
                      No live stream is currently active. Click below to check our official YouTube channel for match replays.
                    </p>
                  </div>
                  <a
                    href={channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-2 border border-slate-700"
                  >
                    <span>Visit YouTube Channel</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Video Controls & Social Info Bar */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>1080p 60FPS Low-Latency Feed</span>
              </div>

              <div className="flex items-center gap-4 text-slate-600">
                <span className="flex items-center gap-1 font-medium">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span>BRK Arena Spectator</span>
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Official Tournament Feed</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Active Match Rooms & Arena Links */}
          <div className="space-y-5">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-heading font-black text-sm text-slate-900 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>FEATURED ARENA MATCHES</span>
                </h3>
                <Link href="/tournaments" className="text-[11px] font-bold text-brand-orange hover:underline">
                  All Matches →
                </Link>
              </div>

              {tournaments && tournaments.length > 0 ? (
                <div className="space-y-3">
                  {tournaments.map((t: any) => (
                    <Link
                      key={t.id}
                      href={`/tournaments/${t.id}`}
                      className="block p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50/40 border border-slate-200 hover:border-brand-orange/40 transition-all group"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-orange-100 text-brand-orange font-bold uppercase">
                          {t.mode}
                        </span>
                        <span className="text-emerald-600 font-bold">৳ {t.prizePool} PRIZE</span>
                      </div>
                      <div className="font-bold text-xs text-slate-900 group-hover:text-brand-orange transition-colors truncate">
                        {t.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                        <span>Entry: ৳{t.entryFee}</span>
                        <span className="text-brand-orange font-semibold group-hover:translate-x-0.5 transition-transform">
                          Join Slot →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No active tournament slots right now.
                </div>
              )}
            </div>

            {/* Support & Channel Card */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-white via-red-50/20 to-orange-50/30 border border-red-200/80 space-y-3 shadow-sm">
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 font-heading">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                <span>Never Miss A Stream</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                Subscribe to our YouTube channel and turn on all notifications so you are alerted the exact second tournament custom rooms go live!
              </p>
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 transition-colors shadow-2xs"
              >
                <Youtube className="w-4 h-4 text-red-600" />
                <span>Open YouTube Channel</span>
              </a>
            </div>

          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
