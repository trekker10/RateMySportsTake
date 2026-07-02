import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import AuthButton from "@/components/AuthButton";
import { getFlag } from "@/app/actions/flags";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#f5f1e8",
};

export const metadata: Metadata = {
  title: "RateMySportsTake",
  description: "We rate the takes so you don't have to.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "RMST", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/icons/favicon-32.png",
  },
  openGraph: {
    title: "RateMySportsTake",
    description: "We rate the takes so you don't have to.",
    url: "https://ratemysportstake.com",
    siteName: "RateMySportsTake",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "RateMySportsTake — The Takes, Rated.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RateMySportsTake",
    description: "We rate the takes so you don't have to.",
    images: ["/og"],
  },
};

async function TodayTicker() {
  try {
    const supabase = await createClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("takes")
      .select("take_id", { count: "exact", head: true })
      .gte("date_submitted", todayStart.toISOString());
    const n = count ?? 0;
    if (n === 0) return null;
    const label = n === 1 ? "take dropped" : "takes dropped";
    return (
      <>
        <style>{`
          .ticker{display:flex;align-items:stretch;background:#15201a;color:#fff;
            border-top:3px solid #15201a;border-bottom:3px solid #15201a;
            overflow:hidden;transition:background .15s ease;text-decoration:none;}
          .ticker:hover{background:#0d1512;}
          .ticker-badge{display:flex;align-items:center;gap:12px;flex:none;background:#e2241a;
            padding:0 26px;border-right:3px solid #fff;}
          .live-dot{width:12px;height:12px;border-radius:50%;background:#fff;position:relative;}
          .live-dot::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid #fff;
            animation:ticker-pulse 1.6s ease-out infinite;opacity:0;}
          @keyframes ticker-pulse{0%{transform:scale(.6);opacity:.9;}100%{transform:scale(1.5);opacity:0;}}
          @media(prefers-reduced-motion:reduce){.live-dot::after{animation:none;}}
          .ticker-badge .lb{font-family:'Archivo Black',sans-serif;font-size:16px;letter-spacing:.02em;line-height:1;color:#fff;}
          .ticker-badge .lb small{display:block;font-family:'JetBrains Mono',monospace;font-weight:600;
            font-size:10px;letter-spacing:.14em;opacity:.9;margin-top:3px;}
          .ticker-count{display:flex;align-items:center;gap:10px;flex:none;padding:0 24px;}
          .ticker-count b{font-family:'Archivo Black',sans-serif;font-size:34px;letter-spacing:-.03em;}
          .ticker-count span{font-family:'JetBrains Mono',monospace;font-size:13.2px;letter-spacing:.14em;
            color:#fff;line-height:1.2;white-space:nowrap;}
          .ticker-fill{flex:1;align-self:stretch;background:#15201a;}
          .ticker-cta{flex:none;display:flex;align-items:center;gap:10px;padding:0 26px;background:#fff;color:#15201a;
            border-left:3px solid #fff;font-family:'JetBrains Mono',monospace;font-weight:800;font-size:13px;letter-spacing:.12em;}
          .ticker-cta .arw{font-family:'Archivo Black',sans-serif;font-size:16px;transition:transform .15s ease;}
          .ticker:hover .ticker-cta .arw{transform:translateX(4px);}
        `}</style>
        <Link className="ticker" href="/experts?view=takes" aria-label={`${n} new ${label} today — see all`}>
          <div className="ticker-badge">
            <span className="live-dot" />
            <span className="lb">NEW<small>TODAY</small></span>
          </div>
          <div className="ticker-count"><b>{n}</b><span>{label}</span></div>
          <div className="ticker-fill" />
          <div className="ticker-cta">SEE ALL <span className="arw">→</span></div>
        </Link>
      </>
    );
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const showSubmit = await getFlag("show_submit_nav");

  return (
    <html lang="en">
      <body className="min-h-screen text-gray-900 antialiased overflow-x-hidden" style={{ backgroundColor: "#ebedf0" }}>
        <header className="border-b-2 border-gray-900 px-6 py-3 max-sm:py-4" style={{ backgroundColor: "#f5f1e8" }}>
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            {/* Wordmark + tagline */}
            <a href="/" className="flex items-baseline gap-3">
              <span className="font-black text-xl tracking-tight text-gray-900" style={{ letterSpacing: "-0.04em" }}>
                RATE<span style={{ color: "#e2241a" }}>/</span>MY<span style={{ color: "#e2241a" }}>/</span>SPORTS<span style={{ color: "#e2241a" }}>/</span>TAKE
              </span>
            </a>
            <div className="flex items-center gap-6">
              <nav className="hidden sm:flex gap-6 font-mono text-xs tracking-widest uppercase">
                <a href="/experts" className="hover:opacity-80 transition-opacity font-black" style={{ color: "#e2241a" }}>Analysts</a>
                <a href="/experts?view=takes" className="hover:opacity-80 transition-opacity font-black" style={{ color: "#e2241a" }}>Takes</a>
                <a href="/fantasy" className="hover:opacity-80 transition-opacity font-black" style={{ color: "#15803d" }}>Fantasy</a>
                {showSubmit && (
                  <a href="/submit" className="text-gray-600 hover:text-gray-900 transition-colors">Submit</a>
                )}
              </nav>
              <Suspense fallback={<div className="w-16 h-7 rounded bg-gray-300 animate-pulse" />}>
                <AuthButton />
              </Suspense>
            </div>
          </div>
        </header>
        <Suspense fallback={null}>
          <TodayTicker />
        </Suspense>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
