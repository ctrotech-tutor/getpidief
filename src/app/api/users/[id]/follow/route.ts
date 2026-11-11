import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { usersRepository } from "@/lib/db/repositories/users";
import { apiSuccess, apiUnauthorized, apiError, handleApiError } from "@/lib/utils/api";
import { inngest } from "@/lib/inngest/client";

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    const { id: followingId } = await params;
    if (followingId === session.user.id) return apiError("INVALID_PARAMS", "Cannot follow yourself");

    await usersRepository.follow(session.user.id, followingId);
    await inngest.send({ name: "user/followed", data: { followerId: session.user.id, followingId } });
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
    await usersRepository.unfollow(session.user.id, followingId);
    return apiSuccess({ following: false });
  } catch (e) {
    return handleApiError(e);
  }
}
