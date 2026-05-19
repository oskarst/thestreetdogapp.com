import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const SUPABASE_HOST = "cdfintysiouqfuzcwwck.supabase.co";

// Content-Security-Policy. Permissive enough that Next's RSC + Tailwind
// (which inject inline <style> tags) and Leaflet (which fetches map tiles
// from cartocdn) keep working, while bounding script origins to 'self'.
//
// Note on 'unsafe-inline' / 'unsafe-eval' for scripts: Next.js 16's
// hydration inlines a small bootstrap script and uses `eval` for some
// optimizations. Tightening to nonce-based scripts is a follow-up task;
// the current value still bars third-party JS from loading.
const cspDirectives = [
  "default-src 'self'",
  `img-src 'self' data: blob: https://${SUPABASE_HOST} https://*.basemaps.cartocdn.com https://*.openstreetmap.org https://tiles.stadiamaps.com https://server.arcgisonline.com`,
  // 'self' covers same-origin fetches; explicit hostnames listed for
  // belt-and-suspenders against deploy-platform edge rewrites.
  `connect-src 'self' https://woof.thestreetdogapp.com https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`,
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "worker-src 'self'",
  "object-src 'none'",
];

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  // 1 year HSTS with subdomains.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful features the app doesn't use. Geolocation + camera
  // are needed by /add-dog so left as 'self'.
  {
    key: "Permissions-Policy",
    value: [
      "geolocation=(self)",
      "camera=(self)",
      "microphone=()",
      "payment=()",
      "usb=()",
      "fullscreen=(self)",
      "interest-cohort=()",
    ].join(", "),
  },
  // Defense-in-depth — frame-ancestors in CSP is the modern equivalent.
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: SUPABASE_HOST,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Prefer AVIF (≈30 % smaller than WebP on photos) with WebP as
    // fallback; legacy clients get the original via Accept negotiation.
    formats: ["image/avif", "image/webp"],
    // Tuned to the actual rendered sizes in the app. `imageSizes`
    // governs explicit `sizes="64px"` etc. on thumbnails;
    // `deviceSizes` governs `sizes` viewport widths.
    imageSizes: [64, 96, 128, 256, 384],
    deviceSizes: [320, 640, 828, 1080, 1200],
    // Vercel image-optimizer cache: keep transcoded variants warm for
    // 30 days. Upload paths are content-addressed (Date.now()), so
    // re-uploading produces a new URL — cache invalidation isn't a
    // concern.
    minimumCacheTTL: 2592000,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
