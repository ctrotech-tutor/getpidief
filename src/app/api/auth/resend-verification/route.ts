import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { authUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redis, KEYS } from "@/lib/redis/client";
import { inngest } from "@/lib/inngest/client";
import { nanoid } from "nanoid";

const resendSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = resendSchema.parse(body);

    // Find user by email
    const user = await db.query.authUsers.findFirst({
      where: eq(authUsers.email, email.toLowerCase()),
      columns: { id: true, email: true, emailVerified: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified. You can sign in." },
        { status: 400 }
      );
    }

    // Generate verification token
    const token = nanoid(32);
    const tokenData = JSON.stringify({
      userId: user.id,
      email: user.email,
    });

    // Store token in Redis (24 hour expiry)
    if (redis) {
      try {
        await redis.setex(KEYS.emailVerifyToken(token), 86400, tokenData);
      } catch (error) {
        console.warn("[Auth] Failed to store verification token:", error);
      }
    }

    // Send verification email via Inngest
    await inngest.send({
      name: "email/send-verification",
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        token,
      },
    });

    return NextResponse.json({
      message: "Verification email sent successfully",
    });

  } catch (error) {
    console.error("Resend verification error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to resend verification email" },
      { status: 500 }
    );
  }
}
