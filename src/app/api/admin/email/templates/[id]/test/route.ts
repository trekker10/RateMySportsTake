import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin, getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { RMSTEmailTemplate } from "@/app/emails/RMSTEmailTemplate";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/email/templates/:id/test — send a test email to the logged-in admin
export async function POST(req: NextRequest, { params }: Params) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const user = await getCurrentUser();
  if (!user?.email) return NextResponse.json({ error: "No email on file for admin" }, { status: 400 });

  const { id } = await params;

  const supabase = createAdminClient();
  const { data: template, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const bj = (template.body_json ?? {}) as Record<string, string>;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: sendError } = await resend.emails.send({
    from: `${template.from_name || "RMST Team"} <updates@email.ratemysportstake.com>`,
    to: user.email,
    subject: `[TEST] ${template.subject || template.name}`,
    react: RMSTEmailTemplate({
      previewText: template.preview_text,
      heroImageUrl: bj.hero_image_url,
      heading: bj.heading,
      body: bj.body,
      ctaText: bj.cta_text,
      ctaUrl: bj.cta_url,
    }),
  });

  if (sendError) {
    console.error("[email test] Resend error:", sendError);
    return NextResponse.json({ error: (sendError as any).message ?? "Send failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sentTo: user.email });
}
