import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getAutocomplete } from "@/lib/search/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ data: [] });
  }

  const session = await auth();
  const results = await getAutocomplete(q, session?.user?.id, 8);

  return NextResponse.json(
    { data: results },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
