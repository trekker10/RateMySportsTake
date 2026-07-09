import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/email/segments/count?type=all_active
// GET /api/admin/email/segments/count?type=analyst_followers&expert_id=xxx
export async function GET(req: NextRequest) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type      = searchParams.get("type") ?? "all_active";
  const expertId  = searchParams.get("expert_id");

  const supabase = createAdminClient();
  let count: number | null = null;

  try {
    switch (type) {
      case "all_active": {
        const { data } = await supabase.rpc("count_segment_all_active");
        count = Number(data ?? 0);
        break;
      }
      case "new_signups": {
        const { data } = await supabase.rpc("count_segment_new_signups");
        count = Number(data ?? 0);
        break;
      }
      case "inactive_30": {
        const { data } = await supabase.rpc("count_segment_inactive_30");
        count = Number(data ?? 0);
        break;
      }
      case "analyst_followers": {
        if (!expertId) return NextResponse.json({ count: 0, note: "expert_id required" });
        const { data } = await supabase.rpc("count_segment_analyst_followers", { p_expert_id: expertId });
        count = Number(data ?? 0);
        break;
      }
      case "saved_backed": {
        const { data } = await supabase.rpc("count_segment_saved_backed");
        count = Number(data ?? 0);
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown segment type: ${type}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[segment count]", err);
    return NextResponse.json({ error: err?.message ?? "Query failed" }, { status: 500 });
  }

  return NextResponse.json({ count, type });
}
