import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const NOTIF_ROWS = [
  { key: "like",       label: "Likes",              desc: "When someone likes your document"      },
  { key: "comment",    label: "Comments",            desc: "When someone comments on your document"},
  { key: "follow",     label: "New Followers",       desc: "When someone follows you"              },
  { key: "approved",   label: "Document Approved",   desc: "When your upload is approved"          },
  { key: "rejected",   label: "Document Rejected",   desc: "When your upload is rejected"          },
  { key: "new_upload", label: "New Uploads",         desc: "From contributors you follow"          },
  { key: "badge",      label: "Badge Earned",        desc: "When you earn a new badge"             },
] as const;

export default async function NotificationSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { notificationPreferences: true },
  });

  const prefs = (user?.notificationPreferences as Record<string, boolean>) ?? {};

  async function savePreferences(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user?.id) return;

    const updated: Record<string, boolean> = {};
    NOTIF_ROWS.forEach(({ key }) => {
      updated[`${key}_inapp`] = formData.get(`${key}_inapp`) === "on";
      updated[`${key}_email`] = formData.get(`${key}_email`) === "on";
      updated[`${key}_push`]  = formData.get(`${key}_push`)  === "on";
    });
    updated["weekly_digest"] = formData.get("weekly_digest") === "on";

    await db.update(users)
      .set({ notificationPreferences: updated, updatedAt: new Date() })
      .where(eq(users.id, s.user.id));

    revalidatePath("/settings/notifications");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-semibold text-foreground text-lg mb-1">Notifications</h2>
        <p className="text-sm text-muted-foreground">Choose how and when you want to be notified.</p>
      </div>

      <form action={savePreferences}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 pr-6 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Notification
                </th>
                {["In-app", "Email", "Push"].map((ch) => (
                  <th key={ch} className="py-3 px-3 text-center font-medium text-muted-foreground text-xs uppercase tracking-wider w-20">
                    {ch}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {NOTIF_ROWS.map(({ key, label, desc }) => (
                <tr key={key} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3 pr-6">
                    <p className="font-medium text-foreground text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </td>
                  {(["inapp", "email", "push"] as const).map((ch) => (
                    <td key={ch} className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        name={`${key}_${ch}`}
                        defaultChecked={prefs[`${key}_${ch}`] !== false}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Weekly digest special row */}
              <tr className="hover:bg-secondary/30 transition-colors">
                <td className="py-3 pr-6">
                  <p className="font-medium text-foreground text-sm">Weekly Digest</p>
                  <p className="text-xs text-muted-foreground">Summary email every Monday</p>
                </td>
                <td />
                <td className="py-3 px-3 text-center">
                  <input
                    type="checkbox"
                    name="weekly_digest"
                    defaultChecked={prefs["weekly_digest"] !== false}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          <button type="submit"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium
                       hover:bg-primary/90 transition-colors">
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}