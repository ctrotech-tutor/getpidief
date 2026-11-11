import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const ACADEMIC_LEVELS = [
  { value: "undergraduate",  label: "Undergraduate"  },
  { value: "postgraduate",   label: "Postgraduate"   },
  { value: "doctorate",      label: "Doctorate"      },
  { value: "professional",   label: "Professional"   },
  { value: "other",          label: "Other"          },
];

export default async function AcademicSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      institutionId: true, faculty: true, major: true,
      department: true, academicLevel: true, academicYear: true, graduationYear: true,
    },
    with: {
      institution: { columns: { id: true, name: true } },
    },
  });

  async function saveAcademic(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user?.id) return;

    await db.update(users).set({
      faculty:       (formData.get("faculty") as string) || null,
      major:         (formData.get("major")   as string) || null,
      department:    (formData.get("department") as string) || null,
      academicLevel: (() => {
        const v = formData.get("academicLevel");
        if (!v || typeof v !== "string") return null;
        return v as NonNullable<typeof users.$inferInsert["academicLevel"]>;
      })(),
      academicYear:  formData.get("academicYear") ? parseInt(formData.get("academicYear") as string, 10) : null,
      updatedAt:     new Date(),
    }).where(eq(users.id, s.user.id));

    revalidatePath("/settings/academic");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-semibold text-foreground text-lg mb-1">Academic Profile</h2>
        <p className="text-sm text-muted-foreground">
          Your academic details help us surface relevant resources.
        </p>
      </div>

      {user?.institution && (
        <div className="p-3 bg-secondary/50 rounded-xl border border-border text-sm">
          <span className="text-muted-foreground">Institution: </span>
          <span className="font-medium text-foreground">{user.institution?.name}</span>
          <span className="text-muted-foreground ml-2 text-xs">(Change via onboarding)</span>
        </div>
      )}

      <form action={saveAcademic} className="space-y-5">
        <Field id="faculty"    name="faculty"    label="Faculty / School"
          defaultValue={user?.faculty ?? ""} placeholder="e.g. Engineering & Technology" />
        <Field id="major"      name="major"      label="Major / Programme"
          defaultValue={user?.major ?? ""} placeholder="e.g. Computer Science" />
        <Field id="department" name="department" label="Department"
          defaultValue={user?.department ?? ""} placeholder="e.g. Software Engineering" />

        <div className="space-y-1.5">
          <label htmlFor="academicLevel" className="text-sm font-medium text-foreground">Academic Level</label>
          <select id="academicLevel" name="academicLevel" defaultValue={user?.academicLevel ?? ""}
            className="w-full h-11 px-3.5 rounded-xl bg-secondary border border-border text-sm
                       text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all">
            <option value="">Select level…</option>
            {ACADEMIC_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="academicYear" className="text-sm font-medium text-foreground">Current Year</label>
            <select id="academicYear" name="academicYear" defaultValue={user?.academicYear?.toString() ?? ""}
              className="w-full h-11 px-3.5 rounded-xl bg-secondary border border-border text-sm
                         outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all">
              <option value="">Select…</option>
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </div>
          <Field id="graduationYear" name="graduationYear" label="Graduation Year" type="number"
            defaultValue={user?.graduationYear?.toString() ?? ""} placeholder={String(new Date().getFullYear() + 2)} />
        </div>

        <div className="flex justify-end">
          <button type="submit"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium
                       hover:bg-primary/90 transition-colors">
            Save Academic Info
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ id, name, label, defaultValue, placeholder, type = "text" }: {
  id: string; name: string; label: string;
  defaultValue?: string; placeholder?: string; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <input id={id} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder}
        className="w-full h-11 px-3.5 rounded-xl bg-secondary border border-border text-sm
                   text-foreground placeholder:text-muted-foreground outline-none
                   hover:border-ring/40 focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all" />
    </div>
  );
}