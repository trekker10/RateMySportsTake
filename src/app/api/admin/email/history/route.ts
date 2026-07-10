import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 25;

// GET /api/admin/email/history?page=0
export async function GET(req: NextRequest) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const page = Math.max(0, parseInt(req.nextUrl.searchParams.get("page") ?? "0", 10));
  const from = page * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  const supabase = createAdminClient();
  const { data, error, count } = await supabase
    .from("email_send_log")
    .select("*, email_templates(name)", { count: "exact" })
    .order("sent_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    rows:     data ?? [],
    total:    count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}
