import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "assets";

export async function POST(req: NextRequest) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { path } = await req.json().catch(() => ({}));
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
