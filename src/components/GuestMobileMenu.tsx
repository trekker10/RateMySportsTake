"use client";

import { useState, useRef, useEffect } from "react";

const NAV_LINKS = [
  { label: "Analysts", href: "/experts",       color: "#e2241a" },
  { label: "Takes",    href: "/takes",              color: "#0a5b73" },
  { label: "Fantasy",  href: "/fantasy",       color: "#15803d" },
];

export default function GuestMobileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="font-mono text-xs tracking-widest uppercase px-4 py-1.5 min-h-[44px] flex items-center border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
      >
        MENU
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border-2 border-gray-900 shadow-lg min-w-[220px] z-50">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href + link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-3 font-mono text-[11px] tracking-widest uppercase font-black hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
              style={{ color: link.color }}
            >
              {link.label}
            </a>
          ))}
          <div className="border-t-2 border-gray-900">
            <a
              href="/auth/login"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 font-mono text-[11px] tracking-widest uppercase text-gray-900 font-bold hover:bg-gray-50 transition-colors"
            >
              Sign In →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
