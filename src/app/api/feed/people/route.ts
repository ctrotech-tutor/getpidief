import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { usersRepository } from "@/lib/db/repositories/users";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Sign in required." }, { status: 401, headers });
  const [account] = await db.select({ status: users.status, onboarded: users.onboardingComplete }).from(users).where(and(eq(users.id, userId), isNull(users.deletedAt))).limit(1);
  if (!account || account.status !== "active" || !account.onboarded) return Response.json({ error: "Account unavailable." }, { status: 403, headers });
  const [following, suggestions] = await Promise.all([usersRepository.getFollowing(userId, { viewerId: userId, limit: 3 }), usersRepository.getFollowSuggestions(userId, 3)]);
  return Response.json({ following: { total: following.total, following: following.following.map(({ id, username, displayName, avatarUrl }) => ({ id, username, displayName, avatarUrl })) }, suggestions: suggestions.rows.map(({ id, username, display_name, avatar_url }) => ({ id, username, display_name, avatar_url })) }, { headers });
}
