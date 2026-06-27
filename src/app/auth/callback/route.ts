import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const type = searchParams.get("type");

  // On Vercel, request.url has an internal origin — use x-forwarded-host for the real public domain.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  function buildUrl(path: string) {
    if (isLocal) return `${origin}${path}`;
    if (forwardedHost) return `https://${forwardedHost}${path}`;
    return `${origin}${path}`;
  }

  if (!code) {
    return NextResponse.redirect(buildUrl("/auth/login?error=missing_code"));
  }

  // Determine destination before we have the session
  let destination = next;

  // Create the redirect response first, then attach session cookies directly to it.
  // This is the correct SSR pattern: cookies().set() in a Route Handler may not carry
  // through to a separately-created NextResponse.redirect(), causing a session-less redirect.
  const redirectResponse = NextResponse.redirect(buildUrl(destination));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          // Write directly onto the redirect response so the browser receives
          // the session cookies in the same round-trip as the redirect.
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options as any);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(buildUrl("/auth/login?error=callback_failed"));
  }

  // Password recovery — override destination
  if (data?.user && type === "recovery") {
    return NextResponse.redirect(buildUrl("/auth/reset-password"));
  }

  return redirectResponse;
}
