import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth/config";
import { rateLimiters } from "@/lib/redis/client";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { storage, STORAGE_KEYS } from "@/lib/storage/client";

const f = createUploadthing();

// ─────────────────────────────────────────────────────────────────────────────
// FILE ROUTER
// ─────────────────────────────────────────────────────────────────────────────

export const ourFileRouter = {
  // ── Document PDF upload ───────────────────────────────────────────────────
  documentPdf: f({ pdf: { maxFileSize: "64MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("UNAUTHORIZED");

      // Rate limit uploads
      const { success } = await rateLimiters.upload.limit(session.user.id);
      if (!success) throw new Error("UPLOAD_RATE_LIMITED");

      return {
        userId: session.user.id,
        institutionId: (session.user as any).institutionId,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // file.url is the Uploadthing CDN URL
      // We return it to the client — client then submits the full metadata form
      return {
        uploadedBy: metadata.userId,
        url: file.url,
        key: file.key,
        name: file.name,
        size: file.size,
      };
    }),

  // ── Avatar upload ─────────────────────────────────────────────────────────
  userAvatar: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("UNAUTHORIZED");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const { users } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(users)
        .set({ avatarUrl: file.url, updatedAt: new Date() })
        .where(eq(users.id, metadata.userId));

      return { url: file.url };
    }),

  // ── Cover image upload ────────────────────────────────────────────────────
  userCover: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("UNAUTHORIZED");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const { users } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(users)
        .set({ coverUrl: file.url, updatedAt: new Date() })
        .where(eq(users.id, metadata.userId));

      return { url: file.url };
    }),

  // ── Verification document ─────────────────────────────────────────────────
  verificationDocument: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    image: { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("UNAUTHORIZED");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const { users } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(users)
        .set({
          verificationDocumentUrl: file.url,
          verificationStatus: "pending",
          verificationRequestedAt: new Date(),
        })
        .where(eq(users.id, metadata.userId));

      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
