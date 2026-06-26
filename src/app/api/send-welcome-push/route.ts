import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // use service role key for server-side
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return Response.json({ ok: false, error: 'No subscription found' }, { status: 404 });
    }

    await webpush.sendNotification(
      JSON.parse(data.subscription),
      JSON.stringify({
        title: "You're in! 🏆",
        body: 'Welcome to RateMySportsTake. Drop a take.',
      })
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('Send push error:', err);
    return Response.json({ ok: false }, { status: 500 });
  }
}