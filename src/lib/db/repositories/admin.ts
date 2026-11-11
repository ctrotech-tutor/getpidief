import { db } from "@/lib/db/client";
import { documents, users, documentReports, auditLogs, analyticsSnapshots } from "@/lib/db/schema";
import { eq, and, desc, count, gte, sql } from "drizzle-orm";

export const adminRepository = {
  async getPlatformStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 86400 * 1000);

    const [
      totalDocs, pendingDocs, flaggedDocs,
      totalUsers, newUsersWeek,
      openReports,
    ] = await Promise.all([
      db.select({ count: count() }).from(documents).where(eq(documents.status, "approved")),
      db.select({ count: count() }).from(documents).where(eq(documents.status, "pending")),
      db.select({ count: count() }).from(documents).where(eq(documents.status, "flagged")),
      db.select({ count: count() }).from(users).where(eq(users.status, "active")),
      db.select({ count: count() }).from(users).where(gte(users.createdAt, weekAgo)),
      db.select({ count: count() }).from(documentReports).where(eq(documentReports.status, "open")),
    ]);

    return {
      documents:    { total: totalDocs[0]?.count ?? 0, pending: pendingDocs[0]?.count ?? 0, flagged: flaggedDocs[0]?.count ?? 0 },
      users:        { total: totalUsers[0]?.count ?? 0, newThisWeek: newUsersWeek[0]?.count ?? 0 },
      reports:      { open: openReports[0]?.count ?? 0 },
    };
  },

  async getModerationQueue(status: string, { page = 1, limit = 15 } = {}) {
    const offset = (page - 1) * limit;
    return db.query.documents.findMany({
      where: eq(documents.status, status as any),
      orderBy: [desc(documents.createdAt)],
      limit,
      offset,
      with: {
        author:      { columns: { id: true, username: true, displayName: true } },
        category:    { columns: { id: true, name: true, color: true } },
        institution: { columns: { id: true, name: true } },
      },
    });
  },

  async getAuditLogs({ page = 1, limit = 25, action }: { page?: number; limit?: number; action?: string } = {}) {
    const offset = (page - 1) * limit;
    return db.query.auditLogs.findMany({
      where: action ? eq(auditLogs.action, action as any) : undefined,
      orderBy: [desc(auditLogs.createdAt)],
      limit,
      offset,
      with: {
        admin: { columns: { id: true, username: true, displayName: true } },
      },
    });
  },
};