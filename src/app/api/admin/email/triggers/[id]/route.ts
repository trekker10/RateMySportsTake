import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/email/triggers/:id
// Allows updating: template_id, is_enabled
export async function PATCH(req: NextRequest, { params }: Params) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const allowed = ["template_id", "is_enabled"];
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_triggers")
    .update(patch)
    .eq("id", id)
    .select("*, email_templates(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
