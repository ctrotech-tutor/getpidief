import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { documentDownloads, documents } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { redis, KEYS, incrCounter } from "@/lib/redis/client";
import { inngest } from "@/lib/inngest/client";
import crypto from "crypto";

interface Params { params: Promise<{ id: string }> }

async function trackDownload(req: NextRequest, id: string) {
  const session = await auth();
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex");

  // Verify document exists and allows download
  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, id),
      eq(documents.status, "approved"),
      eq(documents.visibility, "public"),
      isNull(documents.deletedAt)
    ),
    columns: { authorId: true, allowDownload: true, status: true, fileUrl: true },
  });

  if (!doc || doc.status !== "approved") {
    return { tracked: false as const, doc: null };
  }

  if (!doc.allowDownload) {
    return { tracked: false as const, reason: "downloads_disabled", doc };
  }

  // Buffer counter in Redis (flushed to DB by Inngest every 5 min)
  await incrCounter(KEYS.downloadCountBuffer(id));
  if (redis) {
    try {
      await redis.sadd(KEYS.pendingCounterFlush(), id);
    } catch (error) {
      console.warn("[Documents] Failed to add to pending counter flush:", error);
    }
  }

  // Insert download event record
  await db.insert(documentDownloads).values({
    documentId: id,
    userId: session?.user?.id ?? null,
    ipHash,
  });

  // Trigger download event (for reputation/analytics workers)
  await inngest.send({
    name: "document/downloaded",
    data: {
      documentId: id,
      userId: session?.user?.id ?? null,
      authorId: doc.authorId,
      ipHash,
    },
  }).catch(() => {});

  return { tracked: true as const, doc };
}

// GET /api/documents/[id]/download — track + redirect to file
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await trackDownload(req, id);
    if (!result.doc?.fileUrl) {
      return NextResponse.redirect(new URL("/404", req.url));
    }
    return NextResponse.redirect(result.doc.fileUrl);
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/documents/[id]/download — track only (for client-side callers)
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await trackDownload(req, id);
    if (result.tracked) return apiSuccess({ tracked: true });
    return apiSuccess({ tracked: false, reason: "unavailable" });
  } catch (e) {
    return handleApiError(e);
  }
}