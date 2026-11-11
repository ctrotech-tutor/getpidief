import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { documents, users } from "@/lib/db/schema";
import { getPrivatePdfUrl, privatePdfKey } from "@/lib/storage/private-pdf";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function unavailable() { return new NextResponse("File unavailable", { status: 404, headers: { "Cache-Control": "private, no-store" } }); }

// Private objects only. Legacy public URLs must never be used as a proxy target.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return unavailable();
  try {
    const doc = await db.query.documents.findFirst({ where: and(eq(documents.id, id), isNull(documents.deletedAt)), columns: { fileUrl: true, status: true, visibility: true } });
    if (!doc || !privatePdfKey(doc.fileUrl)) return unavailable();
    if (doc.status !== "approved" || doc.visibility !== "public") {
      const session = await auth();
      if (!session?.user?.id) return unavailable();
      const actor = await db.query.users.findFirst({ where: and(eq(users.id, session.user.id), eq(users.status, "active"), isNull(users.deletedAt)), columns: { role: true } });
      if (!actor || !["moderator", "admin", "super_admin"].includes(actor.role)) return unavailable();
    }
    const range = req.headers.get("range");
    // Support a single byte range only. Reject malformed or multi-range requests.
    if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return new NextResponse("Invalid range", { status: 416, headers: { "Cache-Control": "private, no-store" } });
    const url = await getPrivatePdfUrl(doc.fileUrl);
    const upstream = await fetch(url, { headers: range ? { Range: range } : {}, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(30000) });
    if (upstream.status !== 200 && upstream.status !== 206) return new NextResponse("File temporarily unavailable", { status: 502, headers: { "Cache-Control": "private, no-store" } });
    const headers = new Headers({ "Content-Type": "application/pdf", "Content-Disposition": "inline", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
    for (const name of ["content-length", "content-range", "accept-ranges"]) { const value = upstream.headers.get(name); if (value) headers.set(name, value); }
    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch {
    // Never log signed URLs or expose provider failures to the client.
    return new NextResponse("File temporarily unavailable", { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
