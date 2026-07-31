import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

// Validate incoming webhook secret (header set when registering the webhook)
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

export async function POST(req: NextRequest) {
  if (!isValidSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  if (!update) return NextResponse.json({ ok: true }); // ack empty payloads

  const supabase = createAdminClient();

  // ── Handle inline button taps (Approve / Edit / Skip) ──────────────────
  if (update.callback_query) {
    const cq = update.callback_query;
    const data: string = cq.data ?? "";
    const [action, postId] = data.split(":");

    // Always answer the callback query to remove the loading spinner
    await telegramCall("answerCallbackQuery", { callback_query_id: cq.id });

    if (!postId) return NextResponse.json({ ok: true });

    if (action === "approve") {
      await supabase.from("social_posts")
        .update({ status: "approved" })
        .eq("id", postId);

      await telegramCall("editMessageText", {
        chat_id: CHAT_ID,
        message_id: cq.message.message_id,
        text: `✅ *Approved*\n\n${cq.message.text?.split("\n\n")[1] ?? ""}`,
        parse_mode: "Markdown",
      });
    }

    else if (action === "skip") {
      await supabase.from("social_posts")
        .update({ status: "skipped" })
        .eq("id", postId);

      await telegramCall("editMessageText", {
        chat_id: CHAT_ID,
        message_id: cq.message.message_id,
        text: `⏭️ *Skipped*\n\n${cq.message.text?.split("\n\n")[1] ?? ""}`,
        parse_mode: "Markdown",
      });
    }

    else if (action === "edit") {
      // Mark the post as in edit mode, then prompt for new text
      await supabase.from("social_posts")
        .update({ edit_mode: true })
        .eq("id", postId);

      await telegramCall("editMessageText", {
        chat_id: CHAT_ID,
        message_id: cq.message.message_id,
        text: `✏️ *Editing post...*\n\nReply to this message with your new text (max 240 chars).\n\n_Post ID: ${postId}_`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "⏭️ Cancel / Skip", callback_data: `skip:${postId}` },
          ]],
        },
      });
    }

    return NextResponse.json({ ok: true });
  }

  // ── Handle reply messages (Edit flow) ──────────────────────────────────
  if (update.message?.reply_to_message) {
    const msg = update.message;
    const replyToId = String(msg.reply_to_message.message_id);
    const newText = msg.text?.trim();

    if (!newText) return NextResponse.json({ ok: true });

    // Find the post being edited by its telegram_message_id
    const { data: posts } = await supabase
      .from("social_posts")
      .select("id, draft_text, template_type, draft_variants")
      .eq("telegram_message_id", replyToId)
      .eq("edit_mode", true)
      .limit(1);

    if (!posts || posts.length === 0) return NextResponse.json({ ok: true });

    const post = posts[0];

    // Update draft_text, clear edit_mode, keep status as needs_approval
    await supabase.from("social_posts")
      .update({ draft_text: newText, edit_mode: false })
      .eq("id", post.id);

    // Update the original message with the new text + fresh buttons
    await telegramCall("editMessageText", {
      chat_id: CHAT_ID,
      message_id: Number(replyToId),
      text: (
        `🆕 *${post.template_type.toUpperCase().replace(/_/g, " ")}* _(edited)_\n\n` +
        `${newText}\n\n` +
        `_Post ID: ${post.id}_`
      ),
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Approve", callback_data: `approve:${post.id}` },
          { text: "✏️ Edit",    callback_data: `edit:${post.id}` },
          { text: "⏭️ Skip",   callback_data: `skip:${post.id}` },
        ]],
      },
    });

    // Delete the user's reply to keep chat clean
    await telegramCall("deleteMessage", {
      chat_id: CHAT_ID,
      message_id: msg.message_id,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
