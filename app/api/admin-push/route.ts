import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

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
  const { userId, title, body, secret } = await req.json();

  // Basic protection so random people can't spam your users
  if (secret !== process.env.ADMIN_PUSH_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return Response.json({ error: 'No subscription found' }, { status: 404 });
  }

  await webpush.sendNotification(
    JSON.parse(data.subscription),
    JSON.stringify({ title, body })
  );

  return Response.json({ ok: true });
}