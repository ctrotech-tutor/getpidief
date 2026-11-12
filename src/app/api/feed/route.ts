import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { FEED_UUID, validFeedTime } from "@/lib/feed/cursor";
import { readFeed, type FeedView } from "@/lib/feed/read";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return Response.json({ error: "Sign in to view the feed." }, { status: 401, headers });
  const [account] = await db.select({ status: users.status, onboarded: users.onboardingComplete }).from(users).where(and(eq(users.id, id), isNull(users.deletedAt))).limit(1);
  if (!account || account.status !== "active" || !account.onboarded) return Response.json({ error: "Account unavailable." }, { status: 403, headers });
  const params = new URL(request.url).searchParams;
  const view = params.get("view"); const before = params.get("before"); const kind = params.get("beforeKind"); const at = params.get("beforeAt");
  if (!view || !["latest", "following", "saved"].includes(view) || !before || !FEED_UUID.test(before) || !kind || !["post", "repost"].includes(kind) || !at || !validFeedTime(at)) {
    return Response.json({ error: "Invalid feed cursor." }, { status: 400, headers });
  }
  const page = await readFeed(id, view as FeedView, before, kind, at);
  return Response.json(page, { headers });
}
