import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { usersRepository } from "@/lib/db/repositories/users";
import { z } from "zod";
import { apiSuccess, apiError, apiUnauthorized, handleApiError } from "@/lib/utils/api";
import { inngest } from "@/lib/inngest/client";

const followSchema = z.object({ followingId: z.string().uuid() });

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const body   = await req.json();
    const parsed = followSchema.safeParse(body);
    if (!parsed.success) return apiError("INVALID_PARAMS", "Invalid user ID");

    const { followingId } = parsed.data;
    const followerId = session.user.id;

    if (followerId === followingId) {
      return apiError("INVALID_PARAMS", "You cannot follow yourself");
    }

    await usersRepository.follow(followerId, followingId);

    await inngest.send({
      name: "user/followed",
      data: { followerId, followingId },
    });

    return apiSuccess({ following: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const body   = await req.json();
    const parsed = followSchema.safeParse(body);
    if (!parsed.success) return apiError("INVALID_PARAMS", "Invalid user ID");

    await usersRepository.unfollow(session.user.id, parsed.data.followingId);

    return apiSuccess({ following: false });
  } catch (e) {
    return handleApiError(e);
  }
}