import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    // Password recovery — send to reset page so user can set a new password
    if (data?.user && next === "/" ) {
      const type = searchParams.get("type");
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
