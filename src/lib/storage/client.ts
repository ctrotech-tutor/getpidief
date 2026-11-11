import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─────────────────────────────────────────────────────────────────────────────
// B2 CLIENT  (S3-compatible)
// ─────────────────────────────────────────────────────────────────────────────

const usingB2 = !!(
  process.env.B2_ENDPOINT &&
  process.env.B2_BUCKET_NAME &&
  process.env.B2_KEY_ID &&
  process.env.B2_APPLICATION_KEY
);

const endpoint =
  process.env.B2_ENDPOINT ??
  (process.env.CLOUDFLARE_ACCOUNT_ID
    ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined);

const BUCKET = process.env.B2_BUCKET_NAME ?? process.env.R2_BUCKET_NAME ?? "";
const PUBLIC_URL = (
  process.env.B2_PUBLIC_URL ??
  process.env.R2_PUBLIC_URL ??
  (endpoint && BUCKET ? `${endpoint.replace(/\/$/, "")}/${BUCKET}` : "")
).replace(/\/$/, "");

const storageClient = new S3Client({
  region: usingB2 ? process.env.B2_REGION ?? "us-west-000" : "auto",
  endpoint,
  forcePathStyle: usingB2,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID ?? process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.B2_APPLICATION_KEY ?? process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

function assertStorageConfigured() {
  if (!endpoint || !BUCKET) {
    throw new Error(
      "Storage is not configured. Set B2_ENDPOINT/B2_BUCKET_NAME (or legacy R2 env vars)."
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KEY PATTERNS  — all object keys follow these patterns
// ─────────────────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  /** PDF document: documents/{documentId}/{filename}.pdf */
  document: (documentId: string, filename: string) =>
    `documents/${documentId}/${filename}`,

  /** Thumbnail WebP: thumbnails/{documentId}.webp */
  thumbnail: (documentId: string) => `thumbnails/${documentId}.webp`,

  /** User avatar: avatars/{userId}.{ext} */
  avatar: (userId: string, ext: string = "webp") => `avatars/${userId}.${ext}`,

  /** User cover image: covers/{userId}.{ext} */
  cover: (userId: string, ext: string = "webp") => `covers/${userId}.${ext}`,

  /** Institution logo: institutions/{institutionId}.{ext} */
  institutionLogo: (institutionId: string, ext: string = "png") =>
    `institutions/${institutionId}/logo.${ext}`,

  /** Verification document: verification/{userId}/{filename} */
  verificationDoc: (userId: string, filename: string) =>
    `verification/${userId}/${filename}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE CLIENT
// ─────────────────────────────────────────────────────────────────────────────

export const storage = {
  /**
   * Upload a file to B2
   * Returns the public CDN URL of the uploaded file
   */
  async upload(
    key: string,
    body: Buffer | Uint8Array | ReadableStream,
    options: {
      contentType: string;
      cacheControl?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<string> {
    assertStorageConfigured();
    await storageClient.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: options.contentType,
        CacheControl: options.cacheControl ?? "public, max-age=3600",
        Metadata: options.metadata,
      })
    );

    return PUBLIC_URL ? `${PUBLIC_URL}/${key}` : key;
  },

  /**
   * Generate a pre-signed URL for direct client-side upload
   * Used by Uploadthing callback after receiving the file
   */
  async getUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    assertStorageConfigured();
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(storageClient, command, { expiresIn: expiresInSeconds });
  },

  /**
   * Generate a pre-signed download URL for private/restricted files
   */
  async getDownloadUrl(
    key: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    assertStorageConfigured();
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    return getSignedUrl(storageClient, command, { expiresIn: expiresInSeconds });
  },

  /**
   * Delete a file from storage
   */
  async delete(key: string): Promise<void> {
    assertStorageConfigured();
    await storageClient.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  },

  /**
   * Delete multiple files (used by cleanup worker)
   */
  async deleteMany(keys: string[]): Promise<void> {
    await Promise.allSettled(keys.map((key) => storage.delete(key)));
  },

  /**
   * Check if a file exists in storage
   */
  async exists(key: string): Promise<boolean> {
    try {
      assertStorageConfigured();
      await storageClient.send(
        new HeadObjectCommand({ Bucket: BUCKET, Key: key })
      );
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Convert a full public URL back to an object key
   */
  urlToKey(url: string): string {
    if (!PUBLIC_URL) return url;
    return url.replace(`${PUBLIC_URL}/`, "");
  },

  /**
   * Build the public URL for a given object key
   */
  keyToUrl(key: string): string {
    return PUBLIC_URL ? `${PUBLIC_URL}/${key}` : key;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FILE VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const FILE_LIMITS = {
  document: {
    maxSizeBytes: 50 * 1024 * 1024,   // 50 MB
    allowedTypes: ["application/pdf"],
    allowedExtensions: [".pdf"],
  },
  avatar: {
    maxSizeBytes: 5 * 1024 * 1024,    // 5 MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
  cover: {
    maxSizeBytes: 10 * 1024 * 1024,   // 10 MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
  verificationDoc: {
    maxSizeBytes: 10 * 1024 * 1024,   // 10 MB
    allowedTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ],
    allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"],
  },
} as const;

export function validateFile(
  file: { size: number; type: string; name: string },
  category: keyof typeof FILE_LIMITS
): { valid: true } | { valid: false; error: string } {
  const limits = FILE_LIMITS[category];

  if (file.size > limits.maxSizeBytes) {
    const maxMB = limits.maxSizeBytes / (1024 * 1024);
    return { valid: false, error: `File too large. Maximum size is ${maxMB}MB.` };
  }

  if (!(limits.allowedTypes as unknown as string[]).includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${limits.allowedTypes.join(", ")}`,
    };
  }

  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!(limits.allowedExtensions as unknown as string[]).includes(ext as string)) {
    return {
      valid: false,
      error: `Invalid extension. Allowed: ${limits.allowedExtensions.join(", ")}`,
    };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// INNGEST WORKER: Delete files from storage (called after soft-delete grace period)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteDocumentFiles(
  documentId: string,
  fileUrl: string
): Promise<void> {
  const fileKey = storage.urlToKey(fileUrl);
  const thumbnailKey = STORAGE_KEYS.thumbnail(documentId);

  await Promise.allSettled([
    storage.delete(fileKey),
    storage.delete(thumbnailKey),
  ]);
}
