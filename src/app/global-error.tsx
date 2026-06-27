"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: "monospace", padding: 40, background: "#f5f1e8" }}>
        <h2 style={{ color: "#e2241a", fontSize: 18, marginBottom: 12 }}>Something went wrong</h2>
        <pre style={{ background: "#15201a", color: "#f5f1e8", padding: 16, fontSize: 12, overflowX: "auto", marginBottom: 16 }}>
          {error.message}
          {error.digest ? `\n\nDigest: ${error.digest}` : ""}
        </pre>
        <button
          onClick={reset}
          style={{ fontFamily: "monospace", padding: "8px 16px", background: "#15201a", color: "#fff", border: "none", cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
