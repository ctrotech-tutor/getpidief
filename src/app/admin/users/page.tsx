import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/client";
import { users, auditLogs } from "@/lib/db/schema";
import { eq, desc, count, or, ilike, and } from "drizzle-orm";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { revalidatePath } from "next/cache";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    page?: string;
  }>;
}

const ROLES = ["student", "contributor", "moderator", "admin"] as const;

export default async function UsersAdminPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const q = params.q ?? "";
  const role = params.role;
  const status = params.status;
  const page = parseInt(params.page ?? "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const conditions: any[] = [];

  if (q) {
    conditions.push(
      or(
        ilike(users.displayName, `%${q}%`),
        ilike(users.username, `%${q}%`)
      )
    );
  }

  if (role) conditions.push(eq(users.role, role as any));
  if (status) conditions.push(eq(users.status, status as any));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db.query.users.findMany({
      where: whereClause,
      orderBy: [desc(users.createdAt)],
      limit,
      offset,
      with: {
        institution: { columns: { name: true } },
      },
    }),
    db.select({ count: count() }).from(users).where(whereClause ?? undefined),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  async function changeRole(formData: FormData) {
    "use server";

    const s = await auth();
    if (!s?.user?.id) return;

    const adminRole = (s.user as any).role;
    if (!["admin", "super_admin"].includes(adminRole)) return;

    const userId = formData.get("userId") as string;
    const newRole = formData.get("role") as any;

    const prev = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true },
    });

    await db
      .update(users)
      .set({ role: newRole, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await db.insert(auditLogs).values({
      adminId: s.user.id,
      action: "user_role_changed",
      entityType: "user",
      entityId: userId,
      beforeState: { role: prev?.role },
      afterState: { role: newRole },
    });

    revalidatePath("/admin/users");
  }

  async function suspendUser(formData: FormData) {
    "use server";

    const s = await auth();
    if (!s?.user?.id) return;

    const userId = formData.get("userId") as string;
    const reason = formData.get("reason") as string;

    await db
      .update(users)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(users.id, userId));

    await db.insert(auditLogs).values({
      adminId: s.user.id,
      action: "user_suspended",
      entityType: "user",
      entityId: userId,
      afterState: { status: "suspended", reason },
    });

    revalidatePath("/admin/users");
  }

  async function reinstateUser(formData: FormData) {
    "use server";

    const s = await auth();
    if (!s?.user?.id) return;

    const userId = formData.get("userId") as string;

    await db
      .update(users)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(users.id, userId));

    await db.insert(auditLogs).values({
      adminId: s.user.id,
      action: "user_unsuspended",
      entityType: "user",
      entityId: userId,
      afterState: { status: "active" },
    });

    revalidatePath("/admin/users");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">
          User Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {formatNumber(total)} total scholars
        </p>
      </div>

      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or username…"
          className="flex-1 min-w-50 h-10 px-3.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
        />

        <select
          name="role"
          defaultValue={role ?? ""}
          className="h-10 px-3 text-sm bg-secondary border border-border rounded-xl text-foreground outline-none"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 px-3 text-sm bg-secondary border border-border rounded-xl text-foreground outline-none"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending_verification">Pending</option>
        </select>

        <button
          type="submit"
          className="px-4 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Search
        </button>
      </form>

      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              {["User", "Institution", "Role", "Status", "Joined", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/u/${u.username}`}
                    target="_blank"
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {u.displayName}
                  </Link>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </td>

                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {(u as any).institution?.name ?? "—"}
                </td>

                <td className="px-4 py-3">
                  <form action={changeRole} className="inline-flex items-center gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <select
                      name="role"
                      defaultValue={u.role}
                      className="text-xs bg-secondary border border-border rounded-lg px-2 py-1 text-foreground outline-none cursor-pointer"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="text-xs px-2.5 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Save
                    </button>
                  </form>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.status === "active"
                        ? "bg-(--emerald-subtle) text-(--emerald)"
                        : u.status === "suspended"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>

                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatDate(u.createdAt)}
                </td>

                <td className="px-4 py-3">
                  {u.status === "active" && (
                    <form action={suspendUser} className="inline-flex gap-2 items-center">
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        type="text"
                        name="reason"
                        placeholder="Reason…"
                        required
                        className="h-7 px-2 text-xs bg-secondary border border-border rounded-lg w-28 outline-none"
                      />
                      <button
                        type="submit"
                        className="text-xs px-2.5 py-1 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                      >
                        Suspend
                      </button>
                    </form>
                  )}

                  {u.status === "suspended" && (
                    <form action={reinstateUser}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button
                        type="submit"
                        className="text-xs px-2.5 py-1 bg-(--emerald-subtle) border border-(--emerald)/20 text-(--emerald) rounded-lg hover:bg-(--emerald)/20 transition-colors"
                      >
                        Reinstate
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}