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
  Check,
  Radio,
  Youtube,
  Send,
  Bell,
  Eye,
  Mail,
  Key,
  Inbox,
  AlertCircle
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'HOMEPAGE' | 'YOUTUBE_LIVE' | 'WELCOME_EMAIL' | 'PAYMENTS' | 'GENERAL'>('HOMEPAGE');
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

  // 2. YouTube Live Stream & Video Upload CMS
  const [youtubeLiveUrl, setYoutubeLiveUrl] = useState('');
  const [youtubeLiveIsActive, setYoutubeLiveIsActive] = useState(false);
  const [youtubeLiveTitle, setYoutubeLiveTitle] = useState('BRK Esports Free Fire Championship - Live Match');
  const [youtubeLiveDesc, setYoutubeLiveDesc] = useState('Watch Bangladesh top Free Fire squads battle live for Booyah glory! Like & Subscribe.');
  const [youtubeChannelUrl, setYoutubeChannelUrl] = useState('https://youtube.com/@BRKEsports');
  const [notifyProcessing, setNotifyProcessing] = useState(false);
  const [notifySuccessMsg, setNotifySuccessMsg] = useState('');

  // 3. Welcome Email (Resend) CMS
  const [welcomeEmailEnabled, setWelcomeEmailEnabled] = useState(true);
  const [resendApiKey, setResendApiKey] = useState('');
  const [welcomeEmailFrom, setWelcomeEmailFrom] = useState('BlackRock Esports <onboarding@resend.dev>');
  const [welcomeEmailSubject, setWelcomeEmailSubject] = useState('🔥 Welcome to Black Rock Esports - Player ID: {PLAYER_ID}');
  const [welcomeEmailBody, setWelcomeEmailBody] = useState(`Welcome to Black Rock Esports, {NAME}!

Your official Player Unique ID is {PLAYER_ID}.
You are now ready to compete in daily Free Fire squad, duo, and solo championship tournaments with automated Booyah payouts.

Login to your account and book your slot today!`);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // 4. Payment Agent Numbers & Thresholds
  const [bkashNo, setBkashNo] = useState('01712-998877');
  const [nagadNo, setNagadNo] = useState('01812-998877');
  const [rocketNo, setRocketNo] = useState('01912-998877');
  const [minDeposit, setMinDeposit] = useState('20');
  const [minWithdraw, setMinWithdraw] = useState('50');

  // 5. Platform General Branding
  const [siteName, setSiteName] = useState('BlackRock Esports');
  const [helpline, setHelpline] = useState('+880 1712-998877');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'include', cache: 'no-store' });
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

        // YouTube Live Settings
        if (s.YOUTUBE_LIVE_URL) setYoutubeLiveUrl(s.YOUTUBE_LIVE_URL);
        if (s.YOUTUBE_LIVE_IS_ACTIVE !== undefined) {
          setYoutubeLiveIsActive(s.YOUTUBE_LIVE_IS_ACTIVE === 'true' || s.YOUTUBE_LIVE_IS_ACTIVE === true);
        }
        if (s.YOUTUBE_LIVE_TITLE) setYoutubeLiveTitle(s.YOUTUBE_LIVE_TITLE);
        if (s.YOUTUBE_LIVE_DESCRIPTION) setYoutubeLiveDesc(s.YOUTUBE_LIVE_DESCRIPTION);
        if (s.YOUTUBE_CHANNEL_URL) setYoutubeChannelUrl(s.YOUTUBE_CHANNEL_URL);

        // Welcome Email (Resend) Settings
        if (s.WELCOME_EMAIL_ENABLED !== undefined) setWelcomeEmailEnabled(s.WELCOME_EMAIL_ENABLED !== 'false');
        if (s.RESEND_API_KEY) setResendApiKey(s.RESEND_API_KEY);
        if (s.WELCOME_EMAIL_FROM) setWelcomeEmailFrom(s.WELCOME_EMAIL_FROM);
        if (s.WELCOME_EMAIL_SUBJECT) setWelcomeEmailSubject(s.WELCOME_EMAIL_SUBJECT);
        if (s.WELCOME_EMAIL_BODY) setWelcomeEmailBody(s.WELCOME_EMAIL_BODY);

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
      const payload: Record<string, any> = {
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

        // YouTube Live Settings
        YOUTUBE_LIVE_URL: youtubeLiveUrl.trim(),
        YOUTUBE_LIVE_IS_ACTIVE: String(youtubeLiveIsActive),
        YOUTUBE_LIVE_TITLE: youtubeLiveTitle.trim(),
        YOUTUBE_LIVE_DESCRIPTION: youtubeLiveDesc.trim(),
        YOUTUBE_CHANNEL_URL: youtubeChannelUrl.trim(),

        // Welcome Email (Resend) Settings
        WELCOME_EMAIL_ENABLED: String(welcomeEmailEnabled),
        RESEND_API_KEY: resendApiKey.trim(),
        WELCOME_EMAIL_FROM: welcomeEmailFrom.trim(),
        WELCOME_EMAIL_SUBJECT: welcomeEmailSubject.trim(),
        WELCOME_EMAIL_BODY: welcomeEmailBody.trim(),

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
        setTimeout(() => setSavedSuccess(false), 4000);
      } else {
        alert('Failed to save settings to database.');
      }
    } catch (err) {
      console.error('Save settings error:', err);
      alert('Network error while saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendLiveNotification = async () => {
    if (!youtubeLiveTitle.trim()) {
      alert('Please enter a stream/video title before broadcasting.');
      return;
    }
    setNotifyProcessing(true);
    setNotifySuccessMsg('');
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `🔴 LIVE: ${youtubeLiveTitle.trim()}`,
          content: `${youtubeLiveDesc.trim() || 'Watch our live tournament stream on YouTube right now!'} \n\nClick the Live button above to watch live!`,
          category: 'LIVE_STREAM',
          isPinned: true,
        }),
      });

      if (res.ok) {
        setNotifySuccessMsg('Live stream notification broadcasted to all users successfully!');
        setTimeout(() => setNotifySuccessMsg(''), 4000);
      } else {
        alert('Failed to broadcast announcement.');
      }
    } catch (err) {
      console.error('Notification error:', err);
    } finally {
      setNotifyProcessing(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailRecipient.trim()) {
      alert('Please enter a recipient email address for testing.');
      return;
    }
    setIsSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toEmail: testEmailRecipient.trim(),
          apiKey: resendApiKey.trim(),
          fromEmail: welcomeEmailFrom.trim(),
          subject: welcomeEmailSubject.trim(),
          bodyTemplate: welcomeEmailBody.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestEmailResult({ success: true, message: data.message || 'Test email sent successfully! Please check your inbox or spam folder.' });
      } else {
        setTestEmailResult({ success: false, message: data.message || 'Failed to send test email.' });
      }
    } catch (err: any) {
      setTestEmailResult({ success: false, message: err?.message || 'Network error while sending test email.' });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const getYoutubeVideoId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([^&?#]+)/);
    return match && match[1].length === 11 ? match[1] : null;
  };

  const previewYoutubeId = getYoutubeVideoId(youtubeLiveUrl);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 font-sans">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Platform Settings & Integrations
          </h1>
          <p className="text-[13px] text-[#64748B] font-normal mt-1">
            Customize welcome emails, Resend API, YouTube live broadcasts, homepage CMS, and payment agent numbers.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            href="/live"
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#2563EB] text-xs font-semibold shadow-xs transition-all"
          >
            <span>View Live Hub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={handleSaveAll}
            disabled={isSaving || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-[12px] bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving Changes...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-[16px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          <span>All platform settings & email templates saved successfully to Supabase database!</span>
        </div>
      )}

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('HOMEPAGE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'HOMEPAGE'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          <span>Homepage CMS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('WELCOME_EMAIL')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'WELCOME_EMAIL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-indigo-600 hover:text-indigo-700'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>📧 Welcome Email (Resend)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('YOUTUBE_LIVE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'YOUTUBE_LIVE'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-red-600 hover:text-red-700'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>🔴 YouTube Live Broadcast</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PAYMENTS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'PAYMENTS'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Mobile Banking Numbers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GENERAL')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'GENERAL'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Platform Branding</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-[#2563EB]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 text-xs font-medium">
          
          {/* TAB 1: HOMEPAGE CMS */}
          {activeTab === 'HOMEPAGE' && (
            <div className="space-y-6">
              
              {/* Hero Section Headlines */}
              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <h2 className="text-[17px] font-bold text-[#0F172A]">Main Hero Headlines & CTA Buttons</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">Top Pill Badge Text</label>
                    <input
                      type="text"
                      value={heroBadge}
                      onChange={(e) => setHeroBadge(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">Hero Main Title (Line 1)</label>
                    <input
                      type="text"
                      value={heroTitle1}
                      onChange={(e) => setHeroTitle1(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">Hero Gradient Title (Line 2)</label>
                    <input
                      type="text"
                      value={heroTitle2}
                      onChange={(e) => setHeroTitle2(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[#475569] font-semibold mb-1">Hero Subtitle Paragraph</label>
                    <textarea
                      rows={2}
                      value={heroDesc}
                      onChange={(e) => setHeroDesc(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">Primary CTA Button Text</label>
                    <input
                      type="text"
                      value={heroBtn1Text}
                      onChange={(e) => setHeroBtn1Text(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#475569] font-semibold mb-1">Primary Button Link</label>
                    <input
                      type="text"
                      value={heroBtn1Link}
                      onChange={(e) => setHeroBtn1Link(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              </div>

              {/* 3 Trust Proof Stats */}
              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h2 className="text-[17px] font-bold text-[#0F172A]">Hero Trust & Statistics Highlights</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="p-3.5 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <div className="font-bold text-[#0F172A]">Stat 1 (Prize Money)</div>
                    <input
                      type="text"
                      value={heroStat1Val}
                      onChange={(e) => setHeroStat1Val(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E2E8F0] font-bold text-xs"
                      placeholder="Value (e.g. ৳ 2.5 Lakh+)"
                    />
                    <input
                      type="text"
                      value={heroStat1Label}
                      onChange={(e) => setHeroStat1Label(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E2E8F0] text-xs text-[#64748B]"
                      placeholder="Label (e.g. Prize Pool Paid)"
                    />
                  </div>

                  <div className="p-3.5 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <div className="font-bold text-[#0F172A]">Stat 2 (Players)</div>
                    <input
                      type="text"
                      value={heroStat2Val}
                      onChange={(e) => setHeroStat2Val(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E2E8F0] font-bold text-xs"
                      placeholder="Value (e.g. 15,000+)"
                    />
                    <input
                      type="text"
                      value={heroStat2Label}
                      onChange={(e) => setHeroStat2Label(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E2E8F0] text-xs text-[#64748B]"
                      placeholder="Label (e.g. Active Players)"
                    />
                  </div>

                  <div className="p-3.5 rounded-[16px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <div className="font-bold text-[#0F172A]">Stat 3 (Security)</div>
                    <input
                      type="text"
                      value={heroStat3Val}
                      onChange={(e) => setHeroStat3Val(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E2E8F0] font-bold text-xs"
                      placeholder="Value (e.g. 100%)"
                    />
                    <input
                      type="text"
                      value={heroStat3Label}
                      onChange={(e) => setHeroStat3Label(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#E2E8F0] text-xs text-[#64748B]"
                      placeholder="Label (e.g. Anti-Cheat Safe)"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: WELCOME EMAIL (RESEND) CMS */}
          {activeTab === 'WELCOME_EMAIL' && (
            <div className="space-y-6">
              
              {/* Header & Status Card */}
              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-[17px] font-bold text-[#0F172A]">Automatic Welcome Email on Registration</h2>
                      <p className="text-xs text-[#64748B]">
                        Powered by <strong>Resend.com API</strong>. Automatically delivers player credentials and welcome message to user's inbox upon signup.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setWelcomeEmailEnabled(!welcomeEmailEnabled)}
                    className={`px-4 py-2 rounded-[14px] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                      welcomeEmailEnabled
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${welcomeEmailEnabled ? 'bg-white' : 'bg-slate-400'}`} />
                    <span>{welcomeEmailEnabled ? 'WELCOME EMAIL ENABLED' : 'EMAIL DISABLED'}</span>
                  </button>
                </div>

                {/* Resend API Key & From Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[#475569] font-bold mb-1 flex items-center justify-between">
                      <span>Resend API Key *</span>
                      <span className="text-[10px] text-indigo-600 font-normal">resend.com/api-keys</span>
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={resendApiKey}
                        onChange={(e) => setResendApiKey(e.target.value)}
                        placeholder="re_12345678_..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#475569] font-bold mb-1">
                      Sender Name & From Email Address
                    </label>
                    <input
                      type="text"
                      value={welcomeEmailFrom}
                      onChange={(e) => setWelcomeEmailFrom(e.target.value)}
                      placeholder="BlackRock Esports <onboarding@resend.dev>"
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Use <code>onboarding@resend.dev</code> for testing or verified domain (e.g. <code>support@brkesports.com</code>).
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[#475569] font-bold mb-1">
                      Welcome Email Subject Line *
                    </label>
                    <input
                      type="text"
                      value={welcomeEmailSubject}
                      onChange={(e) => setWelcomeEmailSubject(e.target.value)}
                      placeholder="🔥 Welcome to Black Rock Esports - Player ID: {PLAYER_ID}"
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Tags available: <code>{'{NAME}'}</code>, <code>{'{PLAYER_ID}'}</code>, <code>{'{EMAIL}'}</code>
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[#475569] font-bold mb-1">
                      Welcome Email Body & Instructions *
                    </label>
                    <textarea
                      rows={6}
                      value={welcomeEmailBody}
                      onChange={(e) => setWelcomeEmailBody(e.target.value)}
                      placeholder="Enter welcome message..."
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600 leading-relaxed font-sans"
                      required
                    />
                    <div className="flex flex-wrap gap-2 mt-1.5 text-[11px] text-slate-500">
                      <span>Available dynamic tags:</span>
                      <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">{'{NAME}'}</span>
                      <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded font-mono font-bold">{'{PLAYER_ID}'}</span>
                      <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">{'{EMAIL}'}</span>
                      <span className="bg-cyan-50 text-cyan-700 px-1.5 py-0.5 rounded font-mono font-bold">{'{UID}'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Email Template</span>
                  </button>
                </div>
              </div>

              {/* Test Email Dispatcher Box */}
              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
                  <Inbox className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-[#0F172A]">Send A Live Test Email (Inbox Preview)</h3>
                </div>

                <p className="text-xs text-slate-600">
                  Enter your email address below to send a live test message using your current Resend API key and template.
                </p>

                {testEmailResult && (
                  <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    testEmailResult.success
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {testEmailResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                    <span>{testEmailResult.message}</span>
                  </div>
                )}

                <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="email"
                    placeholder="Enter your email address (e.g. brkesportsorganisation@gmail.com)"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    className="w-full sm:flex-1 px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] focus:outline-none focus:border-indigo-600"
                    required
                  />

                  <button
                    type="submit"
                    disabled={isSendingTestEmail}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-[12px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSendingTestEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>{isSendingTestEmail ? 'Sending Test Email...' : 'Send Test Email Now'}</span>
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 3: YOUTUBE LIVE STREAM & BROADCAST CONTROL */}
          {activeTab === 'YOUTUBE_LIVE' && (
            <div className="space-y-6">
              
              {/* Broadcast Status Toggle */}
              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
                  <div className="flex items-center space-x-2">
                    <Radio className="w-5 h-5 text-red-600 animate-pulse" />
                    <div>
                      <h2 className="text-[17px] font-bold text-[#0F172A]">Live Stream Broadcasting Status</h2>
                      <p className="text-xs text-[#64748B]">
                        Toggle online status to show the glowing <strong>🔴 LIVE</strong> badge in the Navbar and push notifications.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setYoutubeLiveIsActive(!youtubeLiveIsActive)}
                    className={`px-4 py-2 rounded-[14px] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                      youtubeLiveIsActive
                        ? 'bg-red-600 text-white shadow-md shadow-red-500/20 animate-pulse'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${youtubeLiveIsActive ? 'bg-white' : 'bg-slate-400'}`} />
                    <span>{youtubeLiveIsActive ? 'LIVE STREAM ACTIVE' : 'STREAM OFFLINE'}</span>
                  </button>
                </div>

                {notifySuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{notifySuccessMsg}</span>
                  </div>
                )}

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="sm:col-span-2">
                    <label className="block text-[#475569] font-bold mb-1">
                      YouTube Video / Live Stream URL *
                    </label>
                    <div className="relative">
                      <Youtube className="w-4 h-4 text-red-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={youtubeLiveUrl}
                        onChange={(e) => setYoutubeLiveUrl(e.target.value)}
                        placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#0F172A] focus:outline-none focus:border-red-500"
                        required
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Paste full YouTube URL, short youtu.be link, or YouTube Live embed link.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[#475569] font-bold mb-1">
                      Live Stream / Match Title *
                    </label>
                    <input
                      type="text"
                      value={youtubeLiveTitle}
                      onChange={(e) => setYoutubeLiveTitle(e.target.value)}
                      placeholder="e.g. Free Fire Grand BR Squad Championship - Final Match"
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-bold text-xs text-[#0F172A] focus:outline-none focus:border-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[#475569] font-bold mb-1">
                      Official YouTube Channel Link
                    </label>
                    <input
                      type="text"
                      value={youtubeChannelUrl}
                      onChange={(e) => setYoutubeChannelUrl(e.target.value)}
                      placeholder="e.g. https://youtube.com/@BRKEsports"
                      className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#0F172A] focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[#475569] font-bold mb-1">
                      Match Description / Commentators Info
                    </label>
                    <textarea
                      rows={2}
                      value={youtubeLiveDesc}
                      onChange={(e) => setYoutubeLiveDesc(e.target.value)}
                      placeholder="Describe the match, commentator roster, room rules, or tournament schedule..."
                      className="w-full px-3.5 py-2 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Instant Push Notification Trigger Button */}
                <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                  <div className="flex items-center space-x-2.5">
                    <Bell className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Broadcast Live Stream Push Notification</div>
                      <div className="text-[11px] text-slate-600">Send an instant alert to all registered users that BRK Esports is live on YouTube.</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendLiveNotification}
                    disabled={notifyProcessing}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:brightness-110 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {notifyProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{notifyProcessing ? 'Sending...' : 'Broadcast to Users'}</span>
                  </button>
                </div>

              </div>

              {/* YouTube Video Live Preview */}
              {previewYoutubeId && (
                <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                    <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>Live Stream Player Preview</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">ID: {previewYoutubeId}</span>
                  </div>

                  <div className="aspect-video w-full max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-black">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube-nocookie.com/embed/${previewYoutubeId}`}
                      title="YouTube stream preview"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="border-0"
                    />
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: PAYMENTS */}
          {activeTab === 'PAYMENTS' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-3">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-[17px] font-bold text-[#0F172A]">Manual Deposit Payment Agent Numbers</h2>
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

          {/* TAB 5: GENERAL BRANDING & HELPLINE */}
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

        </div>
      )}

    </div>
  );
}
