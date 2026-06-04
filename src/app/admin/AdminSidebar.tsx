"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export default function AdminSidebar({ reviewCount }: { reviewCount: number }) {
  const pathname = usePathname();

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
        { label: "Browse Takes",  href: "/takes",        icon: <IconList /> },
        { label: "Review Takes",  href: "/admin/takes",  icon: <IconCheck />, badge: reviewCount > 0 ? reviewCount : undefined },
        { label: "Import Takes",  href: "/import",       icon: <IconDownload /> },
        { label: "Submit a Take", href: "/submit",       icon: <IconUpload /> },
      ],
    },
    {
      heading: "Grading",
      items: [
        { label: "Grade Dashboard",      href: "/grade",                      icon: <IconGrade /> },
        { label: "TakeScore Admin",      href: "/admin/takescore",            icon: <IconScore /> },
        { label: "Fantasy TakeScore",    href: "/admin/fantasy-take-score",   icon: <IconFootball /> },
      ],
    },
    {
      heading: "People",
      items: [
        { label: "Experts",          href: "/experts",        icon: <IconPerson /> },
        { label: "Manage Profiles",  href: "/admin/experts",  icon: <IconPeople /> },
      ],
    },
    {
      heading: "Settings",
      items: [
        { label: "Feature Flags", href: "/admin", icon: <IconFlag /> },
      ],
    },
  ];

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white min-h-screen flex flex-col">
      {/* Site logo */}
      <div className="px-4 py-5 border-b border-gray-200">
        <a href="/" className="font-black tracking-tight text-sm">
          <span className="text-gray-900">RATE</span>
          <span className="text-red-600">/</span>
          <span className="text-gray-900">MY</span>
          <span className="text-red-600">/</span>
          <span className="text-gray-900">SPORTS</span>
          <span className="text-red-600">/</span>
          <span className="text-gray-900">TAKE</span>
        </a>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
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
    </aside>
  );
}
