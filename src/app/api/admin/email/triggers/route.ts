import { NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/email/triggers
export async function GET() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_triggers")
    .select("*, email_templates(id, name)")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
