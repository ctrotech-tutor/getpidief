import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const userId = session.user.id;
  const user = session.user as any;

  // Private channels: user can only auth to their own channel
  if (channelName.startsWith("private-user-")) {
    const channelUserId = channelName.replace("private-user-", "");
    if (channelUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Private document channels: any authenticated user can subscribe
  if (channelName.startsWith("private-document-")) {
    // allow all authenticated users
  }

  // Presence channels: include user data
  if (channelName.startsWith("presence-")) {
    const presenceData = {
      user_id: userId,
      user_info: {
        name: user.displayName ?? user.name,
        avatar: user.avatarUrl ?? user.image,
        username: user.username,
      },
    };
    const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
    return NextResponse.json(authResponse);
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
