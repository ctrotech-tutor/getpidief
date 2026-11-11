export type ChannelActor = { id: string; role: string; status: string; institutionId: string | null };
export type ChannelDocument = { authorId: string; status: string; visibility: string; institutionId: string | null; deletedAt: Date | null };
export type ChannelRequest = { kind: "user"; userId: string } | { kind: "admin" } | { kind: "document"; documentId: string } | { kind: "unknown" };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const admins = new Set(["moderator", "admin", "super_admin"]);

export function parseChannel(name: string): ChannelRequest {
  if (name === "presence-admin") return { kind: "admin" };
  for (const prefix of ["private-document-", "presence-document-"]) {
    if (name.startsWith(prefix)) {
      const documentId = name.slice(prefix.length);
      return uuid.test(documentId) ? { kind: "document", documentId } : { kind: "unknown" };
    }
  }
  if (name.startsWith("private-user-")) {
    const userId = name.slice("private-user-".length);
    return uuid.test(userId) ? { kind: "user", userId } : { kind: "unknown" };
  }
  return { kind: "unknown" };
}

export function canAccessChannel(request: ChannelRequest, actor: ChannelActor, document?: ChannelDocument | null): boolean {
  if (actor.status !== "active") return false;
  if (request.kind === "user") return request.userId === actor.id;
  if (request.kind === "admin") return admins.has(actor.role);
  if (request.kind !== "document" || !document || document.deletedAt || document.status === "deleted") return false;
  if (document.authorId === actor.id || admins.has(actor.role)) return true;
  if (document.status !== "approved") return false;
  if (document.visibility === "public") return true;
  return document.visibility === "institution" && !!document.institutionId && document.institutionId === actor.institutionId;
}
