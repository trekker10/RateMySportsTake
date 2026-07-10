import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { RMSTEmailTemplate } from "@/app/emails/RMSTEmailTemplate";

const FROM = "RMST Team <updates@email.ratemysportstake.com>";
const BATCH_SIZE = 100; // Resend batch limit

export type SegmentType =
  | "all_active"
  | "new_signups"
  | "inactive_30"
  | "analyst_followers"
  | "saved_backed";

export const SEGMENT_LABELS: Record<SegmentType, string> = {
  all_active:         "All active users",
  new_signups:        "New signups",
  inactive_30:        "Inactive 30+ days",
  analyst_followers:  "Followers of analyst",
  saved_backed:       "Users who saved/backed a take",
};

// ── Fetch recipient emails for a segment ─────────────────────────────────────

export async function getSegmentEmails(
  segmentType: SegmentType,
  segmentParams: Record<string, string> = {}
): Promise<string[]> {
  const supabase = createAdminClient();

  let data: { email: string }[] | null = null;

  switch (segmentType) {
    case "all_active":
      ({ data } = await supabase.rpc("get_segment_emails_all_active"));
      break;
    case "new_signups":
      ({ data } = await supabase.rpc("get_segment_emails_new_signups"));
      break;
    case "inactive_30":
      ({ data } = await supabase.rpc("get_segment_emails_inactive_30"));
      break;
    case "analyst_followers":
      ({ data } = await supabase.rpc("get_segment_emails_analyst_followers", {
        p_expert_id: segmentParams.expert_id,
      }));
      break;
    case "saved_backed":
      ({ data } = await supabase.rpc("get_segment_emails_saved_backed"));
      break;
  }

  return (data ?? []).map((r) => r.email).filter(Boolean);
}

// ── Core send function ────────────────────────────────────────────────────────

export interface SendEmailsResult {
  recipientCount: number;
  status: "sent" | "failed" | "partial";
  errorMessage?: string;
}

export async function sendEmailsToSegment({
  template,
  segmentType,
  segmentParams = {},
}: {
  template: {
    id: string;
    name: string;
    subject: string;
    preview_text: string;
    from_name: string;
    body_json: Record<string, string>;
  };
  segmentType: SegmentType;
  segmentParams?: Record<string, string>;
}): Promise<SendEmailsResult> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  let emails: string[];
  try {
    emails = await getSegmentEmails(segmentType, segmentParams);
  } catch (err: any) {
    return { recipientCount: 0, status: "failed", errorMessage: `Segment fetch failed: ${err?.message}` };
  }

  if (emails.length === 0) {
    return { recipientCount: 0, status: "sent" };
  }

  const bj = template.body_json ?? {};
  const subject = template.subject || template.name;

  // Chunk into batches of BATCH_SIZE
  let sent = 0;
  let failed = 0;
  const chunks: string[][] = [];
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    chunks.push(emails.slice(i, i + BATCH_SIZE));
  }

  for (const chunk of chunks) {
    try {
      const batch = chunk.map((to) => ({
        from: FROM,
        to,
        subject,
        react: RMSTEmailTemplate({
          previewText:  template.preview_text,
          heroImageUrl: bj.hero_image_url,
          heading:      bj.heading,
          body:         bj.body,
          ctaText:      bj.cta_text,
          ctaUrl:       bj.cta_url,
        }),
      }));
      await resend.batch.send(batch);
      sent += chunk.length;
    } catch (err: any) {
      console.error("[email send] batch error:", err);
      failed += chunk.length;
    }
  }

  const status: SendEmailsResult["status"] =
    failed === 0 ? "sent" : sent === 0 ? "failed" : "partial";

  return {
    recipientCount: sent,
    status,
    errorMessage: failed > 0 ? `${failed} recipients failed to send` : undefined,
  };
}

// ── Log a send to email_send_log ──────────────────────────────────────────────

export async function logEmailSend({
  templateId,
  scheduleId,
  segmentType,
  result,
}: {
  templateId: string;
  scheduleId?: string;
  segmentType: SegmentType;
  result: SendEmailsResult;
}) {
  const supabase = createAdminClient();
  await supabase.from("email_send_log").insert({
    template_id:     templateId,
    schedule_id:     scheduleId ?? null,
    segment_type:    segmentType,
    segment_label:   SEGMENT_LABELS[segmentType] ?? segmentType,
    recipient_count: result.recipientCount,
    status:          result.status,
    error_message:   result.errorMessage ?? null,
  });
}

// ── Next weekly date helper ───────────────────────────────────────────────────

const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

export function nextWeeklyDate(dayName: string): string {
  const target = DAY_NAMES.indexOf(dayName.toLowerCase());
  if (target === -1) throw new Error(`Unknown day: ${dayName}`);
  const now = new Date();
  const diff = ((target - now.getDay() + 7) % 7) || 7; // always at least 1 day ahead
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  return next.toISOString().split("T")[0];
}

export function cadenceLabel(cadence: string): string {
  if (cadence === "once") return "One-time send";
  const [, day] = cadence.split(":");
  if (!day) return cadence;
  return `Every ${day.charAt(0).toUpperCase() + day.slice(1)}`;
}
