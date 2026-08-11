import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/auth";

// NOTE: This extraction pipeline takes 2-4 minutes to complete.
// Vercel Hobby plan has a 60s function timeout — this route requires Vercel Pro
// (which allows up to 300s via maxDuration). On Hobby, long videos will timeout.
export const maxDuration = 300;

const RAILWAY_URL = "https://ratemysportstake-production.up.railway.app/extract";

export async function POST(req: NextRequest) {
  // Admin-only — reject non-admin requests before touching the Railway API
  if (!(await checkIsAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.EXTRACT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "EXTRACT_API_KEY env var is not set" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const url: string | undefined = body?.url;
  if (!url || !url.includes("instagram.com")) {
    return NextResponse.json(
      { error: "A valid instagram.com URL is required" },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(RAILWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ url }),
      // Node fetch signal for the full maxDuration window
      signal: AbortSignal.timeout(280_000), // 280s — slightly under Vercel's 300s cap
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: `Extraction service error (${upstream.status}): ${text}` },
        { status: 502 }
      );
    }

    const data = await upstream.json();

    // If the Railway service is running old code that doesn't return a numeric
    // rating, derive one from the qualitative stance so the Player Board always
    // gets populated without manual SQL intervention.
    const STANCE_TO_RATING: Record<string, number> = {
      breakout: 5,
      buy:      4,
      start:    4,
      hold:     3,
      other:    3,
      sit:      2,
      avoid:    2,
      sell:     1,
      bust:     1,
    };

    if (Array.isArray(data.takes)) {
      data.takes = data.takes.map((take: Record<string, unknown>) => ({
        ...take,
        rating: take.rating != null
          ? take.rating
          : (STANCE_TO_RATING[(take.stance as string)?.toLowerCase()] ?? 3),
      }));
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    return NextResponse.json(
      {
        error: isTimeout
          ? "The extraction timed out. The video may be too long, or the service is busy. Try again."
          : `Extraction failed: ${msg}`,
      },
      { status: 502 }
    );
  }
}
