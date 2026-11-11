import "server-only";
import { UTApi } from "uploadthing/server";

// This marker is server-side metadata, not a URL and never a client-provided path.
const PREFIX = "uploadthing-private:";
const KEY = /^[A-Za-z0-9_-]{1,255}$/;
export function privatePdfReference(key: string): string {
  if (!KEY.test(key)) throw new Error("Invalid storage key");
  return PREFIX + key;
}
export function privatePdfKey(reference: string): string | null {
  if (!reference.startsWith(PREFIX)) return null;
  const key = reference.slice(PREFIX.length);
  return KEY.test(key) ? key : null;
}
export function isPrivatePdfReference(reference: string): boolean {
  return reference.startsWith(PREFIX);
}

// Never cache signed URLs: every read must first check current document access.
export async function getPrivatePdfUrl(reference: string): Promise<string> {
  const key = privatePdfKey(reference);
  if (!key) throw new Error("Invalid private PDF reference");
  const { ufsUrl } = await new UTApi().generateSignedURL(key, { expiresIn: "60s" });
  return ufsUrl;
}
