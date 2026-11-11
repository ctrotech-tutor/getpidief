import { and, eq, sql } from "drizzle-orm";
import { documentBookmarks, documents } from "@/lib/db/schema";

/** Interim policy: a saved item is readable only while its resource is public. */
export function publicBookmarksFor(userId: string) {
  return and(
    eq(documentBookmarks.userId, userId),
    sql`exists (select 1 from ${documents} where ${documents.id} = ${documentBookmarks.documentId} and ${documents.status} = 'approved' and ${documents.visibility} = 'public' and ${documents.deletedAt} is null)`
  );
}

