import React, { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Flame, 
  ArrowRight,
  Bell,
  Sparkles,
  ShoppingBag,
  ShoppingCart,
  Coins,
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import HomeBannerSlider from '@/components/home/HomeBannerSlider';
import TournamentCard from '@/components/tournaments/TournamentCard';
import HomeClientSection from '@/components/home/HomeClientSection';
import { Tournament, Announcement, ShopProduct, Banner, DEFAULT_SHOP_PRODUCTS } from '@/lib/types';
import { initialTournaments, initialBanners, initialAnnouncements } from '@/lib/mock-data';
import { listTournamentsFromDb } from '@/lib/tournament-store';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';

// Revalidate every 60 seconds (ISR)
export const revalidate = 60;

// Direct Server-side DB Loaders (Instant 0-10ms response, zero HTTP roundtrip delay)
async function fetchTournaments(): Promise<Tournament[]> {
  try {
    const list = await listTournamentsFromDb();
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function fetchAnnouncements(): Promise<Announcement[]> {
  try {
    const { data } = await supabaseAdmin
      .from('Announcement')
      .select('*')
      .order('createdAt', { ascending: false });
    if (data && data.length > 0) return data as Announcement[];
    return initialAnnouncements;
  } catch {
    return initialAnnouncements;
  }
}

async function fetchShopItems(): Promise<ShopProduct[]> {
  try {
    const { data } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'GAMING_SHOP_ITEMS')
      .single();

    if (data?.value) {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // ONLY return products that admin explicitly selected/marked for homepage
        const featured = (parsed as ShopProduct[]).filter((p) => p.isFeaturedOnHome && p.isActive !== false);
        return featured;
      }
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchBanners(): Promise<{ banners: Banner[]; shopBanner: Banner | null; settings?: any }> {
  try {
    const { data: dbBanners } = await supabaseAdmin
      .from('Banner')
      .select('*')
      .order('order', { ascending: true });

    const bannersList: Banner[] = dbBanners && dbBanners.length > 0 ? (dbBanners as Banner[]) : initialBanners;
    const activeBanners = bannersList.filter((b) => b.isActive !== false);
    const shopBanner = activeBanners.find((b) => b.placement === 'SHOP_BANNER') || null;

    return {
      banners: activeBanners,
      shopBanner,
      settings: { autoSlideInterval: 4000, isEnabled: true, overlayOpacity: 50 },
    };
  } catch {
    return {
      banners: initialBanners,
      shopBanner: null,
      settings: { autoSlideInterval: 4000, isEnabled: true, overlayOpacity: 50 },
    };
  }
}

export default async function HomePage() {
  // Fetch all data in parallel on the server
  const [tournaments, announcements, featuredShopItems, { banners, shopBanner, settings }] = await Promise.all([
    fetchTournaments(),
    fetchAnnouncements(),
    fetchShopItems(),
    fetchBanners(),
  ]);

  const displayedTournaments = tournaments
    .filter((t) => t.status !== 'DRAFT' && t.isPublished !== false)
    .slice(0, 2);

  return (
    <div className="flex flex-col font-body w-full">
      <Navbar />

      <main id="main-content" className="flex-1 w-full">
        {/* Hero Banner Section */}
        <section className="relative pt-4 pb-4 overflow-hidden border-b border-slate-200 bg-slate-50/50">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-brand-red/10 via-brand-orange/10 to-brand-purple/10 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />

          {/* Banner Slider — client component with server preloaded initialData for instant LCP */}
          <HomeBannerSlider initialData={{ banners, settings }} />
        </section>

        {/* Featured Tournaments Section (Only shown when admin creates real tournaments) */}
        {displayedTournaments.length > 0 && (
          <section className="pt-6 pb-12 bg-slate-50/70 border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 border border-orange-300 text-orange-900 text-xs font-black uppercase tracking-wider">
                    <Flame className="w-3.5 h-3.5 text-orange-700 animate-pulse" aria-hidden="true" />
                    <span>FEATURED TOURNAMENTS</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
                    Live &amp; Featured Arena Tournaments
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                    Compete in top esports matches, climb the leaderboard, and claim real bKash &amp; Nagad cash prizes.
                  </p>
                </div>

                <Link
                  href="/tournaments"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-red via-brand-orange to-brand-gold hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-neon-orange transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                >
                  <span>Explore All Tournaments</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-6 max-w-md mx-auto w-full">
                {displayedTournaments.map((tour, idx) => (
                  <TournamentCard key={tour.id} tournament={tour} priority={idx === 0} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Recent Announcements Section */}
        {announcements.length > 0 && (
          <section className="py-12 bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="flex items-center space-x-2 text-red-700 text-xs font-black uppercase tracking-widest mb-4">
                <Bell className="w-4 h-4" aria-hidden="true" />
                <span>Latest Tournament Announcements</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {announcements.slice(0, 3).map((ann) => (
                  <div key={ann.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col">
                    {ann.imageUrl && (
                      <div className="relative w-full h-32 rounded-xl overflow-hidden mb-4 bg-slate-200">
                        <Image
                          src={ann.imageUrl}
                          alt={ann.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 400px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">{ann.title}</h3>
                    <p className="text-slate-700 text-sm flex-1">{ann.content}</p>

                    {ann.link && (
                      <Link
                        href={ann.link}
                        className="mt-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold text-xs text-center hover:opacity-90 transition-opacity"
                      >
                        VIEW TOURNAMENT SLOT
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Lucky Spin Wheel Section (Moved to the very bottom) */}
        <section className="py-8 bg-slate-50/50 border-b border-slate-200 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-purple-500/10 via-amber-500/10 to-orange-500/10 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />
          <HomeClientSection />
        </section>
      </main>

      <Footer />
    </div>
  );
}
