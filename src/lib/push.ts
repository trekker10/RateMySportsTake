export async function subscribeUserToPush(userId: string, supabase: any) {
  try {
    // Register service worker
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // Check existing subscription
    let sub = await reg.pushManager.getSubscription();

    // Subscribe if not already subscribed
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
    }

    // Save to Supabase (upsert so re-registrations don't error)
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, subscription: JSON.stringify(sub) },
        { onConflict: 'user_id' }
      );

    if (error) throw error;

    return { ok: true };
  } catch (err) {
    console.error('Push subscription failed:', err);
    return { ok: false };
  }
}

// Helper: convert VAPID public key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}