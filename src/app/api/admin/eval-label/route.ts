import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkIsAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tweet_text, your_label, why, classifier_result, mode } =
    await req.json() as {
      tweet_text: string;
      your_label: "yes" | "no" | "gray";
      why?: string;
      classifier_result?: Record<string, unknown>;
      mode: "fantasy" | "standard";
    };

  if (!tweet_text?.trim()) return NextResponse.json({ error: "tweet_text required" }, { status: 400 });
  if (!["yes", "no", "gray"].includes(your_label)) return NextResponse.json({ error: "invalid label" }, { status: 400 });

  const table = mode === "fantasy" ? "fantasy_classifier_eval" : "standard_classifier_eval";
  const supabase = createAdminClient();

  const { error } = await supabase.from(table).insert({
    tweet_text: tweet_text.trim(),
    your_label,
    why: why?.trim() || null,
    classifier_result: classifier_result ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
