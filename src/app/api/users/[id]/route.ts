import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { usersRepository } from "@/lib/db/repositories/users";
import { apiSuccess, apiNotFound, apiUnauthorized, handleApiError } from "@/lib/utils/api";
import { db } from "@/lib/db/client";
import { users, authUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // id can be either a UUID or username
    const isUuid = /^[0-9a-f-]{36}$/i.test(id);

    let username: string | null = null;

    if (isUuid) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: { username: true },
      });
      if (!user) return apiNotFound("User");
      username = user.username;
    } else {
      username = id;
    }

    const session = await auth();
    const profile = await usersRepository.getPublicProfile(username, session?.user?.id);

    if (!profile) return apiNotFound("User");

    return apiSuccess(profile);
  } catch (e) {
    return handleApiError(e);
  }
}