import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const TYPEFULLY_API_KEY = process.env.TYPEFULLY_API_KEY ?? "";
const TYPEFULLY_SOCIAL_SET_ID = process.env.TYPEFULLY_SOCIAL_SET_ID ?? "323913";
const RMST_BASE = "https://ratemysportstake.com";
const HOT_TEMPLATES = new Set(["hot_take_drop", "subtweet_ack"]);

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

// ── Typefully helpers ─────────────────────────────────────────────────────────

async function typefullyRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.typefully.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TYPEFULLY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Typefully ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function typefullyUploadImage(imageBytes: ArrayBuffer): Promise<string | null> {
  const sid = TYPEFULLY_SOCIAL_SET_ID;

  // Step 1: init upload slot
  let init: Record<string, unknown>;
  try {
    init = await typefullyRequest("POST", `/v2/social-sets/${sid}/media/upload`, {
      file_name: "receipt.png",
    });
  } catch (e) {
    console.error("[typefully] media init failed:", e);
    return null;
  }

  const mediaId = init.media_id as string;
  const uploadUrl = init.upload_url as string;
  if (!mediaId || !uploadUrl) {
    console.error("[typefully] unexpected media init response:", init);
    return null;
  }

  // Step 2: PUT raw bytes to presigned URL — NO extra headers
  try {
    const putRes = await fetch(uploadUrl, { method: "PUT", body: imageBytes });
    if (!putRes.ok) {
      console.error("[typefully] presigned PUT failed:", putRes.status);
      return null;
    }
  } catch (e) {
    console.error("[typefully] presigned PUT error:", e);
    return null;
  }

  // Step 3: poll until ready (max ~60s)
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const statusResp = await typefullyRequest(
        "GET",
        `/v2/social-sets/${sid}/media/${mediaId}`,
      );
      if (statusResp.status === "ready") return mediaId;
      if (statusResp.status === "failed") {
        console.error("[typefully] media processing failed");
        return null;
      }
    } catch (e) {
      console.error("[typefully] media poll error:", e);
    }
  }

  console.error("[typefully] media timed out");
  return null;
}

async function postToTypefully(post: {
  id: string;
  template_type: string;
  draft_text: string;
  image_url: string | null;
  reply_to_url: string | null;
}): Promise<string> {
  const sid = TYPEFULLY_SOCIAL_SET_ID;
  const publishAt = HOT_TEMPLATES.has(post.template_type) ? "now" : "next-free-slot";

  // Upload image if present
  let mediaId: string | null = null;
  if (post.image_url) {
    try {
      const imgRes = await fetch(post.image_url, {
        headers: { "User-Agent": "TelegramWebhook/1.0" },
      });
      if (imgRes.ok) {
        const imgBytes = await imgRes.arrayBuffer();
        mediaId = await typefullyUploadImage(imgBytes);
        if (!mediaId) console.error(`[typefully] image upload failed for ${post.id}, posting text-only`);
      }
    } catch (e) {
      console.error(`[typefully] image fetch failed for ${post.id}:`, e);
    }
  }

  const postObj: Record<string, unknown> = { text: post.draft_text };
  if (mediaId) postObj.media_ids = [mediaId];

  const xPlatform: Record<string, unknown> = { enabled: true, posts: [postObj] };
  if (post.reply_to_url) xPlatform.settings = { reply_to_url: post.reply_to_url };

  const draftResp = await typefullyRequest("POST", `/v2/social-sets/${sid}/drafts`, {
    platforms: { x: xPlatform },
    publish_at: publishAt,
  });

  const draftId = (draftResp.id ?? draftResp.draft_id) as string;
  if (!draftId) throw new Error(`No draft ID in response: ${JSON.stringify(draftResp)}`);
  return String(draftId);
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

    // Answer immediately to remove the loading spinner
    await telegramCall("answerCallbackQuery", { callback_query_id: cq.id });

    if (!postId) return NextResponse.json({ ok: true });

    if (action === "approve") {
      if (TYPEFULLY_API_KEY) {
        // Fetch the full post row
        const { data: rows } = await supabase
          .from("social_posts")
          .select("id, template_type, draft_text, image_url, reply_to_url")
          .eq("id", postId)
          .limit(1);

        const post = rows?.[0];
        if (post) {
          try {
            const draftId = await postToTypefully(post);
            await supabase.from("social_posts")
              .update({ status: "scheduled", typefully_draft_id: draftId })
              .eq("id", postId);

            await editMessage(
              msgId,
              `✅ *Scheduled* → Typefully draft ${draftId}\n\n${post.draft_text}`,
              isPhoto,
            );
          } catch (e) {
            console.error(`[webhook] Typefully posting failed for ${postId}:`, e);
            // Fall back: mark approved so cron picks it up
            await supabase.from("social_posts")
              .update({ status: "approved" })
              .eq("id", postId);
            await editMessage(
              msgId,
              `✅ *Approved* (will post on next cron run)\n\n${post.draft_text}`,
              isPhoto,
            );
          }
        }
      } else {
        // No Typefully key — just mark approved
        await supabase.from("social_posts")
          .update({ status: "approved" })
          .eq("id", postId);
        const bodyText = cq.message?.caption ?? cq.message?.text ?? "";
        await editMessage(msgId, `✅ *Approved*\n\n${bodyText.split("\n\n")[1] ?? ""}`, isPhoto);
      }
    }

    else if (action === "skip") {
      await supabase.from("social_posts")
        .update({ status: "skipped" })
        .eq("id", postId);
      const bodyText = cq.message?.caption ?? cq.message?.text ?? "";
      await editMessage(msgId, `⏭️ *Skipped*\n\n${bodyText.split("\n\n")[1] ?? ""}`, isPhoto);
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

    await supabase.from("social_posts")
      .update({ draft_text: newText, edit_mode: false })
      .eq("id", post.id);

    // Determine if the original message was a photo
    const isPhoto = !!msg.reply_to_message?.photo;

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
