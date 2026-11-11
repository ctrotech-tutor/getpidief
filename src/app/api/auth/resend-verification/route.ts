import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { authUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redis, redisRateLimit, rateLimiters } from "@/lib/redis/client";
import { inngest } from "@/lib/inngest/client";

const resendSchema = z.object({ email: z.string().trim().email().max(255).toLowerCase() });
const message = "If the account needs verification, an email will be requested.";
export async function POST(request: NextRequest) {
  try {
    const parsed = resendSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (!redis || (process.env.NODE_ENV === "production" && !redisRateLimit)) return NextResponse.json({ error: "Verification is temporarily unavailable. Please try again later." }, { status: 503 });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = await rateLimiters.verificationResend.limit(ip);
    if (!limit.success) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    const user = await db.query.authUsers.findFirst({ where: eq(authUsers.email, parsed.data.email), columns: { id: true, email: true, emailVerified: true, name: true } });
    if (user && !user.emailVerified) {
      await inngest.send({ name: "email/send-verification", data: { userId: user.id, email: user.email, name: user.name ?? "Learner" } });
    }
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Verification is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
