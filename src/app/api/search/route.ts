import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { searchDocuments } from "@/lib/search/search";
import { searchQuerySchema } from "@/lib/validations/schemas";
import { rateLimiters } from "@/lib/redis/client";
import { inngest } from "@/lib/inngest/client";

export async function GET(req: NextRequest) {
  const session = await auth();

  // Rate limit: 60 searches/min per user or IP
  const identifier = session?.user?.id ?? req.headers.get("x-forwarded-for") ?? "anon";
  const { success } = await rateLimiters.search.limit(identifier);
  if (!success) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many search requests. Please slow down." } },
      { status: 429 }
    );
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = searchQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_PARAMS", message: "Invalid search parameters", details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  const { q, category, institution, type, yearFrom, yearTo, verified, language, sort, page, limit } = parsed.data;

  const results = await searchDocuments(
    {
      query: q,
      categoryIds: category ? [category] : undefined,
      institutionIds: institution ? [institution] : undefined,
      resourceTypes: type ? [type] : undefined,
      yearFrom,
      yearTo,
      verifiedOnly: verified,
      language,
      sort,
      page,
      limit,
      institutionScoped: (session?.user as any)?.institutionId ?? undefined,
    },
    session?.user?.id
  );

  // Log search to user activity (non-blocking)
  if (session?.user?.id && q.trim().length >= 3) {
    inngest.send({
      name: "user/streak-update",
      data: { userId: session.user.id },
    }).catch(() => {});
  }

  return NextResponse.json({ data: results }, { status: 200 });
}
