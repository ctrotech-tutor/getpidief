import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { apiSuccess, apiUnauthorized, handleApiError } from "@/lib/utils/api";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiUnauthorized();

    const body     = await req.json();
    const endpoint = body.endpoint as string;
    if (!endpoint) return apiSuccess({ removed: false });

    await db.delete(pushSubscriptions).where(
      and(eq(pushSubscriptions.userId, session.user.id), eq(pushSubscriptions.endpoint, endpoint))
    );

    return apiSuccess({ removed: true });
  } catch (e) {
    return handleApiError(e);
  }
}
