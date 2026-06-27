import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { title, body, secret } = await req.json();

  if (secret !== process.env.ADMIN_PUSH_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.from("push_subscriptions").select("subscription");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = await Promise.allSettled(
    (data ?? []).map((row) =>
      webpush.sendNotification(JSON.parse(row.subscription), JSON.stringify({ title, body }))
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return Response.json({ ok: true, sent, failed });
}
