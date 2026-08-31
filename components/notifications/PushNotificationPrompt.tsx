'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Sparkles, ShieldCheck, Gamepad2, X, Check, ArrowRight } from 'lucide-react';
import { db } from '@/lib/db';

export default function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check browser support
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Register Service Worker
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });

      // Show prompt if permission is default and user hasn't dismissed recently
      if (Notification.permission === 'default') {
        const lastDismissed = localStorage.getItem('ezbd_notif_prompt_dismissed');
        const now = Date.now();
        if (!lastDismissed || now - parseInt(lastDismissed, 10) > 24 * 60 * 60 * 1000) {
          // Delay popup by 1.8s for smooth user entry
          const timer = setTimeout(() => {
            setShowPrompt(true);
          }, 1800);
          return () => clearTimeout(timer);
        }
      }
    }
  }, []);

  const handleAllowNotifications = async () => {
    if (!isSupported) return;
    setIsProcessing(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        setShowPrompt(false);
        const currentUser = db.getCurrentUser();

        // 1. Trigger Service Worker registration & Welcome Push
        const registration = await navigator.serviceWorker.ready;

        // Try Push Manager subscription
        try {
          if ('pushManager' in registration) {
            let sub = await registration.pushManager.getSubscription();
            if (!sub) {
              // Standard dummy applicationServerKey if not using full VAPID or subscribe with options
              try {
                sub = await registration.pushManager.subscribe({
                  userVisibleOnly: true,
                });
              } catch {}
            }

            if (sub) {
              fetch('/api/notifications/push-subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subscription: sub,
                  userId: currentUser?.id || null,
                }),
              }).catch(() => {});
            }
          }
        } catch {}

        // 2. Dispatch rich Native Android/Desktop OS notification via Service Worker
        if (registration.active) {
          registration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
              title: '🔥 ESPORTS ZONE BD নোটিফিকেশন চালু হয়েছে!',
              message: '🎉 স্বাগতম! এখন থেকে সকল টুর্নামেন্টের কাস্টম রুম পাসওয়ার্ড ও প্রাইজমানি আপডেট সরাসরি আপনার ফোনে পাবেন।',
              icon: '/favicon.ico',
              imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
              link: '/tournaments',
            },
          });
        } else {
          // Fallback native notification
          new Notification('🔥 ESPORTS ZONE BD নোটিফিকেশন চালু হয়েছে!', {
            body: '🎉 স্বাগতম! এখন থেকে সকল টুর্নামেন্টের কাস্টম রুম পাসওয়ার্ড ও প্রাইজমানি আপডেট সরাসরি আপনার ফোনে পাবেন।',
            icon: '/favicon.ico',
          });
        }
      } else {
        setShowPrompt(false);
      }
    } catch (err) {
      console.error('Notification permission request error:', err);
      setShowPrompt(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ezbd_notif_prompt_dismissed', Date.now().toString());
  };

  if (!showPrompt || !isSupported || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white border-2 border-red-200/90 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl shadow-slate-900/15 space-y-4 text-slate-900 relative animate-in slide-in-from-bottom-5 duration-300">
        
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Badge & Title */}
        <div className="flex items-center gap-3 pr-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-red to-brand-orange flex items-center justify-center text-white shadow-lg shadow-orange-500/30 flex-shrink-0 animate-bounce">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] font-black text-brand-orange bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full uppercase tracking-wider mb-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Instant Phone Alerts</span>
            </div>
            <h3 className="font-heading font-black text-lg sm:text-xl text-slate-900 leading-tight">
              নোটিফিকেশন চালু করুন! 🔔
            </h3>
          </div>
        </div>

        {/* Description & Feature list */}
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          কাস্টম রুম পাসওয়ার্ড, প্রাইজমানি ক্যাশআউট এবং ডেইলি রিওয়ার্ডের নোটিফিকেশন সরাসরি আপনার মোবাইলের নোটিফিকেশন ড্রয়ারে পেতে এলাউ (Allow) করুন।
        </p>

        {/* Features Checklist */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 space-y-2 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700">
            <span className="w-5 h-5 rounded-lg bg-orange-100 text-brand-orange flex items-center justify-center text-[10px] font-bold">🔑</span>
            <span className="font-medium">ম্যাচ শুরুর ১০ মিনিট আগে <strong className="text-slate-900">Room ID & Password</strong> এলার্ট</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">💰</span>
            <span className="font-medium">বিকাশ ও নগদে <strong className="text-slate-900">উইনিং ব্যালেন্স ক্যাশআউট</strong> কনফার্মেশন</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <span className="w-5 h-5 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center text-[10px] font-bold">🎁</span>
            <span className="font-medium">ফ্রি ডায়মন্ড গিভঅ্যাওয়ে ও স্পিন রিওয়ার্ড আপডেট</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            পরে (Later)
          </button>
          
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleAllowNotifications}
            className="flex-2 py-3 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Bell className="w-4 h-4" />
            <span>{isProcessing ? 'অনুমতি নেওয়া হচ্ছে...' : 'নোটিফিকেশন অন করুন'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
