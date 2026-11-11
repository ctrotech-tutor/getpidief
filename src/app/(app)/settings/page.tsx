import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sanitizeText } from "@/lib/utils/sanitize";
import { usersRepository } from "@/lib/db/repositories/users";

export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { username: true, displayName: true, bio: true, externalLinks: true, avatarUrl: true },
  });

  if (!user) redirect("/login");

  async function updateProfile(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user?.id) return;

    const displayName = formData.get("displayName") as string;
    const bio         = formData.get("bio") as string;
    const username    = formData.get("username") as string;

    // Username validation
    if (username && !/^[a-z0-9_]{3,50}$/.test(username)) return;

    // Check username availability if changed
    if (username && username !== user?.username) {
      const available = await usersRepository.isUsernameAvailable(username, s.user.id);
      if (!available) return;
    }

    await db.update(users).set({
      displayName:  sanitizeText(displayName),
      bio:          bio ? sanitizeText(bio) : null,
      username:     username || undefined,
      externalLinks: {
        linkedin:    formData.get("linkedin") as string || null,
        researchgate:formData.get("researchgate") as string || null,
        orcid:       formData.get("orcid") as string || null,
        website:     formData.get("website") as string || null,
      },
      updatedAt: new Date(),
    }).where(eq(users.id, s.user.id));

    revalidatePath("/settings");
    revalidatePath(`/u/${username}`);
  }

  const links = (user.externalLinks as Record<string, string | null> | null) ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-semibold text-foreground text-lg mb-1">Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your public profile information.</p>
      </div>

      <form action={updateProfile} className="space-y-5">
        <Field
          id="displayName"
          name="displayName"
          label="Display Name"
          defaultValue={user.displayName}
          placeholder="Your full name"
          required
        />
        <Field
          id="username"
          name="username"
          label="Username"
          defaultValue={user.username}
          placeholder="lowercase_only"
          note="Lowercase letters, numbers, underscores only (3–50 chars)"
        />
        <div className="space-y-1.5">
          <label htmlFor="bio" className="text-sm font-medium text-foreground">Bio</label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={user.bio ?? ""}
            placeholder="Tell the community about yourself…"
            maxLength={500}
            className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm
                       text-foreground placeholder:text-muted-foreground resize-none outline-none
                       focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
          />
        </div>

        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-sm font-semibold text-foreground">External Links</p>
          {[
            { name: "linkedin",    label: "LinkedIn URL",     placeholder: "https://linkedin.com/in/…" },
            { name: "researchgate",label: "ResearchGate URL", placeholder: "https://researchgate.net/…" },
            { name: "orcid",       label: "ORCID",            placeholder: "0000-0000-0000-0000" },
            { name: "website",     label: "Personal Website", placeholder: "https://yoursite.com" },
          ].map((link) => (
            <Field
              key={link.name}
              id={link.name}
              name={link.name}
              label={link.label}
              defaultValue={links[link.name] ?? ""}
              placeholder={link.placeholder}
              type="url"
            />
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium
                       hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  id, name, label, defaultValue, placeholder, note, required, type = "text",
}: {
  id: string; name: string; label: string; defaultValue?: string;
  placeholder?: string; note?: string; required?: boolean; type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full h-11 px-3.5 rounded-xl bg-secondary border border-border text-sm
                   text-foreground placeholder:text-muted-foreground outline-none
                   hover:border-ring/40 focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
      />
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}