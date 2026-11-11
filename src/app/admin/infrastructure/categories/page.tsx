import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { categoriesRepository } from "@/lib/db/repositories/categories";

const CATEGORY_COLORS = [
  "#2563EB","#7C3AED","#10B981","#F59E0B","#EF4444",
  "#EC4899","#06B6D4","#6366F1","#84CC16","#F97316",
];

export default async function CategoriesAdminPage() {
  const rows = await db.query.categories.findMany({
    orderBy: [asc(categories.sortOrder)],
  });

  async function toggleCategory(formData: FormData) {
    "use server";
    const id       = formData.get("id") as string;
    const isActive = formData.get("isActive") === "true";
    await db.update(categories).set({ isActive: !isActive }).where(eq(categories.id, id));
    await categoriesRepository.invalidateCache();
    revalidatePath("/admin/infrastructure/categories");
  }

  async function createCategory(formData: FormData) {
    "use server";
    const s = await auth();
    if (!["admin","super_admin"].includes((s?.user as any)?.role)) return;

    const name  = (formData.get("name") as string).trim();
    const color = formData.get("color") as string;
    const icon  = formData.get("icon")  as string;
    if (!name) return;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await db.insert(categories).values({ name, slug, color, icon: icon || null, isActive: true, sortOrder: rows.length }).onConflictDoNothing();
    await categoriesRepository.invalidateCache();
    revalidatePath("/admin/infrastructure/categories");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">Categories</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage document categories and subjects</p>
      </div>

      {/* Add new */}
      <form action={createCategory} className="flex flex-wrap gap-3 p-4 bg-card border border-border rounded-2xl">
        <input name="name" placeholder="Category name *" required
          className="flex-1 min-w-[180px] h-10 px-3 bg-secondary border border-border rounded-xl text-sm outline-none focus:border-ring text-foreground placeholder:text-muted-foreground" />
        <input name="icon" placeholder="Icon (emoji)" maxLength={4}
          className="w-24 h-10 px-3 bg-secondary border border-border rounded-xl text-sm outline-none focus:border-ring text-foreground text-center placeholder:text-muted-foreground" />
        <select name="color" className="h-10 px-3 bg-secondary border border-border rounded-xl text-sm outline-none text-foreground">
          {CATEGORY_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" className="px-4 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          Add Category
        </button>
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              {["Name", "Slug", "Docs", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((cat) => (
              <tr key={cat.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                    <span className="font-medium text-foreground">{cat.icon && `${cat.icon} `}{cat.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{cat.slug}</td>
                <td className="px-4 py-3 text-foreground">{cat.documentCount}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.isActive ? "bg-[var(--emerald-subtle)] text-[var(--emerald)]" : "bg-secondary text-muted-foreground"}`}>
                    {cat.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <form action={toggleCategory} className="inline-flex">
                    <input type="hidden" name="id" value={cat.id} />
                    <input type="hidden" name="isActive" value={String(cat.isActive)} />
                    <button type="submit" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {cat.isActive ? "Deactivate" : "Activate"}
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
