import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

export type PushPayload = { title: string; body: string; url: string };

let configured = false;

// The VAPID keys are the app's "identity card" for push services (Google's
// and Apple's). The public half is also sent to the browser at sign-up.
function configure() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    "https://khedma-psi.vercel.app",
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

// Sends one notification to every phone/browser this user turned them on
// for. Returns how many were accepted by the push service. Subscriptions the
// push service says are gone (404/410 - app uninstalled, permission removed)
// are deleted so we stop trying them.
export async function sendPush(
  userId: string,
  payload: PushPayload
): Promise<number> {
  if (!configure()) return 0;

  const service = createServiceClient();
  const { data: subscriptions } = await service
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .returns<{ id: string; endpoint: string; p256dh: string; auth: string }[]>();

  let sent = 0;
  await Promise.all(
    (subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 }
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await service
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        }
      }
    })
  );

  return sent;
}

export async function getPreferredLocale(userId: string) {
  const service = createServiceClient();
  const { data } = await service
    .from("profiles")
    .select("preferred_locale")
    .eq("id", userId)
    .maybeSingle<{ preferred_locale: string }>();
  return data?.preferred_locale ?? null;
}
