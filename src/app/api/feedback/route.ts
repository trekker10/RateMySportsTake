import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { category, message, email, screenshot_name } = body;

  if (!category || !message?.trim()) {
    return NextResponse.json({ error: "category and message are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("feedback_submissions").insert({
    category,
    message:         message.trim(),
    email:           email?.trim() || null,
    screenshot_name: screenshot_name || null,
  });

  if (error) {
    console.error("[feedback] insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
