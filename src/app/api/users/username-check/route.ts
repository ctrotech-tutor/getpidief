import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { usersRepository } from "@/lib/db/repositories/users";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get("username")?.trim().toLowerCase();
    if (!username || username.length < 3) {
      return apiError("INVALID_PARAMS", "Username must be at least 3 characters");
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      return apiError("INVALID_PARAMS", "Only lowercase letters, numbers, and underscores");
    }

    const session   = await auth();
    const available = await usersRepository.isUsernameAvailable(username, session?.user?.id);

    return apiSuccess({ available, username });
  } catch (e) {
    return handleApiError(e);
  }
}