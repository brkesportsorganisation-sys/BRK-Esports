'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const AIAssistantWidget = dynamic(() => import('@/components/ai/AIAssistantWidget'), { ssr: false });
const InstallPwaModal = dynamic(() => import('@/components/ui/InstallPwaModal'), { ssr: false });
const PushNotificationPrompt = dynamic(() => import('@/components/notifications/PushNotificationPrompt'), { ssr: false });

export default function ClientWidgets() {
  return (
    <>
      <AIAssistantWidget />
      <InstallPwaModal />
      <PushNotificationPrompt />
    </>
  );
}
