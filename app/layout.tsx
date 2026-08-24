import type { Metadata, Viewport } from "next";
import { Inter, Rajdhani } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import MobileBottomNav from "@/components/ui/MobileBottomNav";
import { LanguageProvider } from "@/lib/language-context";

// Code-split heavy interactive client widgets to prevent blocking initial render
const AIAssistantWidget = dynamic(() => import("@/components/ai/AIAssistantWidget"), { ssr: false });
const InstallPwaModal = dynamic(() => import("@/components/ui/InstallPwaModal"), { ssr: false });
const PushNotificationPrompt = dynamic(() => import("@/components/notifications/PushNotificationPrompt"), { ssr: false });

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ESPORTS ZONE BD | Free Fire Esports Platform",
  description: "Join daily Free Fire BR Squad, Duo & CS 4v4 tournaments. Win instant cash payouts via bKash & Nagad.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF1E42",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${rajdhani.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`bg-background text-slate-100 min-h-screen flex flex-col font-body selection:bg-brand-red selection:text-white ${inter.className}`} suppressHydrationWarning>
        <LanguageProvider>
          {children}
          <MobileBottomNav />
          <AIAssistantWidget />
          <InstallPwaModal />
          <PushNotificationPrompt />
        </LanguageProvider>
      </body>
    </html>
  );
}

