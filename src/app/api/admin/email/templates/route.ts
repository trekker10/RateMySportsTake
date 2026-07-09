import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin, getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/email/templates — list all templates
export async function GET() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/email/templates — create a new template
export async function POST(req: NextRequest) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { name, status = "draft", category = "manual", subject = "", preview_text = "", from_name = "RMST Team", default_segment = "", body_json = {} } = body;

  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .insert({ name: name.trim(), status, category, subject, preview_text, from_name, default_segment, body_json })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
