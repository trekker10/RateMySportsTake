"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface ShareReceiptButtonProps {
  takeId: string;
  /** Override the default /api/receipt/[takeId] URL */
  imageUrl?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function ShareReceiptButton({ takeId, imageUrl: imageUrlProp, className, children }: ShareReceiptButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imageUrl = imageUrlProp ?? `/api/receipt/${takeId}`;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleOpen = () => { setImgLoaded(false); setOpen(true); };
  const handleClose = () => { setOpen(false); setCopied(false); setImgLoaded(false); };

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `receipt-${takeId}.png`;
    a.click();
  }, [imageUrl, takeId]);

  const handleCopy = useCallback(async () => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: just open in new tab so they can save manually
      window.open(imageUrl, "_blank");
    }
  }, [imageUrl]);

  return (
    <>
      <button onClick={handleOpen} className={className}>
        {children ?? "Share Receipt"}
      </button>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
          onClick={handleClose}
        >
          <div
            className="relative w-full max-w-lg bg-white border-2 border-gray-900 flex flex-col"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b-2 border-gray-900 flex-shrink-0">
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-gray-500">Your Receipt</p>
              <button
                onClick={handleClose}
                className="font-mono text-[11px] tracking-widest uppercase text-gray-500 hover:text-gray-900 transition-colors"
              >
                × Close
              </button>
            </div>

            {/* Receipt image */}
            <div className="p-4 bg-gray-50 relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
              {/* Loading spinner */}
              {!imgLoaded && (
                <div className="flex items-center justify-center py-14 gap-4">
                  <style>{`
                    @keyframes spin-ball { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    .spin-ball { animation: spin-ball 0.9s linear infinite; image-rendering: pixelated; }
                  `}</style>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/basketball-pixel.png" alt="" className="spin-ball" width={64} height={64} />
                  <p className="font-mono text-[13px] tracking-[0.25em] uppercase text-gray-500">Loading…</p>
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Take receipt"
                className="w-full block"
                style={{ imageRendering: "crisp-edges", display: imgLoaded ? "block" : "none", maxHeight: "55vh", objectFit: "contain" }}
                onLoad={() => setImgLoaded(true)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={handleCopy}
                className="flex-1 px-4 py-2.5 font-mono text-[11px] tracking-wider uppercase text-white transition-colors"
                style={{ backgroundColor: copied ? "#0a7a3b" : "#1a1a1a" }}
              >
                {copied ? "✓ Copied!" : "Copy Image"}
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 px-4 py-2.5 border-2 border-gray-900 font-mono text-[11px] tracking-wider uppercase text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Download PNG
              </button>
            </div>

            <p className="px-5 pb-4 font-mono text-[9px] tracking-wider text-gray-400 uppercase text-center flex-shrink-0">
              Copy image · paste directly to X / Instagram / iMessage
            </p>
          </div>
        </div>
      , document.body)}
    </>
  );
}
