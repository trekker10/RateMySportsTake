"use client";

import { useState, useCallback } from "react";

interface ShareReceiptButtonProps {
  takeId: string;
  className?: string;
  children?: React.ReactNode;
}

export default function ShareReceiptButton({ takeId, className, children }: ShareReceiptButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const imageUrl = `/api/receipt/${takeId}`;

  const handleOpen = () => setOpen(true);
  const handleClose = () => { setOpen(false); setCopied(false); };

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

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
          onClick={handleClose}
        >
          <div
            className="relative w-full max-w-lg bg-white border-2 border-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b-2 border-gray-900">
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-gray-500">Your Receipt</p>
              <button
                onClick={handleClose}
                className="font-mono text-[11px] tracking-widest uppercase text-gray-500 hover:text-gray-900 transition-colors"
              >
                × Close
              </button>
            </div>

            {/* Receipt image */}
            <div className="p-4 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Take receipt"
                className="w-full block"
                style={{ imageRendering: "crisp-edges" }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-200">
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

            <p className="px-5 pb-4 font-mono text-[9px] tracking-wider text-gray-400 uppercase text-center">
              Copy image · paste directly to X / Instagram / iMessage
            </p>
          </div>
        </div>
      )}
    </>
  );
}
