import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { signOut } from "@/lib/auth/auth";

export default async function DangerZonePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  async function deactivateAccount() {
    "use server";
    const s = await auth();
    if (!s?.user?.id) return;
    await db.update(users).set({ status: "deactivated", updatedAt: new Date() }).where(eq(users.id, s.user.id));
    await signOut({ redirectTo: "/login" });
  }

  async function requestDeletion() {
    "use server";
    const s = await auth();
    if (!s?.user?.id) return;
    // Schedule deletion in 7 days via Inngest
    await inngest.send({ name: "user/deletion-requested", data: { userId: s.user.id } });
    await db.update(users).set({ status: "deactivated", updatedAt: new Date() }).where(eq(users.id, s.user.id));
    await signOut({ redirectTo: "/login?deleted=1" });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading font-semibold text-foreground text-lg mb-1">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">These actions are permanent and cannot be undone.</p>
      </div>

      {/* Deactivate */}
      <div className="p-5 rounded-2xl border border-[var(--amber)]/30 bg-[var(--amber)]/5 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground">Deactivate Account</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Temporarily disable your account. Your data is preserved and you can reactivate by signing in.
          </p>
        </div>
        <form action={deactivateAccount}>
          <button type="submit"
            className="px-4 py-2 text-sm font-medium rounded-xl border border-[var(--amber)]/30
                       text-[var(--amber)] bg-[var(--amber)]/10 hover:bg-[var(--amber)]/20 transition-colors">
            Deactivate My Account
          </button>
        </form>
      </div>

      {/* Delete */}
      <div className="p-5 rounded-2xl border border-destructive/30 bg-destructive/5 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground">Delete Account</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Permanently delete your account and all associated data. You have a 7-day grace period to cancel
            by contacting support. Your public contributions will be anonymised, not deleted.
          </p>
        </div>
        <form action={requestDeletion}>
          <button type="submit"
            className="px-4 py-2 text-sm font-medium rounded-xl border border-destructive/30
                       text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors">
            Request Account Deletion
          </button>
        </form>
      </div>
    </div>
  );
}