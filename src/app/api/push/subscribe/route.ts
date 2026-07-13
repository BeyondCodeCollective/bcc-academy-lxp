import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/push/subscribe — save a push subscription for the current user
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // Store in a push_subscriptions table
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      student_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,endpoint" }
  );

  if (error) {
    // Table might not exist yet — that's fine, push is opt-in
    console.warn("[push] Failed to save subscription:", error.message);
    return NextResponse.json({ error: "Storage failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/push/subscribe — remove a push subscription
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await request.json();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("student_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    console.warn("[push] Failed to delete subscription:", error.message);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
