import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { discoveryCandidates } from "@/lib/feed/discovery";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const id = (await auth())?.user?.id;
  if (!id) return Response.json({ error: "Sign in to view the feed." }, { status: 401, headers });
  const [account] = await db.select({ status: users.status, onboarded: users.onboardingComplete }).from(users).where(and(eq(users.id, id), isNull(users.deletedAt))).limit(1);
  if (!account || account.status !== "active" || !account.onboarded) return Response.json({ error: "Account unavailable." }, { status: 403, headers });
  return Response.json({ candidates: await discoveryCandidates(id) }, { headers });
}
