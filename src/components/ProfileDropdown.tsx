"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "@/app/auth/actions";

export default function ProfileDropdown({
  email,
  isAdmin,
}: {
  email: string;
  isAdmin: boolean;
}) {
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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="font-mono text-xs tracking-widest uppercase px-4 py-1.5 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
      >
        PROFILE
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border-2 border-gray-900 shadow-lg min-w-[180px] z-50">
          <div className="px-4 py-2.5 border-b border-gray-200">
            <p className="font-mono text-[10px] tracking-wider text-gray-400 uppercase">Signed in as</p>
            <p className="text-sm text-gray-700 truncate mt-0.5">{email}</p>
          </div>

          {isAdmin && (
            <a
              href="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 font-mono text-[11px] tracking-widest uppercase text-gray-700 hover:bg-gray-50 border-b border-gray-100 transition-colors"
            >
              Admin Panel
            </a>
          )}

          <form action={signOut}>
            <button
              type="submit"
              className="w-full text-left px-4 py-2.5 font-mono text-[11px] tracking-widest uppercase text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
