import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import AuthButton from "@/components/AuthButton";
import { getFlag } from "@/app/actions/flags";
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
              <span className="text-sm italic text-gray-500 hidden sm:block">We rate the takes so you don&apos;t have to.</span>
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
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
