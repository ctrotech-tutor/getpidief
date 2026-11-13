import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { readPulse } from "@/lib/pulse/read";
import { apiSuccess, handleApiError } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  try {
    const rawLimit = req.nextUrl.searchParams.get("limit") ?? "10";
    const parsed = /^\d+$/.test(rawLimit) ? Number(rawLimit) : 10;
    const limit = Number.isSafeInteger(parsed) ? Math.min(Math.max(parsed, 1), 20) : 10;
    const session = await auth();
    const items = await readPulse(session?.user?.id ?? null, limit);
    const response = apiSuccess({ items });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (e) {
    return handleApiError(e);
  }
}
