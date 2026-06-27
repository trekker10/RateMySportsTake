import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const type = searchParams.get("type");

  // On Vercel, request.url has an internal origin that differs from the public domain.
  // x-forwarded-host carries the real public hostname so the redirect lands correctly
  // and session cookies are accepted by the browser.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";

  function redirectTo(path: string) {
    if (isLocal) return NextResponse.redirect(`${origin}${path}`);
    if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${path}`);
    return NextResponse.redirect(`${origin}${path}`);
  }

  if (!code) {
    return redirectTo("/auth/login?error=missing_code");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return redirectTo("/auth/login?error=callback_failed");
  }

  // Password recovery — send to reset-password so user can set a new password
  if (data?.user && type === "recovery") {
    return redirectTo("/auth/reset-password");
  }

  return redirectTo(next);
}
