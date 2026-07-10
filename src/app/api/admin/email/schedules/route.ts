import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextWeeklyDate } from "@/lib/email/send";

// GET /api/admin/email/schedules
export async function GET() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_schedules")
    .select("*, email_templates(name)")
    .order("next_send_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/email/schedules
export async function POST(req: NextRequest) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { template_id, segment_type, segment_params, cadence, next_send_at } = body;

  if (!template_id) return NextResponse.json({ error: "template_id required" }, { status: 400 });
  if (!cadence)     return NextResponse.json({ error: "cadence required" }, { status: 400 });
  if (!next_send_at) return NextResponse.json({ error: "next_send_at required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_schedules")
    .insert({
      template_id,
      segment_type:   segment_type ?? "all_active",
      segment_params: segment_params ?? {},
      cadence,
      next_send_at,
      is_enabled: true,
    })
    .select("*, email_templates(name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
