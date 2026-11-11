import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { timeAgo } from "@/lib/utils/format";
import Link from "next/link";

const NOTIF_ICONS: Record<string, string> = {
  like:                   "♥",
  comment:                "💬",
  comment_reply:          "↩️",
  follow:                 "👤",
  document_approved:      "✅",
  document_rejected:      "❌",
  badge_earned:           "🏅",
  new_upload_from_following: "📄",
  mention:                "@",
  system_announcement:    "📢",
  default:                "🔔",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const filter = params.filter ?? "all";

  const conditions = [eq(notifications.recipientId, session.user.id)];
  if (filter === "unread") conditions.push(eq(notifications.isRead, false));

  const items = await db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: [desc(notifications.createdAt)],
    limit:   50,
    with: {
      sender: {
        columns: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">{unreadCount} unread</p>
          )}
        </div>

        {unreadCount > 0 && (
          <form action={async () => {
            "use server";
            const s = await auth();
            if (!s?.user?.id) return;
            await db.update(notifications)
              .set({ isRead: true, readAt: new Date() })
              .where(and(eq(notifications.recipientId, s.user.id), eq(notifications.isRead, false)));
          }}>
            <button
              type="submit"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {["all", "unread"].map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/notifications" : `/notifications?filter=${f}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {f}
          </Link>
        ))}
      </div>

      {/* Notifications list */}
      {items.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-2xl">
            🔔
          </div>
          <p className="text-foreground font-medium">All caught up!</p>
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((n) => {
            const icon = NOTIF_ICONS[n.type] ?? NOTIF_ICONS.default;
            const sender = n.sender;

            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-colors ${
                  !n.isRead ? "bg-primary/5 border border-primary/10" : "hover:bg-secondary/50"
                }`}
              >
                {/* Icon */}
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm shrink-0">
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">
                    {sender && (
                      <Link href={`/u/${sender.username}`} className="font-medium hover:text-primary transition-colors">
                        {sender.displayName}
                      </Link>
                    )}{" "}
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
                </div>

                {/* Unread dot */}
                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" aria-label="Unread" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}