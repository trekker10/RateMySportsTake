import type { Metadata } from "next";
import { Suspense } from "react";
import AuthButton from "@/components/AuthButton";
import { getFlag } from "@/app/actions/flags";
import "./globals.css";

export const metadata: Metadata = {
  title: "RateMySportsTake",
  description: "Sports take accountability — track who gets it right.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const showSubmit = await getFlag("show_submit_nav");

  return (
    <html lang="en">
      <body className="min-h-screen text-gray-900 antialiased overflow-x-hidden" style={{ backgroundColor: "#ebedf0" }}>
        <header className="border-b-2 border-gray-900 px-6 py-3" style={{ backgroundColor: "#f5f1e8" }}>
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            {/* Wordmark + tagline */}
            <a href="/" className="flex items-baseline gap-3">
              <span className="font-black text-xl tracking-tight text-gray-900" style={{ letterSpacing: "-0.04em" }}>
                RATE<span style={{ color: "#e2241a" }}>/</span>MY<span style={{ color: "#e2241a" }}>/</span>SPORTS<span style={{ color: "#e2241a" }}>/</span>TAKE
              </span>
              <span className="text-sm italic text-gray-500 hidden sm:block">We rate the takes so you don&apos;t have to.</span>
            </a>
            <div className="flex items-center gap-6">
              <nav className="hidden sm:flex gap-6 font-mono text-xs tracking-widest text-gray-600 uppercase">
                <a href="/experts" className="hover:text-gray-900 transition-colors">Leaderboard</a>
                <a href="/experts" className="hover:text-gray-900 transition-colors">Analysts</a>
                <a href="/takes"   className="hover:text-gray-900 transition-colors">Takes</a>
                {showSubmit && (
                  <a href="/submit" className="hover:text-gray-900 transition-colors">Submit</a>
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
