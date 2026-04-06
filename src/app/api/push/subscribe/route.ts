import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { pushSubscriptions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import webpush from "web-push";

// Configure web-push VAPID keys once
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// POST /api/push/subscribe
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await db
    .insert(pushSubscriptions)
    .values({
      userId: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: req.headers.get("user-agent") ?? null,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [pushSubscriptions.endpoint],
      set: { isActive: true, lastUsedAt: new Date() },
    });

  await db
    .update(users)
    .set({ pushEnabled: true })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true });
}
