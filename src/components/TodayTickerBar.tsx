"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

function shouldShow(pathname: string) {
  if (pathname === "/" || pathname === "/experts") return true;
  // Analyst profile pages: /experts/[slug] — one segment only, no sub-pages
  return /^\/experts\/[^/]+$/.test(pathname);
}

export default function TodayTickerBar({ count }: { count: number }) {
  const pathname = usePathname();
  if (!shouldShow(pathname) || count === 0) return null;

  const label = count === 1 ? "take dropped" : "takes dropped";

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
        @media(max-width:600px){
          .ticker-badge{gap:8px;padding:0 14px;}
          .live-dot{width:10px;height:10px;}
          .ticker-badge .lb{font-size:13px;}
          .ticker-badge .lb small{font-size:8px;}
          .ticker-count{gap:7px;padding:0 14px;}
          .ticker-count b{font-size:27px;}
          .ticker-count span{font-size:10.5px;letter-spacing:.10em;}
          .ticker-cta{gap:6px;padding:0 14px;font-size:10.5px;}
          .ticker-cta .arw{font-size:13px;}
        }
      `}</style>
      <Link className="ticker" href="/experts?view=takes" aria-label={`${count} new ${label} today — see all`}>
        <div className="ticker-badge">
          <span className="live-dot" />
          <span className="lb">NEW<small>TODAY</small></span>
        </div>
        <div className="ticker-count"><b>{count}</b><span>{label}</span></div>
        <div className="ticker-fill" />
        <div className="ticker-cta">SEE ALL <span className="arw">→</span></div>
      </Link>
    </>
  );
}
