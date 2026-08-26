import React, { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Flame, 
  ArrowRight,
  Bell,
  Sparkles,
  ShoppingBag,
  Coins,
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import HomeBannerSlider from '@/components/home/HomeBannerSlider';
import TournamentCard from '@/components/tournaments/TournamentCard';
import HomeClientSection from '@/components/home/HomeClientSection';
import { Tournament, Announcement, ShopProduct, Banner } from '@/lib/types';
import { initialTournaments } from '@/lib/mock-data';

// Revalidate every 60 seconds (ISR)
export const revalidate = 60;

// Server-side data fetching helpers
async function fetchTournaments(): Promise<Tournament[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esportszonebd.online';
    const res = await fetch(`${baseUrl}/api/tournaments`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return initialTournaments;
    const data = await res.json();
    return data.tournaments?.length > 0 ? data.tournaments : initialTournaments;
  } catch {
    return initialTournaments;
  }
}

async function fetchAnnouncements(): Promise<Announcement[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esportszonebd.online';
    const res = await fetch(`${baseUrl}/api/announcements?category=TOURNAMENT`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.announcements || [];
  } catch {
    return [];
  }
}

async function fetchShopItems(): Promise<ShopProduct[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esportszonebd.online';
    const res = await fetch(`${baseUrl}/api/shop`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items: ShopProduct[] = data.products || [];
    const homeFeatured = items.filter((p) => p.isFeaturedOnHome);
    return homeFeatured.length > 0 ? homeFeatured.slice(0, 3) : items.slice(0, 3);
  } catch {
    return [];
  }
}

async function fetchBanners(): Promise<{ shopBanner: Banner | null }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esportszonebd.online';
    const res = await fetch(`${baseUrl}/api/banners`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { shopBanner: null };
    const data = await res.json();
    return { shopBanner: data.shopBanner || null };
  } catch {
    return { shopBanner: null };
  }
}

export default async function HomePage() {
  // Fetch all data in parallel on the server
  const [tournaments, announcements, featuredShopItems, { shopBanner }] = await Promise.all([
    fetchTournaments(),
    fetchAnnouncements(),
    fetchShopItems(),
    fetchBanners(),
  ]);

  const displayedTournaments = tournaments.slice(0, 2);

  return (
    <div className="flex flex-col font-body w-full">
      <Navbar />

      <main id="main-content" className="flex-1 w-full">
        {/* Hero Banner Section */}
        <section className="relative pt-4 pb-4 overflow-hidden border-b border-slate-200 bg-slate-50/50">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-brand-red/10 via-brand-orange/10 to-brand-purple/10 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />

          {/* Banner Slider — client component */}
          <HomeBannerSlider />

          {/* Lottery Wheel — client component, loaded lazily */}
          <HomeClientSection />
        </section>

        {/* Featured Tournaments Section */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedTournaments.map((tour, idx) => (
                <TournamentCard key={tour.id} tournament={tour} priority={idx === 0} />
              ))}
            </div>
          </div>
        </section>

        {/* Featured Gaming Shop Section */}
        {featuredShopItems.length > 0 && (
          <section className="py-12 bg-white border-b border-slate-200 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                    <span>EZBD OFFICIAL GAMING SHOP</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
                    Free Fire Diamonds &amp; Coin Rewards Hub
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                    Use your tournament winnings or EZBD Coins to buy official Free Fire Diamonds, Weekly Passes, and Exclusive items with instant UID delivery!
                  </p>
                </div>

                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                >
                  <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                  <span>Visit Full Shop</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>

              {/* Shop Banner */}
              <Link
                href={shopBanner?.linkUrl || '/shop'}
                className="group relative block w-full rounded-3xl overflow-hidden border border-slate-800 hover:border-amber-400 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer bg-slate-950 text-white"
              >
                <div className="relative w-full overflow-hidden bg-slate-950">
                  <img
                    src={shopBanner?.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=75'}
                    alt={shopBanner?.title || 'Gaming Shop'}
                    className="w-full h-auto max-h-[360px] object-cover group-hover:scale-[1.01] transition-transform duration-700"
                  />
                </div>
              </Link>

              {/* Featured Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredShopItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#F8FAFC] rounded-3xl overflow-hidden border border-slate-200 hover:border-amber-400/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative"
                  >
                    <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                      <Image
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500'}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" aria-hidden="true" />

                      {item.badge && (
                        <span className="absolute top-3.5 right-3.5 z-10 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase shadow-md">
                          {item.badge}
                        </span>
                      )}

                      <div className="absolute bottom-3 left-3.5 z-10 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center text-sm shadow-xs">
                          {item.icon || '💎'}
                        </span>
                        <span className="text-[11px] font-bold text-white uppercase font-heading drop-shadow-sm">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <h3 className="font-heading font-black text-base text-slate-900 group-hover:text-brand-orange transition-colors line-clamp-1">
                          {item.name}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {item.description || 'Instant Free Fire game delivery directly to player UID.'}
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-1.5">
                        {(item.currencyType === 'WALLET' || item.currencyType === 'BOTH') && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-semibold">Cash / Wallet:</span>
                            <strong className="text-emerald-700 font-black text-sm">৳ {item.priceBdt} BDT</strong>
                          </div>
                        )}

                        {(item.currencyType === 'COINS' || item.currencyType === 'BOTH') && (
                          <div className={`flex items-center justify-between text-xs ${item.currencyType === 'BOTH' ? 'border-t border-slate-100 pt-1.5' : ''}`}>
                            <span className="text-slate-600 font-semibold flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                              <span>Or Pay With Coins:</span>
                            </span>
                            <strong className="text-amber-800 font-black text-sm">
                              {item.priceCoins.toLocaleString()} 🪙
                            </strong>
                          </div>
                        )}
                      </div>

                      <Link
                        href="/shop"
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-brand-red hover:to-brand-orange text-white font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs group-hover:shadow-md cursor-pointer"
                      >
                        <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                        <span>Buy / Redeem Now</span>
                      </Link>
                    </div>
                  </div>
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
      </main>

      <Footer />
    </div>
  );
}
