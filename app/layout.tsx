import type { Metadata, Viewport } from "next";
import { Inter, Rajdhani } from "next/font/google";
import "./globals.css";
import MobileBottomNav from "@/components/ui/MobileBottomNav";
import ClientWidgets from "@/components/ui/ClientWidgets";
import { LanguageProvider } from "@/lib/language-context";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "ESPORTS ZONE BD | Free Fire Esports Platform",
  description: "Join daily Free Fire BR Squad, Duo & CS 4v4 tournaments. Win instant cash payouts via bKash & Nagad.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://esportszonebd.online"),
  openGraph: {
    title: "ESPORTS ZONE BD | Free Fire Esports Platform",
    description: "Join daily Free Fire BR Squad, Duo & CS 4v4 tournaments. Win instant cash payouts via bKash & Nagad.",
    url: "https://esportszonebd.online",
    siteName: "ESPORTS ZONE BD",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ESPORTS ZONE BD | Free Fire Esports Platform",
    description: "Join daily Free Fire BR Squad, Duo & CS 4v4 tournaments.",
  },
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

        {/* Preload critical LCP image — logo */}
        <link rel="preload" href="/logo.png" as="image" type="image/png" fetchPriority="high" />

        {/* DNS prefetch & preconnect for external image CDNs */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://api.dicebear.com" />

        {/* Supabase connection for realtime */}
        <link rel="dns-prefetch" href="https://supabase.co" />

        {/* PWA metas */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Service Worker registration — non-blocking */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function() {});
  });
}
`,
          }}
        />
      </head>
      <body
        className={`bg-background text-slate-100 min-h-screen flex flex-col font-body selection:bg-brand-red selection:text-white ${inter.className}`}
        suppressHydrationWarning
      >
        <LanguageProvider>
          {children}
          <MobileBottomNav />
          <ClientWidgets />
        </LanguageProvider>
      </body>
    </html>
  );
}
