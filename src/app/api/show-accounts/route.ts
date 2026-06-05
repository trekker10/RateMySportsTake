import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/show-accounts
 * Public endpoint — returns all active show accounts as JSON.
 * No auth required so external pipeline scripts can call it freely.
 *
 * Optional query param: ?all=1  →  include inactive accounts too
 *
 * Example Python usage:
 *   import requests
 *   accounts = requests.get("https://ratemysportstake.com/api/show-accounts").json()
 *   handles = [a["handle"] for a in accounts]
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeAll = searchParams.get("all") === "1";

  const supabase = createAdminClient();
  let q = supabase
    .from("show_accounts")
    .select("id, handle, display_name, network, active, created_at")
    .order("display_name");

  if (!includeAll) q = q.eq("active", true);

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? [], {
    headers: {
      // Allow external scripts and services to call this endpoint
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
