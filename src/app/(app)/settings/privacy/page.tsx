import { SeenHistorySettings } from "@/components/features/feed/SeenHistorySettings";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export default async function PrivacySettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { privacySettings: true },
  });

  const prefs = (user?.privacySettings as Record<string, boolean | string>) ?? {};

  async function savePrivacy(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user?.id) return;

    await db.update(users).set({
      privacySettings: {
        profile_visibility:      formData.get("profile_visibility") as string || "public",
        show_institution:        formData.get("show_institution")        === "on",
        show_library:            formData.get("show_library")            === "on",
        show_activity_in_pulse:  formData.get("show_activity_in_pulse")  === "on",
        allow_messages:          formData.get("allow_messages")          === "on",
      },
      updatedAt: new Date(),
    }).where(eq(users.id, s.user.id));

    revalidatePath("/settings/privacy");
  }

  const visOptions = [
    { value: "public",      label: "Public",      desc: "Anyone can view your profile" },
    { value: "institution", label: "Institution",  desc: "Only people from your institution" },
    { value: "private",     label: "Private",      desc: "Only you can see your profile" },
  ];

  const toggles = [
    { name: "show_institution",       label: "Show my institution",       desc: "Display your university on your profile" },
    { name: "show_library",           label: "Show my library",           desc: "Let others see your saved documents" },
    { name: "show_activity_in_pulse", label: "Appear in Academic Pulse",  desc: "Your uploads will show in the live activity feed" },
    { name: "allow_messages",         label: "Allow messages",            desc: "Let other scholars message you" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-semibold text-foreground text-lg mb-1">Privacy</h2>
        <p className="text-sm text-muted-foreground">Control who can see your information.</p>
      </div>

      <form action={savePrivacy} className="space-y-6">
        {/* Profile visibility */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Profile Visibility</p>
          {visOptions.map((opt) => (
            <label key={opt.value} className="flex items-center gap-3 p-3 rounded-xl border border-border
                                              cursor-pointer hover:bg-secondary/50 transition-colors">
              <input
                type="radio"
                name="profile_visibility"
                value={opt.value}
                defaultChecked={(prefs.profile_visibility ?? "public") === opt.value}
                className="w-4 h-4 accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Toggle switches */}
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-sm font-semibold text-foreground">Activity & Visibility</p>
          {toggles.map((t) => (
            <label key={t.name} className="flex items-center justify-between gap-4 p-3 rounded-xl
                                            border border-border cursor-pointer hover:bg-secondary/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <input
                type="checkbox"
                name={t.name}
                defaultChecked={(prefs[t.name] as boolean) !== false}
                className="w-5 h-5 rounded accent-primary cursor-pointer shrink-0"
              />
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <button type="submit"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium
                       hover:bg-primary/90 transition-colors">
            Save Privacy Settings
          </button>
        </div>
      </form>
      <SeenHistorySettings userId={session.user.id} />
    </div>
  );
}