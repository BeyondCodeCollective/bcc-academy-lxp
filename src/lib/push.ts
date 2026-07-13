import { createServiceClient } from "@/lib/supabase/server";

// Send a push notification to a specific student
export async function sendPushNotification(params: {
  studentId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<void> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublicKey || !vapidPrivateKey) {
    // Push not configured — silently skip
    return;
  }

  const svc = createServiceClient();
  const { data: subs } = await svc
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("student_id", params.studentId);

  if (!subs?.length) return;

  // Dynamically import web-push to avoid bundling in client
  const webPush = await import("web-push").catch(() => null);
  if (!webPush) return;

  webPush.setVapidDetails(
    "mailto:info@bccacademy.io",
    vapidPublicKey,
    vapidPrivateKey
  );

  const payload = JSON.stringify({
    title: params.title,
    body: params.body,
    url: params.url || "/dashboard",
    tag: params.tag || "bcc-notification",
    icon: "/bcc-logo-white.svg",
  });

  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (err) {
      // Subscription might be expired — clean it up
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        await svc
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    }
  }
}

// Send push to all students enrolled in a track
export async function sendPushToTrack(params: {
  programId: string;
  trackSlug: string;
  title: string;
  body: string;
  url?: string;
}): Promise<void> {
  const svc = createServiceClient();

  const { data: enrollments } = await svc
    .from("student_tracks")
    .select("student_id")
    .eq("program_id", params.programId)
    .eq("track_slug", params.trackSlug);

  const studentIds = [...new Set((enrollments ?? []).map((e) => e.student_id as string))];

  await Promise.allSettled(
    studentIds.map((id) =>
      sendPushNotification({
        studentId: id,
        title: params.title,
        body: params.body,
        url: params.url,
      })
    )
  );
}
