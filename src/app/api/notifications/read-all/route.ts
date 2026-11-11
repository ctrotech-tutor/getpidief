import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { notificationsRepository } from "@/lib/db/repositories/notifications";
import { apiSuccess, apiUnauthorized, handleApiError } from "@/lib/utils/api";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();
    await notificationsRepository.markAllRead(session.user.id);
    return apiSuccess({ marked: true });
  } catch (e) {
    return handleApiError(e);
  }
}
