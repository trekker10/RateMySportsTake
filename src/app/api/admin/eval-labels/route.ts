import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkIsAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mode = req.nextUrl.searchParams.get("mode") as "fantasy" | "standard" | null;
  const table = mode === "fantasy" ? "fantasy_classifier_eval" : "standard_classifier_eval";
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from(table)
    .select("id, tweet_text, your_label, why, created_at, tweet_date, resolution_verdict, classifier_resolution_date, correct_resolution_date, resolution_note")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, mode } = await req.json() as { id: string; mode: "fantasy" | "standard" };
  const table = mode === "fantasy" ? "fantasy_classifier_eval" : "standard_classifier_eval";
  const supabase = createAdminClient();

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
