import { db } from "@/lib/db/client";
import { institutions } from "@/lib/db/schema";
import { eq, desc, ilike } from "drizzle-orm";
import { formatNumber } from "@/lib/utils/format";
import { revalidatePath } from "next/cache";

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function UniversitiesAdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q      = params.q ?? "";
  const page   = parseInt(params.page ?? "1", 10);
  const limit  = 20;
  const offset = (page - 1) * limit;

  const rows = await db.query.institutions.findMany({
    where: q ? ilike(institutions.name, `%${q}%`) : undefined,
    orderBy: [desc(institutions.documentCount)],
    limit,
    offset,
  });

  async function toggleActive(formData: FormData) {
    "use server";
    const id       = formData.get("id") as string;
    const isActive = formData.get("isActive") === "true";
    await db.update(institutions).set({ isActive: !isActive }).where(eq(institutions.id, id));
    revalidatePath("/admin/infrastructure/universities");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">Universities</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage supported institutions</p>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-3">
        <input name="q" defaultValue={q} placeholder="Search universities…"
          className="flex-1 max-w-sm h-10 px-3.5 bg-secondary border border-border rounded-xl text-sm
                     outline-none focus:border-ring placeholder:text-muted-foreground text-foreground" />
        <button type="submit" className="px-4 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-medium">Search</button>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              {["Institution", "Country", "Type", "Documents", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((inst) => (
              <tr key={inst.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{inst.name}</p>
                  <p className="text-xs text-muted-foreground">{inst.slug}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{inst.country}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs capitalize">{inst.type}</td>
                <td className="px-4 py-3 text-foreground font-medium">{formatNumber(inst.documentCount)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    inst.isActive ? "bg-[var(--emerald-subtle)] text-[var(--emerald)]" : "bg-secondary text-muted-foreground"
                  }`}>
                    {inst.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <form action={toggleActive} className="inline-flex">
                    <input type="hidden" name="id" value={inst.id} />
                    <input type="hidden" name="isActive" value={String(inst.isActive)} />
                    <button type="submit" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {inst.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
