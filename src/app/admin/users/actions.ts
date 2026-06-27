"use server";

import { checkIsAdmin } from "@/lib/auth";

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) return { ok: false, error: "Unauthorized" };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ratemysportstake.com";

  const res = await fetch(`${baseUrl}/api/admin-push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      title,
      body,
      secret: process.env.ADMIN_PUSH_SECRET,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text };
  }
  return { ok: true };
}
