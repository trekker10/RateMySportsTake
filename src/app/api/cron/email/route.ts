import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmailsToSegment, logEmailSend, nextWeeklyDate, type SegmentType } from "@/lib/email/send";

// GET /api/cron/email
// Called daily by Vercel Cron (0 13 * * * UTC).
// Also callable manually by admin via POST for testing.
export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runEmailCron();
}

export async function POST(req: NextRequest) {
  // Manual trigger from admin UI — verify admin session instead
  const { checkIsAdmin } = await import("@/lib/auth");
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  return runEmailCron();
}

async function runEmailCron() {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // Fetch all enabled schedules due today or overdue
  const { data: schedules, error } = await supabase
    .from("email_schedules")
    .select("*, email_templates(*)")
    .eq("is_enabled", true)
    .lte("next_send_at", today);

  if (error) {
    console.error("[email cron] fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ ok: true, fired: 0, message: "No schedules due today" });
  }

  const results: Array<{ scheduleId: string; templateName: string; status: string; count: number }> = [];

  for (const schedule of schedules) {
    const template = schedule.email_templates as any;
    if (!template) continue;

    console.log(`[email cron] sending "${template.name}" to ${schedule.segment_type}`);

    const result = await sendEmailsToSegment({
      template,
      segmentType: schedule.segment_type as SegmentType,
      segmentParams: schedule.segment_params ?? {},
    });

    await logEmailSend({
      templateId:  template.id,
      scheduleId:  schedule.id,
      segmentType: schedule.segment_type as SegmentType,
      result,
    });

    // Advance or disable schedule
    if (schedule.cadence === "once") {
      await supabase
        .from("email_schedules")
        .update({ is_enabled: false, updated_at: new Date().toISOString() })
        .eq("id", schedule.id);
    } else if (schedule.cadence.startsWith("weekly:")) {
      const day = schedule.cadence.split(":")[1];
      const nextDate = nextWeeklyDate(day);
      await supabase
        .from("email_schedules")
        .update({ next_send_at: nextDate, updated_at: new Date().toISOString() })
        .eq("id", schedule.id);
    }

    results.push({
      scheduleId:   schedule.id,
      templateName: template.name,
      status:       result.status,
      count:        result.recipientCount,
    });
  }

  return NextResponse.json({ ok: true, fired: results.length, results });
}
