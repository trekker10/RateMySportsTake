import type { NextConfig } from "next";

// Derive the Supabase origin from the public env var so the CSP stays correct
// across local dev and production without hardcoding the project ref.
const supabaseOrigin = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const supabaseWs    = supabaseOrigin.replace(/^https:/, "wss:");

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow framing by any origin
  { key: "X-Frame-Options", value: "DENY" },
  // Minimal referrer for cross-origin navigations
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-inline for its own hydration scripts.
      // To remove it you'd need per-request nonces — not worth it here.
      "script-src 'self' 'unsafe-inline'",
      // Inline styles are used heavily throughout the app (style={} props)
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      // Images: Supabase Storage (expert avatars), Twitter profile pics, data: from html2canvas
      `img-src 'self' data: https://pbs.twimg.com ${supabaseOrigin}`,
      // Network: Supabase REST + Storage, Supabase Realtime websocket, Web Push endpoints
      [
        "connect-src 'self'",
        supabaseOrigin,
        supabaseWs,
        "https://fcm.googleapis.com",                          // Chrome/Edge push
        "https://updates.push.services.mozilla.com",           // Firefox push
      ].join(" "),
      // Service worker (/public/sw.js) for Web Push
      "worker-src 'self'",
      // No iframes anywhere in the app
      "frame-src 'none'",
      // Prevent this page from being framed by anyone (belt + suspenders with X-Frame-Options)
      "frame-ancestors 'none'",
      // Prevent base tag injection
      "base-uri 'self'",
      // Server Actions post to the app itself
      `form-action 'self' https://ratemysportstake.com https://www.ratemysportstake.com`,
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "ratemysportstake.com", "www.ratemysportstake.com"],
    },
  },
  async headers() {
    return [
      {
        // Apply to every route
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
