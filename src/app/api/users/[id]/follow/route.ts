import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { usersRepository } from "@/lib/db/repositories/users";
import { apiSuccess, apiUnauthorized, apiError, handleApiError } from "@/lib/utils/api";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const { id: followingId } = await params;
    if (!z.string().uuid().safeParse(followingId).success) return apiError("INVALID_PARAMS", "Invalid user ID");
    if (followingId === session.user.id) return apiError("INVALID_PARAMS", "Cannot follow yourself");

    const { changed } = await usersRepository.follow(session.user.id, followingId);
    if (changed) await inngest.send({ name: "user/followed", data: { followerId: session.user.id, followingId } }).catch((error) => console.error("Follow notification failed", error));
    return apiSuccess({ following: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const { id: followingId } = await params;
    if (!z.string().uuid().safeParse(followingId).success || followingId === session.user.id) return apiError("INVALID_PARAMS", "Invalid user ID");
    await usersRepository.unfollow(session.user.id, followingId);
    return apiSuccess({ following: false });
  } catch (e) {
    return handleApiError(e);
  }
}
