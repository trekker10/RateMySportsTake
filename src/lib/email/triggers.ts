import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { RMSTEmailTemplate } from "@/app/emails/RMSTEmailTemplate";
import { logEmailSend } from "@/lib/email/send";

const FROM = "RMST Team <updates@email.ratemysportstake.com>";
const BATCH_SIZE = 100;

export type TriggerEventType = "new_take_drop" | "take_graded";

export interface TriggerContext {
  takeId?: string;
  expertId?: string;
}

// ── Main entry point ──────────────────────────────────────────────────────────
// Call this at the two hook points (submitTake and gradeSingleTake).
// It looks up the enabled trigger, fetches recipients, and sends via Resend.

export async function sendTriggeredEmail(
  eventType: TriggerEventType,
  context: TriggerContext
): Promise<void> {
  const supabase = createAdminClient();

  // 1. Look up the trigger row — must be enabled and have a template
  const { data: trigger } = await supabase
    .from("email_triggers")
    .select("*, email_templates(*)")
    .eq("event_type", eventType)
    .eq("is_enabled", true)
    .single();

  if (!trigger || !trigger.email_templates) {
    // Not configured or disabled — silently skip
    return;
  }

  const template = trigger.email_templates as {
    id: string;
    name: string;
    subject: string;
    preview_text: string;
    from_name: string;
    body_json: Record<string, string>;
  };

  // 2. Fetch recipient emails based on event type + context
  let emails: string[] = [];
  try {
    emails = await getTriggerEmails(eventType, context);
  } catch (err) {
    console.error(`[email trigger] recipient fetch failed for ${eventType}:`, err);
    return;
  }

  if (emails.length === 0) return;

  // 3. Send in batches
  const resend = new Resend(process.env.RESEND_API_KEY);
  const bj = template.body_json ?? {};
  const subject = template.subject || template.name;

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const chunk = emails.slice(i, i + BATCH_SIZE);
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
    } catch (err) {
      console.error(`[email trigger] batch error for ${eventType}:`, err);
      failed += chunk.length;
    }
  }

  // 4. Log the send
  const status = failed === 0 ? "sent" : sent === 0 ? "failed" : "partial";
  await logEmailSend({
    templateId:  template.id,
    segmentType: eventType === "new_take_drop" ? "analyst_followers" : "saved_backed",
    result: {
      recipientCount: sent,
      status,
      errorMessage: failed > 0 ? `${failed} recipients failed` : undefined,
    },
  });
}

// ── Recipient resolution by event type ───────────────────────────────────────

async function getTriggerEmails(
  eventType: TriggerEventType,
  context: TriggerContext
): Promise<string[]> {
  const supabase = createAdminClient();

  if (eventType === "new_take_drop") {
    // Reuse existing segment RPC: followers of the analyst who posted the take
    if (!context.expertId) return [];
    const { data } = await supabase.rpc("get_segment_emails_analyst_followers", {
      p_expert_id: context.expertId,
    });
    return (data ?? []).map((r: { email: string }) => r.email).filter(Boolean);
  }

  if (eventType === "take_graded") {
    // Custom trigger RPC: users who saved/backed this specific take
    if (!context.takeId) return [];
    const { data } = await supabase.rpc("get_trigger_emails_take_graded", {
      p_take_id: context.takeId,
    });
    return (data ?? []).map((r: { email: string }) => r.email).filter(Boolean);
  }

  return [];
}
