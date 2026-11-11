import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { authSessions, authAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { formatDateTime } from "@/lib/utils/format";

export default async function SecuritySettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Check if user has a password (credentials account)
  const credAccount = await db.query.authAccounts.findFirst({
    where: and(eq(authAccounts.userId, userId), eq(authAccounts.provider, "credentials")),
    columns: { providerAccountId: true },
  });
  const hasPassword = !!credAccount;

  // Active sessions
  const activeSessions = await db.query.authSessions.findMany({
    where: eq(authSessions.userId, userId),
    columns: { sessionToken: true, userAgent: true, ipAddress: true, createdAt: true, expires: true },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
    limit: 10,
  });

  async function changePassword(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user?.id) return;

    const current    = formData.get("currentPassword") as string;
    const newPass    = formData.get("newPassword") as string;
    const confirmNew = formData.get("confirmNew") as string;

    if (!current || !newPass || !confirmNew) return;
    if (newPass !== confirmNew) return;
    if (newPass.length < 8) return;

    const account = await db.query.authAccounts.findFirst({
      where: and(eq(authAccounts.userId, s.user.id), eq(authAccounts.provider, "credentials")),
    });
    if (!account) return;

    const valid = await bcrypt.compare(current, account.providerAccountId);
    if (!valid) return;

    const hash = await bcrypt.hash(newPass, 12);
    await db.update(authAccounts)
      .set({ providerAccountId: hash })
      .where(and(eq(authAccounts.userId, s.user.id), eq(authAccounts.provider, "credentials")));

    revalidatePath("/settings/security");
  }

  async function revokeAllSessions() {
    "use server";
    const s = await auth();
    if (!s?.user?.id) return;
    await db.delete(authSessions).where(eq(authSessions.userId, s.user.id));
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading font-semibold text-foreground text-lg mb-1">Security</h2>
        <p className="text-sm text-muted-foreground">Manage your password and active sessions.</p>
      </div>

      {/* Password */}
      {hasPassword && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
          <form action={changePassword} className="space-y-4">
            <PasswordField id="currentPassword" name="currentPassword" label="Current Password" autoComplete="current-password" />
            <PasswordField id="newPassword"     name="newPassword"     label="New Password"     autoComplete="new-password" />
            <PasswordField id="confirmNew"      name="confirmNew"      label="Confirm New Password" autoComplete="new-password" />
            <button type="submit"
              className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium
                         hover:bg-primary/90 transition-colors">
              Update Password
            </button>
          </form>
        </section>
      )}

      {!hasPassword && (
        <section className="p-4 bg-secondary/50 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground">
            You signed in with Google. No password is set for this account.
          </p>
        </section>
      )}

      {/* Active sessions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
          <form action={revokeAllSessions}>
            <button type="submit"
              className="text-xs text-destructive hover:text-destructive/80 transition-colors">
              Sign out all devices
            </button>
          </form>
        </div>

        <div className="space-y-2">
          {activeSessions.map((s) => (
            <div key={s.sessionToken.slice(0, 8)}
              className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl border border-border">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm">💻</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{s.userAgent ?? "Unknown device"}</p>
                <p className="text-xs text-muted-foreground">
                  {s.ipAddress ?? "Unknown IP"} · Signed in {formatDateTime(s.createdAt)}
                </p>
              </div>
              <span className="w-2 h-2 rounded-full bg-[var(--emerald)] shrink-0" title="Active" />
            </div>
          ))}
          {activeSessions.length === 0 && (
            <p className="text-sm text-muted-foreground">No active sessions found.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function PasswordField({
  id, name, label, autoComplete,
}: {
  id: string; name: string; label: string; autoComplete: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <input id={id} name={name} type="password" autoComplete={autoComplete} required
        className="w-full h-11 px-3.5 rounded-xl bg-secondary border border-border text-sm
                   outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all" />
    </div>
  );
}