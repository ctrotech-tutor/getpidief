import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { documents, users } from "@/lib/db/schema";
import { canAccessChannel, parseChannel } from "@/lib/pusher/channel-access";
import { pusherServer } from "@/lib/pusher/server";

type SessionUserWithPresence = { displayName?: string | null; name?: string | null; avatarUrl?: string | null; image?: string | null; username?: string | null };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URLSearchParams(await req.text());
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");
  if (!socketId || !/^\d+\.\d+$/.test(socketId) || !channelName) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const channel = parseChannel(channelName);
  if (channel.kind === "unknown") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Read current permissions from the database, not stale session claims.
  const actor = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { id: true, role: true, status: true, institutionId: true },
  });
  if (!actor || actor.status !== "active") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const document = channel.kind === "document"
    ? await db.query.documents.findFirst({
        where: eq(documents.id, channel.documentId),
        columns: { authorId: true, status: true, visibility: true, institutionId: true, deletedAt: true },
      })
    : null;
  if (!canAccessChannel(channel, actor, document)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (channelName.startsWith("presence-")) {
    const user = session.user as SessionUserWithPresence;
    return NextResponse.json(pusherServer.authorizeChannel(socketId, channelName, {
      user_id: actor.id,
      user_info: { name: user.displayName ?? user.name, avatar: user.avatarUrl ?? user.image, username: user.username },
    }));
  }
  return NextResponse.json(pusherServer.authorizeChannel(socketId, channelName));
}
