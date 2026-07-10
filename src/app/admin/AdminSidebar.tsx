"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  badge?: number;
  icon: React.ReactNode;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

function IconGrid() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}
function IconList() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="3" cy="6" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="3" cy="12" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="3" cy="18" r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>
    </svg>
  );
}
function IconDownload() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M12 3v13m0 0l-4-4m4 4l4-4"/><path d="M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3"/>
    </svg>
  );
}
function IconUpload() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M12 16V3m0 0l-4 4m4-4l4 4"/><path d="M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3"/>
    </svg>
  );
}
function IconGrade() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M12 20V10"/><path d="M6 20V14"/><path d="M18 20V4"/>
    </svg>
  );
}
function IconScore() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6a6 6 0 0 1 6 6"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
    </svg>
  );
}
function IconPerson() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
}
function IconTv() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path d="M8 2l4 3 4-3"/>
    </svg>
  );
}
function IconPeople() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/>
      <circle cx="17" cy="8" r="3" /><path d="M22 20c0-3-2.5-5-5-5"/>
    </svg>
  );
}
function IconFlag() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M4 21V4"/><path d="M4 4h12l-3 5 3 5H4"/>
    </svg>
  );
}
function IconFootball() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <ellipse cx="12" cy="12" rx="9" ry="6" transform="rotate(-45 12 12)"/>
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
      <line x1="9.5" y1="11.5" x2="11.5" y2="9.5"/>
      <line x1="12.5" y1="14.5" x2="14.5" y2="12.5"/>
    </svg>
  );
}

function IconCrowd() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M17 20c0-2.5-2.2-4-5-4s-5 1.5-5 4"/>
      <circle cx="12" cy="10" r="3"/>
      <path d="M22 20c0-2-1.7-3.5-4-3.5"/>
      <circle cx="19" cy="8" r="2.5"/>
      <path d="M2 20c0-2 1.7-3.5 4-3.5"/>
      <circle cx="5" cy="8" r="2.5"/>
    </svg>
  );
}

function IconMail() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M2 7l10 7 10-7"/>
    </svg>
  );
}
function IconInbox() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path d="M22 12h-6l-2 3H10l-2-3H2"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  );
}

function IconEval() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <path d="M7 9h4M7 12h6M7 15h3"/>
      <path d="M16 12l1.5 1.5L20 10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function AdminSidebar({ reviewCount }: { reviewCount: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const groups: NavGroup[] = [
    {
      heading: "Overview",
      items: [
        { label: "Dashboard", href: "/admin", icon: <IconGrid /> },
      ],
    },
    {
      heading: "Content",
      items: [
        { label: "Review Takes",  href: "/admin/takes",  icon: <IconCheck />, badge: reviewCount > 0 ? reviewCount : undefined },
        { label: "Import Takes",   href: "/import",               icon: <IconDownload /> },
        { label: "Submit a Take", href: "/submit",               icon: <IconUpload /> },
        { label: "Show Accounts", href: "/admin/show-accounts",  icon: <IconTv /> },
      ],
    },
    {
      heading: "Grading",
      items: [
        { label: "Grade Dashboard",      href: "/grade",                      icon: <IconGrade /> },
        { label: "TakeScore Admin",      href: "/admin/takescore",            icon: <IconScore /> },
        { label: "Fantasy TakeScore",    href: "/admin/fantasy-take-score",   icon: <IconFootball /> },
        { label: "Eval Lab",             href: "/admin/eval-lab",             icon: <IconEval /> },
        { label: "Boldness Check",       href: "/admin/boldness-check",       icon: <IconScore /> },
        { label: "Crowd Forecast",       href: "/admin/crowd-forecast",       icon: <IconCrowd /> },
      ],
    },
    {
      heading: "People",
      items: [
        { label: "Users",           href: "/admin/users",   icon: <IconPeople /> },
        { label: "Manage Profiles", href: "/admin/experts", icon: <IconPeople /> },
        { label: "Manage Players",  href: "/admin/players", icon: <IconPerson /> },
        { label: "Manage Shows",    href: "/admin/shows",   icon: <IconTv /> },
      ],
    },
    {
      heading: "Settings",
      items: [
        { label: "Feature Flags", href: "/admin", icon: <IconFlag /> },
      ],
    },
    {
      heading: "Communications",
      items: [
        { label: "Email",    href: "/admin/email",    icon: <IconMail /> },
        { label: "Feedback", href: "/admin/feedback", icon: <IconInbox /> },
      ],
    },
  ];

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const navContent = (
    <nav className="flex-1 px-3 py-5 space-y-5 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.heading}>
          <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {group.heading}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-green-50 text-green-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className={active ? "text-green-600" : "text-gray-400"}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge != null && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger button — fixed top-left */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 rounded-lg bg-white border border-gray-200 shadow p-2 text-gray-600 hover:text-gray-900"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r-2 border-gray-200 flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-700">Admin Menu</span>
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1 text-gray-400 hover:text-gray-700"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {navContent}
      </aside>

      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex w-52 shrink-0 border-r-2 border-gray-200 bg-white flex-col">
        {navContent}
      </aside>
    </>
  );
}
