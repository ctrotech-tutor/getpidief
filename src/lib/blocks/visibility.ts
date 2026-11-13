import { sql, type SQL } from "drizzle-orm";

/** Viewer-specific discovery filter. Public reads intentionally pass no viewer. */
export function notBlockedByEither(viewerId: string | null | undefined, accountId: SQL) {
  return viewerId ? sql`NOT EXISTS (SELECT 1 FROM user_blocks b WHERE b.blocker_id = ${viewerId}::uuid AND b.blocked_id = ${accountId})
    AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE b.blocked_id = ${viewerId}::uuid AND b.blocker_id = ${accountId})` : sql`true`;
}
