/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Remove console.log in production for smaller bundles
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'clsx',
      'tailwind-merge',
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // HSTS: Tell browsers to always use HTTPS (eliminates http→https redirect penalty)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://*.cloudflareinsights.com https://challenges.cloudflare.com https://*.cloudflare.com https://apis.google.com https://*.firebaseapp.com https://accounts.google.com https://www.gstatic.com https://identitytoolkit.googleapis.com; script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://*.cloudflareinsights.com https://challenges.cloudflare.com https://*.cloudflare.com https://apis.google.com https://*.firebaseapp.com https://accounts.google.com https://www.gstatic.com https://identitytoolkit.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss: https://cloudflareinsights.com https://*.cloudflareinsights.com; object-src 'none'; base-uri 'self'; frame-src 'self' https://challenges.cloudflare.com https://accounts.google.com https://*.firebaseapp.com https://www.youtube.com https://www.youtube-nocookie.com;",
          },
        ],
      },
      // Long-lived cache for Next.js static assets (hashed filenames)
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Next.js Image optimization cache
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400, immutable',
          },
        ],
      },
      // PWA Manifest — must revalidate so updates to icons or app name are detected immediately
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/manifest+json; charset=utf-8',
          },
        ],
      },
      // PWA & brand icons — 1 hour cache with stale-while-revalidate (prevents permanent stale caching)
      {
        source: '/icons/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/logo.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/(apple-touch-icon.*|icon-.*|favicon.ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      // Static public assets (fonts and general media)
      {
        source: '/:all*(png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      // Service worker — no cache so it always updates
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },

  images: {
    // unoptimized: true prevents Vercel Serverless Function (_next/image) invocations,
    // which directly saves Fluid compute CPU time and eliminates Fast Origin Transfer bandwidth.
    // Images are served directly by Supabase Storage / Edge CDN instead of Vercel Compute.
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 days
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

};

export default nextConfig;
