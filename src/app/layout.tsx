import type { Metadata } from "next";
import { Suspense } from "react";
import AuthButton from "@/components/AuthButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "RateMySportsTake",
  description: "Sports take accountability — track who gets it right.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-gray-900 antialiased overflow-x-hidden" style={{ backgroundColor: "#ebedf0" }}>
        <header className="border-b border-black/20 px-6 py-5" style={{ backgroundColor: "#2c2d2e" }}>
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <a href="/">
              <img src="/logo.png" alt="RateMySportsTake" className="h-14 w-auto" />
            </a>
            <div className="flex items-center gap-6">
              <nav className="flex gap-6 font-mono text-xs tracking-widest text-gray-300 uppercase">
                <a href="/experts" className="hover:text-white transition-colors">Leaderboard</a>
                <a href="/takes"   className="hover:text-white transition-colors">Takes</a>
                <a href="/submit"  className="hover:text-white transition-colors">Submit</a>
                <a href="/grade"   className="hover:text-white transition-colors">Grade</a>
              </nav>
              <Suspense fallback={<div className="w-16 h-7 rounded bg-gray-700 animate-pulse" />}>
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
