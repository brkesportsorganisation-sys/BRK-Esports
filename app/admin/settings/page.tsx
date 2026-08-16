'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Settings, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  Phone, 
  CreditCard, 
  RefreshCw, 
  Loader2, 
  LayoutTemplate, 
  Sparkles, 
  Flame, 
  Trophy, 
  Award, 
  Clock, 
  Users, 
  ExternalLink,
  Sliders,
  Check
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'HOMEPAGE' | 'PAYMENTS' | 'GENERAL'>('HOMEPAGE');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // 1. Homepage Hero & Banner States
  const [heroBadge, setHeroBadge] = useState('Season 5 Bangladesh Championship Live');
  const [heroTitle1, setHeroTitle1] = useState('DOMINATE THE');
  const [heroTitle2, setHeroTitle2] = useState('FREE FIRE ARENA');
  const [heroDesc, setHeroDesc] = useState("Join Bangladesh's premier automated Free Fire esports platform. Compete in daily BR Squad, Duo & CS 4v4 tournaments, earn instant bKash payouts per kill, and claim the championship trophy.");
  const [heroBtn1Text, setHeroBtn1Text] = useState('BROWSE TOURNAMENTS');
  const [heroBtn1Link, setHeroBtn1Link] = useState('/tournaments');
  const [heroBtn2Text, setHeroBtn2Text] = useState('CLAIM FREE REWARDS');
  const [heroBtn2Link, setHeroBtn2Link] = useState('/rewards');
  
  // Hero 3 Trust Stats
  const [heroStat1Val, setHeroStat1Val] = useState('৳ 2.5 Lakh+');
  const [heroStat1Label, setHeroStat1Label] = useState('Prize Pool Paid');
  const [heroStat2Val, setHeroStat2Val] = useState('15,000+');
  const [heroStat2Label, setHeroStat2Label] = useState('Active Players');
  const [heroStat3Val, setHeroStat3Val] = useState('100%');
  const [heroStat3Label, setHeroStat3Label] = useState('Anti-Cheat Safe');

  // Featured League Card (Right side of hero)
  const [featuredBadge, setFeaturedBadge] = useState('FEATURED LEAGUE');
  const [featuredTitle, setFeaturedTitle] = useState('Grand Free Fire BR Squad League #42');
  const [featuredImage, setFeaturedImage] = useState('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800');
  const [featuredPrize, setFeaturedPrize] = useState('৳ 4,000 CASH');
  const [featuredEntry, setFeaturedEntry] = useState('ENTRY ৳100');
  const [featuredLink, setFeaturedLink] = useState('/tournaments');

  // Live Slot Ticker Bar
  const [tickerTitle, setTickerTitle] = useState('LIVE ARENA SLOTS STATUS:');
  const [tickerAmLabel, setTickerAmLabel] = useState('AM Slots (Morning):');
  const [tickerAmText, setTickerAmText] = useState('4 OPEN');
  const [tickerPmLabel, setTickerPmLabel] = useState('PM Slots (Prime Evening):');
  const [tickerPmText, setTickerPmText] = useState('8 OPEN');
  const [tickerBtnText, setTickerBtnText] = useState('BOOK SLOT');
  const [tickerBtnLink, setTickerBtnLink] = useState('/tournaments');

  // Referral Rewards Crusade Banner
  const [refBannerBadge, setRefBannerBadge] = useState('MONTHLY EVENT • RESETS 1ST OF EVERY MONTH');
  const [refBannerTitle, setRefBannerTitle] = useState('REFERRAL REWARDS CRUSADE');
  const [refBannerDesc, setRefBannerDesc] = useState('Invite friends to Black Rock Arena. Rewards credit to your Promo Wallet to join tournaments for free!');
  const [refBtn1Text, setRefBtn1Text] = useState('GET REFERRAL LINK');
  const [refBtn1Link, setRefBtn1Link] = useState('/profile');
  const [refBtn2Text, setRefBtn2Text] = useState('FIND SQUAD (LFG)');
  const [refBtn2Link, setRefBtn2Link] = useState('/lfg');

  // 2. Payment Agent Numbers & Thresholds
  const [bkashNo, setBkashNo] = useState('01712-998877');
  const [nagadNo, setNagadNo] = useState('01812-998877');
  const [rocketNo, setRocketNo] = useState('01912-998877');
  const [minDeposit, setMinDeposit] = useState('20');
  const [minWithdraw, setMinWithdraw] = useState('50');

  // 3. Platform General Branding
  const [siteName, setSiteName] = useState('BlackRock Esports');
  const [helpline, setHelpline] = useState('+880 1712-998877');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        
        // Homepage
        if (s.hero_badge) setHeroBadge(s.hero_badge);
        if (s.hero_title_1) setHeroTitle1(s.hero_title_1);
        if (s.hero_title_2) setHeroTitle2(s.hero_title_2);
        if (s.hero_desc) setHeroDesc(s.hero_desc);
        if (s.hero_btn_1_text) setHeroBtn1Text(s.hero_btn_1_text);
        if (s.hero_btn_1_link) setHeroBtn1Link(s.hero_btn_1_link);
        if (s.hero_btn_2_text) setHeroBtn2Text(s.hero_btn_2_text);
        if (s.hero_btn_2_link) setHeroBtn2Link(s.hero_btn_2_link);

        if (s.hero_stat_1_val) setHeroStat1Val(s.hero_stat_1_val);
        if (s.hero_stat_1_label) setHeroStat1Label(s.hero_stat_1_label);
        if (s.hero_stat_2_val) setHeroStat2Val(s.hero_stat_2_val);
        if (s.hero_stat_2_label) setHeroStat2Label(s.hero_stat_2_label);
        if (s.hero_stat_3_val) setHeroStat3Val(s.hero_stat_3_val);
        if (s.hero_stat_3_label) setHeroStat3Label(s.hero_stat_3_label);

        if (s.featured_badge) setFeaturedBadge(s.featured_badge);
        if (s.featured_title) setFeaturedTitle(s.featured_title);
        if (s.featured_image) setFeaturedImage(s.featured_image);
        if (s.featured_prize) setFeaturedPrize(s.featured_prize);
        if (s.featured_entry) setFeaturedEntry(s.featured_entry);
        if (s.featured_link) setFeaturedLink(s.featured_link);

        if (s.ticker_title) setTickerTitle(s.ticker_title);
        if (s.ticker_am_label) setTickerAmLabel(s.ticker_am_label);
        if (s.ticker_am_text) setTickerAmText(s.ticker_am_text);
        if (s.ticker_pm_label) setTickerPmLabel(s.ticker_pm_label);
        if (s.ticker_pm_text) setTickerPmText(s.ticker_pm_text);
        if (s.ticker_btn_text) setTickerBtnText(s.ticker_btn_text);
        if (s.ticker_btn_link) setTickerBtnLink(s.ticker_btn_link);

        if (s.ref_banner_badge) setRefBannerBadge(s.ref_banner_badge);
        if (s.ref_banner_title) setRefBannerTitle(s.ref_banner_title);
        if (s.ref_banner_desc) setRefBannerDesc(s.ref_banner_desc);
        if (s.ref_btn_1_text) setRefBtn1Text(s.ref_btn_1_text);
        if (s.ref_btn_1_link) setRefBtn1Link(s.ref_btn_1_link);
        if (s.ref_btn_2_text) setRefBtn2Text(s.ref_btn_2_text);
        if (s.ref_btn_2_link) setRefBtn2Link(s.ref_btn_2_link);

        // Payments & General
        if (s.bkash_no) setBkashNo(s.bkash_no);
        if (s.nagad_no) setNagadNo(s.nagad_no);
        if (s.rocket_no) setRocketNo(s.rocket_no);
        if (s.min_deposit) setMinDeposit(s.min_deposit);
        if (s.min_withdraw) setMinWithdraw(s.min_withdraw);
        if (s.site_name) setSiteName(s.site_name);
        if (s.helpline) setHelpline(s.helpline);
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Record<string, string> = {
        // Homepage Hero
        hero_badge: heroBadge,
        hero_title_1: heroTitle1,
        hero_title_2: heroTitle2,
        hero_desc: heroDesc,
        hero_btn_1_text: heroBtn1Text,
        hero_btn_1_link: heroBtn1Link,
        hero_btn_2_text: heroBtn2Text,
        hero_btn_2_link: heroBtn2Link,

        hero_stat_1_val: heroStat1Val,
        hero_stat_1_label: heroStat1Label,
        hero_stat_2_val: heroStat2Val,
        hero_stat_2_label: heroStat2Label,
        hero_stat_3_val: heroStat3Val,
        hero_stat_3_label: heroStat3Label,

        featured_badge: featuredBadge,
        featured_title: featuredTitle,
        featured_image: featuredImage,
        featured_prize: featuredPrize,
        featured_entry: featuredEntry,
        featured_link: featuredLink,

        ticker_title: tickerTitle,
        ticker_am_label: tickerAmLabel,
        ticker_am_text: tickerAmText,
        ticker_pm_label: tickerPmLabel,
        ticker_pm_text: tickerPmText,
        ticker_btn_text: tickerBtnText,
        ticker_btn_link: tickerBtnLink,

        ref_banner_badge: refBannerBadge,
        ref_banner_title: refBannerTitle,
        ref_banner_desc: refBannerDesc,
        ref_btn_1_text: refBtn1Text,
        ref_btn_1_link: refBtn1Link,
        ref_btn_2_text: refBtn2Text,
        ref_btn_2_link: refBtn2Link,

        // Payments & General
        bkash_no: bkashNo,
        nagad_no: nagadNo,
        rocket_no: rocketNo,
        min_deposit: minDeposit,
        min_withdraw: minWithdraw,
        site_name: siteName,
        helpline: helpline,
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: payload }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        const err = await res.json();
        alert(err.message || 'Error saving settings.');
      }
    } catch (err) {
      console.error('Save settings error:', err);
      alert('Network error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 font-sans">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Platform Settings & Homepage CMS
          </h1>
          <p className="text-[13px] text-[#64748B] font-normal mt-1">
            Customize homepage hero headlines, featured cards, slot tickers, and mobile banking agent numbers.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#2563EB] text-xs font-semibold shadow-xs transition-all"
          >
            <span>View Live Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={handleSaveAll}
            disabled={isSaving || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-[12px] bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving Changes...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-[16px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          <span>All homepage content & platform settings saved successfully to Supabase database!</span>
        </div>
      )}

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('HOMEPAGE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-colors ${
            activeTab === 'HOMEPAGE'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          <span>🏠 Homepage Hero & Banners CMS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PAYMENTS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-colors ${
            activeTab === 'PAYMENTS'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>💳 Mobile Banking Agent Numbers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GENERAL')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-colors ${
            activeTab === 'GENERAL'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>⚙️ Branding & Helpline</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#2563EB]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSaveAll} className="space-y-6 text-xs font-medium">
          
          {/* TAB 1: HOMEPAGE HERO & BANNERS CMS */}
          {activeTab === 'HOMEPAGE' && (
            <div className="space-y-6">
              
              {/* 1.1 Hero Main Headlines & Description */}
              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
                  <Flame className="w-5 h-5 text-brand-red" />
                  <h2 className="text-[17px] font-bold text-[#0F172A]">Hero Header & Typography</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
                  <div className="md:col-span-12">
                    <label className="block text-[#475569] font-semibold mb-1">Top Hero Badge Text</label>
                    <input
                      type="text"
                      value={heroBadge}
                      onChange={(e) => setHeroBadge(e.target.value)}
                      placeholder="e.g. Season 5 Bangladesh Championship Live"
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-semibold text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <label className="block text-[#475569] font-semibold mb-1">Main Headline (Line 1)</label>
                    <input
                      type="text"
                      value={heroTitle1}
                      onChange={(e) => setHeroTitle1(e.target.value)}
                      placeholder="e.g. DOMINATE THE"
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <label className="block text-brand-red font-semibold mb-1">Highlighted Gradient Headline (Line 2)</label>
                    <input
                      type="text"
                      value={heroTitle2}
                      onChange={(e) => setHeroTitle2(e.target.value)}
                      placeholder="e.g. FREE FIRE ARENA"
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-brand-red focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div className="md:col-span-12">
                    <label className="block text-[#475569] font-semibold mb-1">Hero Description Subtitle</label>
                    <textarea
                      rows={3}
                      value={heroDesc}
                      onChange={(e) => setHeroDesc(e.target.value)}
                      placeholder="Enter the hero description paragraph..."
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                {/* Hero CTA Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#F1F5F9]">
                  <div className="space-y-2">
                    <label className="block text-[#2563EB] font-bold">Primary Button 1 (Left)</label>
                    <input
                      type="text"
                      value={heroBtn1Text}
                      onChange={(e) => setHeroBtn1Text(e.target.value)}
                      placeholder="Button Text"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A]"
                    />
                    <input
                      type="text"
                      value={heroBtn1Link}
                      onChange={(e) => setHeroBtn1Link(e.target.value)}
                      placeholder="Link Target (e.g. /tournaments)"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#64748B]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[#0F172A] font-bold">Secondary Button 2 (Right)</label>
                    <input
                      type="text"
                      value={heroBtn2Text}
                      onChange={(e) => setHeroBtn2Text(e.target.value)}
                      placeholder="Button Text"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A]"
                    />
                    <input
                      type="text"
                      value={heroBtn2Link}
                      onChange={(e) => setHeroBtn2Link(e.target.value)}
                      placeholder="Link Target (e.g. /rewards)"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#64748B]"
                    />
                  </div>
                </div>
              </div>

              {/* 1.2 Hero 3 Trust Stat Badges */}
              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h2 className="text-[17px] font-bold text-[#0F172A]">Hero 3 Trust Stat Counters</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="p-4 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <span className="text-[11px] font-bold text-amber-600">Stat 1 (Prize Pool)</span>
                    <input
                      type="text"
                      value={heroStat1Val}
                      onChange={(e) => setHeroStat1Val(e.target.value)}
                      placeholder="৳ 2.5 Lakh+"
                      className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E2E8F0] font-bold text-xs text-[#0F172A]"
                    />
                    <input
                      type="text"
                      value={heroStat1Label}
                      onChange={(e) => setHeroStat1Label(e.target.value)}
                      placeholder="Prize Pool Paid"
                      className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E2E8F0] text-xs text-[#64748B]"
                    />
                  </div>

                  <div className="p-4 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <span className="text-[11px] font-bold text-cyan-600">Stat 2 (Players)</span>
                    <input
                      type="text"
                      value={heroStat2Val}
                      onChange={(e) => setHeroStat2Val(e.target.value)}
                      placeholder="15,000+"
                      className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E2E8F0] font-bold text-xs text-[#0F172A]"
                    />
                    <input
                      type="text"
                      value={heroStat2Label}
                      onChange={(e) => setHeroStat2Label(e.target.value)}
                      placeholder="Active Players"
                      className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E2E8F0] text-xs text-[#64748B]"
                    />
                  </div>

                  <div className="p-4 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <span className="text-[11px] font-bold text-red-600">Stat 3 (Anti-Cheat)</span>
                    <input
                      type="text"
                      value={heroStat3Val}
                      onChange={(e) => setHeroStat3Val(e.target.value)}
                      placeholder="100%"
                      className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E2E8F0] font-bold text-xs text-[#0F172A]"
                    />
                    <input
                      type="text"
                      value={heroStat3Label}
                      onChange={(e) => setHeroStat3Label(e.target.value)}
                      placeholder="Anti-Cheat Safe"
                      className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E2E8F0] text-xs text-[#64748B]"
                    />
                  </div>
                </div>
              </div>

              {/* 1.3 Featured League Card (Right side of Hero) */}
              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
                  <Trophy className="w-5 h-5 text-orange-500" />
                  <h2 className="text-[17px] font-bold text-[#0F172A]">Featured League Card (Hero Graphic)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">Badge Tag</label>
                    <input
                      type="text"
                      value={featuredBadge}
                      onChange={(e) => setFeaturedBadge(e.target.value)}
                      placeholder="FEATURED LEAGUE"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">Tournament Title</label>
                    <input
                      type="text"
                      value={featuredTitle}
                      onChange={(e) => setFeaturedTitle(e.target.value)}
                      placeholder="Grand Free Fire BR Squad League #42"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[#475569] font-semibold mb-1">Banner Image URL</label>
                    <input
                      type="text"
                      value={featuredImage}
                      onChange={(e) => setFeaturedImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#0F172A]"
                    />
                  </div>

                  <div>
                    <label className="block text-orange-600 font-semibold mb-1">Prize Pool Text</label>
                    <input
                      type="text"
                      value={featuredPrize}
                      onChange={(e) => setFeaturedPrize(e.target.value)}
                      placeholder="৳ 4,000 CASH"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-orange-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[#2563EB] font-semibold mb-1">Entry Fee Button Text & Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={featuredEntry}
                        onChange={(e) => setFeaturedEntry(e.target.value)}
                        placeholder="ENTRY ৳100"
                        className="w-1/2 px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A]"
                      />
                      <input
                        type="text"
                        value={featuredLink}
                        onChange={(e) => setFeaturedLink(e.target.value)}
                        placeholder="/tournaments"
                        className="w-1/2 px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#64748B]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 1.4 Live Arena Slots Status Ticker Bar */}
              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-[17px] font-bold text-[#0F172A]">Live Arena Slots Running Counter Bar</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">Ticker Label</label>
                    <input
                      type="text"
                      value={tickerTitle}
                      onChange={(e) => setTickerTitle(e.target.value)}
                      placeholder="LIVE ARENA SLOTS STATUS:"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A]"
                    />
                  </div>

                  <div>
                    <label className="block text-emerald-600 font-semibold mb-1">AM Slots Text</label>
                    <input
                      type="text"
                      value={tickerAmText}
                      onChange={(e) => setTickerAmText(e.target.value)}
                      placeholder="4 OPEN"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-orange-600 font-semibold mb-1">PM Slots Text</label>
                    <input
                      type="text"
                      value={tickerPmText}
                      onChange={(e) => setTickerPmText(e.target.value)}
                      placeholder="8 OPEN"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-orange-600"
                    />
                  </div>
                </div>
              </div>

              {/* 1.5 Monthly Referral Rewards Crusade Banner */}
              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-[17px] font-bold text-[#0F172A]">Monthly Referral Rewards Event Banner</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">Event Badge Text</label>
                    <input
                      type="text"
                      value={refBannerBadge}
                      onChange={(e) => setRefBannerBadge(e.target.value)}
                      placeholder="MONTHLY EVENT • RESETS 1ST OF EVERY MONTH"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">Banner Title</label>
                    <input
                      type="text"
                      value={refBannerTitle}
                      onChange={(e) => setRefBannerTitle(e.target.value)}
                      placeholder="REFERRAL REWARDS CRUSADE"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[#475569] font-semibold mb-1">Banner Subtitle / Description</label>
                    <input
                      type="text"
                      value={refBannerDesc}
                      onChange={(e) => setRefBannerDesc(e.target.value)}
                      placeholder="Invite friends to Black Rock Arena..."
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A]"
                    />
                  </div>

                  <div>
                    <label className="block text-brand-red font-semibold mb-1">Button 1 (Referral Link)</label>
                    <input
                      type="text"
                      value={refBtn1Text}
                      onChange={(e) => setRefBtn1Text(e.target.value)}
                      placeholder="GET REFERRAL LINK"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Button 2 (Find Squad LFG)</label>
                    <input
                      type="text"
                      value={refBtn2Text}
                      onChange={(e) => setRefBtn2Text(e.target.value)}
                      placeholder="FIND SQUAD (LFG)"
                      className="w-full px-3.5 py-2 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A]"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PAYMENTS & FINANCIAL LIMITS */}
          {activeTab === 'PAYMENTS' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                  <h2 className="text-[17px] font-bold text-[#0F172A]">Mobile Banking Payment Agent Numbers</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-pink-600 font-semibold mb-1">bKash Send Money Number</label>
                    <input
                      type="text"
                      value={bkashNo}
                      onChange={(e) => setBkashNo(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono font-bold text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-orange-600 font-semibold mb-1">Nagad Send Money Number</label>
                    <input
                      type="text"
                      value={nagadNo}
                      onChange={(e) => setNagadNo(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono font-bold text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-purple-600 font-semibold mb-1">Rocket Send Money Number</label>
                    <input
                      type="text"
                      value={rocketNo}
                      onChange={(e) => setRocketNo(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono font-bold text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-[17px] font-bold text-[#0F172A]">Financial Limits & Cashout Thresholds</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">Minimum Deposit Amount (৳ BDT)</label>
                    <input
                      type="number"
                      value={minDeposit}
                      onChange={(e) => setMinDeposit(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">Minimum Withdrawal / Cashout (৳ BDT)</label>
                    <input
                      type="number"
                      value={minWithdraw}
                      onChange={(e) => setMinWithdraw(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GENERAL BRANDING & HELPLINE */}
          {activeTab === 'GENERAL' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
                  <Phone className="w-5 h-5 text-[#2563EB]" />
                  <h2 className="text-[17px] font-bold text-[#0F172A]">Platform Branding & 24/7 Helpline</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">Platform Brand Name</label>
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">WhatsApp / Support Helpline Number</label>
                    <input
                      type="text"
                      value={helpline}
                      onChange={(e) => setHelpline(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono font-bold text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </form>
      )}

    </div>
  );
}
