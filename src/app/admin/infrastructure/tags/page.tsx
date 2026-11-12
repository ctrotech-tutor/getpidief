import { db } from "@/lib/db/client";
import { tags } from "@/lib/db/schema";
import { eq, desc, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { formatNumber } from "@/lib/utils/format";
import { KEYS, invalidateCache } from "@/lib/redis/client";

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function TagsAdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q      = params.q ?? "";
  const page   = parseInt(params.page ?? "1", 10);
  const limit  = 30;
  const offset = (page - 1) * limit;

  const rows = await db.query.tags.findMany({
    where: q ? ilike(tags.name, `%${q}%`) : undefined,
    orderBy: [desc(tags.usageCount)],
    limit,
    offset,
  });

  async function toggleTag(formData: FormData) {
    "use server";
    const id       = formData.get("id") as string;
    const isActive = formData.get("isActive") === "true";
    await db.update(tags).set({ isActive: !isActive }).where(eq(tags.id, id));
    await invalidateCache(KEYS.tagsPopular(100));
    revalidatePath("/admin/infrastructure/tags");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">Tags</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage document tags - deactivate spam, merge duplicates</p>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-3">
        <input name="q" defaultValue={q} placeholder="Search tags…"
          className="flex-1 max-w-sm h-10 px-3.5 bg-secondary border border-border rounded-xl text-sm outline-none focus:border-ring placeholder:text-muted-foreground text-foreground" />
        <button type="submit" className="px-4 h-10 bg-primary text-primary-foreground rounded-xl text-sm font-medium">Search</button>
      </form>

      {/* Tags grid */}
      <div className="flex flex-wrap gap-2">
        {rows.map((tag) => (
          <div key={tag.id}
            className={`flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full border text-xs font-medium transition-colors ${
              tag.isActive
                ? "bg-secondary border-border text-foreground"
                : "bg-secondary/30 border-border/50 text-muted-foreground line-through"
            }`}
          >
            <span>{tag.name}</span>
            <span className="text-muted-foreground">·{formatNumber(tag.usageCount)}</span>
            <form action={toggleTag} className="inline-flex">
              <input type="hidden" name="id" value={tag.id} />
              <input type="hidden" name="isActive" value={String(tag.isActive)} />
              <button type="submit"
                className="w-5 h-5 rounded-full hover:bg-border flex items-center justify-center transition-colors"
                title={tag.isActive ? "Deactivate" : "Activate"}
              >
                {tag.isActive
                  ? <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden><path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  : <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden><path d="M4 1v6M1 4h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                }
              </button>
            </form>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-muted-foreground text-sm py-8">No tags found.</p>
        )}
      </div>
    </div>
  );
}
