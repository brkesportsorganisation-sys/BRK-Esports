'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const AIAssistantWidget = dynamic(() => import('@/components/ai/AIAssistantWidget'), { ssr: false });
const InstallPwaModal = dynamic(() => import('@/components/ui/InstallPwaModal'), { ssr: false });
const PushNotificationPrompt = dynamic(() => import('@/components/notifications/PushNotificationPrompt'), { ssr: false });

export default function ClientWidgets() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        const handle = (window as any).requestIdleCallback(() => setMounted(true), { timeout: 2000 });
        return () => (window as any).cancelIdleCallback(handle);
      } else {
        const timer = setTimeout(() => setMounted(true), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (!mounted) return null;
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/vendor') || pathname?.startsWith('/vandor')) {
    return null;
  }

  return (
    <>
      <AIAssistantWidget />
      <InstallPwaModal />
      <PushNotificationPrompt />
    </>
  );
}

