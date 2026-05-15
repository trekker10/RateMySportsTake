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
      <body className="min-h-screen bg-zinc-950 text-zinc-50 antialiased">
        <header className="border-b border-zinc-800 px-6 py-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight">
              🎯 RateMySportsTake
            </a>
            <div className="flex items-center gap-6">
              <nav className="flex gap-6 text-sm text-zinc-400">
                <a href="/takes"   className="hover:text-zinc-50 transition-colors">Takes</a>
                <a href="/experts" className="hover:text-zinc-50 transition-colors">Experts</a>
                <a href="/submit"  className="hover:text-zinc-50 transition-colors">Submit</a>
                <a href="/import"  className="hover:text-zinc-50 transition-colors">Import</a>
                <a href="/grade"   className="hover:text-zinc-50 transition-colors">Grade</a>
              </nav>
              <Suspense fallback={<div className="w-16 h-7 rounded bg-zinc-800 animate-pulse" />}>
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
