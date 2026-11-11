import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redis, KEYS } from "@/lib/redis/client";
import { inngest } from "@/lib/inngest/client";

export async function POST() {
  try {
    const userId = await requireAuth();

    // Mark onboarding as complete in database
    await db
      .update(users)
      .set({ 
        onboardingComplete: true, 
        onboardingStep: 3, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));

    // Clear onboarding state from Redis
    if (redis) {
      try {
        await redis.del(KEYS.onboardingState(userId));
      } catch (error) {
        console.warn("[Auth] Failed to clear onboarding state:", error);
      }
    }

    // Invalidate recommendation cache
    if (redis) {
      try {
        await redis.del(KEYS.recommended(userId));
      } catch (error) {
        console.warn("[Auth] Failed to invalidate recommendation cache:", error);
      }
    }

    // Trigger onboarding-completed event (welcome email, recommendation warm-up)
    await inngest.send({
      name: "user/onboarding-completed",
      data: {
        userId,
        institutionId: "", // Will be fetched by the event handler
        tagIds: [], // No tags selected when skipping
      },
    });

    return NextResponse.json({
      message: "Onboarding skipped successfully",
    });

  } catch (error) {
    console.error("Skip onboarding error:", error);
    
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "You must be logged in to skip onboarding" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to skip onboarding" },
      { status: 500 }
    );
  }
}
