import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const GITHUB_DISPATCH_TOKEN = process.env.GITHUB_DISPATCH_TOKEN ?? "";
const GITHUB_REPO = "trekker10/sports-take-pipeline";
const DISPATCH_WORKFLOW = "post_approved.yml";

function isValidSecret(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  return secret === process.env.TELEGRAM_WEBHOOK_SECRET;
}

async function telegramCall(method: string, body: Record<string, unknown>) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Use editMessageCaption for photo messages, editMessageText for text messages
async function editMessage(
  messageId: number,
  text: string,
  isPhoto: boolean,
  replyMarkup?: Record<string, unknown>,
) {
  const method = isPhoto ? "editMessageCaption" : "editMessageText";
  const textField = isPhoto ? "caption" : "text";
  await telegramCall(method, {
    chat_id: CHAT_ID,
    message_id: messageId,
    [textField]: text,
    parse_mode: "Markdown",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function triggerGitHubDispatch() {
  if (!GITHUB_DISPATCH_TOKEN) {
    console.warn("[webhook] GITHUB_DISPATCH_TOKEN not set, skipping dispatch");
    return;
  }
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${DISPATCH_WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_DISPATCH_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(`[webhook] GitHub dispatch failed: ${res.status} ${text}`);
    } else {
      console.log("[webhook] GitHub dispatch triggered successfully");
    }
  } catch (e) {
    console.error("[webhook] GitHub dispatch error:", e);
  }
}

export async function POST(req: NextRequest) {
  if (!isValidSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  if (!update) return NextResponse.json({ ok: true });

  const supabase = createAdminClient();

  // ── Handle inline button taps (Approve / Edit / Skip) ──────────────────
  if (update.callback_query) {
    const cq = update.callback_query;
    const data: string = cq.data ?? "";
    const [action, postId] = data.split(":");
    const isPhoto = !!cq.message?.photo;
    const msgId: number = cq.message?.message_id;
    const bodyText: string = cq.message?.caption ?? cq.message?.text ?? "";

    // Answer immediately to remove the loading spinner
    await telegramCall("answerCallbackQuery", { callback_query_id: cq.id });

    if (!postId) return NextResponse.json({ ok: true });

    if (action === "approve") {
      await supabase.from("social_posts")
        .update({ status: "approved" })
        .eq("id", postId);

      await editMessage(
        msgId,
        `✅ *Approved* — posting now...\n\n${bodyText.split("\n\n")[1] ?? ""}`,
        isPhoto,
      );

      // Trigger GitHub Actions to post approved rows via Typefully
      await triggerGitHubDispatch();
    }

    else if (action === "skip") {
      await supabase.from("social_posts")
        .update({ status: "skipped" })
        .eq("id", postId);

      await editMessage(
        msgId,
        `⏭️ *Skipped*\n\n${bodyText.split("\n\n")[1] ?? ""}`,
        isPhoto,
      );
    }

    else if (action === "edit") {
      await supabase.from("social_posts")
        .update({ edit_mode: true })
        .eq("id", postId);

      await editMessage(
        msgId,
        `✏️ *Editing post...*\n\nReply to this message with your new text (max 240 chars).\n\n_Post ID: ${postId}_`,
        isPhoto,
        {
          inline_keyboard: [[
            { text: "⏭️ Cancel / Skip", callback_data: `skip:${postId}` },
          ]],
        },
      );
    }

    return NextResponse.json({ ok: true });
  }

  // ── Handle reply messages (Edit flow) ──────────────────────────────────
  if (update.message?.reply_to_message) {
    const msg = update.message;
    const replyToId = String(msg.reply_to_message.message_id);
    const newText = msg.text?.trim();

    if (!newText) return NextResponse.json({ ok: true });

    const { data: posts } = await supabase
      .from("social_posts")
      .select("id, draft_text, template_type, draft_variants")
      .eq("telegram_message_id", replyToId)
      .eq("edit_mode", true)
      .limit(1);

    if (!posts || posts.length === 0) return NextResponse.json({ ok: true });

    const post = posts[0];
    const isPhoto = !!msg.reply_to_message?.photo;

    await supabase.from("social_posts")
      .update({ draft_text: newText, edit_mode: false })
      .eq("id", post.id);

    await editMessage(
      Number(replyToId),
      (
        `🆕 *${post.template_type.toUpperCase().replace(/_/g, " ")}* _(edited)_\n\n` +
        `${newText}\n\n` +
        `_Post ID: ${post.id}_`
      ),
      isPhoto,
      {
        inline_keyboard: [[
          { text: "✅ Approve", callback_data: `approve:${post.id}` },
          { text: "✏️ Edit",    callback_data: `edit:${post.id}` },
          { text: "⏭️ Skip",   callback_data: `skip:${post.id}` },
        ]],
      },
    );

    await telegramCall("deleteMessage", {
      chat_id: CHAT_ID,
      message_id: msg.message_id,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
