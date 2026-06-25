import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          backgroundColor: "#f5f1e8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 24,
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo */}
        <img
          src="https://ratemysportstake.com/RMST_circular_logo.png"
          width={180}
          height={180}
          style={{ borderRadius: "50%" }}
        />
        {/* Wordmark */}
        <div style={{ display: "flex", fontSize: 72, fontWeight: 900, letterSpacing: "-0.03em", color: "#15201a" }}>
          RATE
          <span style={{ color: "#e2241a" }}>/</span>
          MY
          <span style={{ color: "#e2241a" }}>/</span>
          SPORTS
          <span style={{ color: "#e2241a" }}>/</span>
          TAKE
        </div>
        {/* Tagline */}
        <div style={{ display: "flex", fontSize: 24, letterSpacing: "0.2em", color: "#8a8a82" }}>
          THE TAKES, RATED.
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
