import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/image-proxy?url=<encoded-url>
 *
 * Fetches an image server-side and streams it back to the browser.
 * This bypasses hotlink protection on sites like Instagram that block
 * direct <img src> requests from foreign origins.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  // Only proxy image hosts we trust — expand as needed
  const ALLOWED_HOSTS = [
    "pbs.twimg.com",
    "abs.twimg.com",
    "cdninstagram.com",
    "scontent.cdninstagram.com",
    "instagram.com",
    "www.instagram.com",
    "lookaside.instagram.com",
    "lookaside.fbsbx.com",
    "graph.instagram.com",
    "i.imgur.com",
    "imgur.com",
    "upload.wikimedia.org",
  ];

  const host = parsed.hostname;
  const allowed = ALLOWED_HOSTS.some(h => host === h || host.endsWith("." + h));
  if (!allowed) {
    return new NextResponse(`Host not allowed: ${host}`, { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        // Mimic a real browser request
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://www.instagram.com/",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      return new NextResponse(`Upstream error: ${upstream.status}`, {
        status: 502,
      });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Proxy error: ${msg}`, { status: 502 });
  }
}
