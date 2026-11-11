import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";

export default async function CourseCodesAdminPage() {
  async function handleBulkImport() {
    "use server";
    const s = await auth();
    if (!["admin","super_admin"].includes((s?.user as any)?.role)) return;
    // CSV parsing happens in scripts/bulk-import-courses.ts
    // Here we accept manual entry
    revalidatePath("/admin/infrastructure/course-codes");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">Course Codes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage course codes for document tagging and search faceting
        </p>
      </div>

      {/* Bulk import */}
      <div className="p-5 bg-card border border-border rounded-2xl space-y-4">
        <h2 className="font-semibold text-foreground text-sm">Bulk Import via CSV</h2>
        <p className="text-xs text-muted-foreground">
          Upload a CSV file with columns: <code className="font-mono bg-secondary px-1.5 py-0.5 rounded">code, name, institution_id, faculty</code>
        </p>
        <form action={handleBulkImport} className="space-y-3">
          <input
            type="file"
            name="csv"
            accept=".csv"
            className="block w-full text-sm text-muted-foreground
                       file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0
                       file:text-sm file:font-medium file:bg-primary file:text-primary-foreground
                       hover:file:bg-primary/90 file:cursor-pointer"
          />
          <button type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            Import CSV
          </button>
        </form>
      </div>

      {/* Script instructions */}
      <div className="p-5 bg-secondary/30 border border-border rounded-2xl space-y-3">
        <h2 className="font-semibold text-foreground text-sm">CLI Bulk Import</h2>
        <p className="text-xs text-muted-foreground">
          For large imports, use the CLI script which handles deduplication and progress reporting:
        </p>
        <pre className="bg-background rounded-xl p-4 text-xs font-mono text-muted-foreground overflow-x-auto">
          {`npx tsx scripts/bulk-import-courses.ts \\\n  --file ./courses.csv \\\n  --institution uct`}
        </pre>
      </div>
    </div>
  );
}
