import type { Metadata, Viewport } from "next";
import "./globals.css";
import MobileBottomNav from "@/components/ui/MobileBottomNav";
import AIAssistantWidget from "@/components/ai/AIAssistantWidget";
import { LanguageProvider } from "@/lib/language-context";

export const metadata: Metadata = {
  title: "Black Rock Tournaments | Free Fire Esports Platform",
  description: "Join daily Free Fire BR Squad, Duo & CS 4v4 tournaments. Win instant cash payouts via bKash & Nagad.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#FF1E42",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-background text-slate-100 min-h-screen flex flex-col font-body selection:bg-brand-red selection:text-white">
        <LanguageProvider>
          {children}
          <MobileBottomNav />
          <AIAssistantWidget />
        </LanguageProvider>
      </body>
    </html>
  );
}

