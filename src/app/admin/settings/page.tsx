import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";
import { redis } from "@/lib/redis/client";

export default async function AdminSettingsPage() {
  const settings = redis ? await redis.get<Record<string, any>>("system:settings") ?? {} : {};

  async function saveSettings(formData: FormData): Promise<void> {
    "use server";
    const s = await auth();
    if (!["admin", "super_admin"].includes((s?.user as any)?.role)) return;

    if (redis) {
      try {
        await redis.set("system:settings", {
          maintenanceMode:    formData.get("maintenanceMode")    === "on",
          allowRegistrations: formData.get("allowRegistrations") !== "off",
          requireEmailVerify: formData.get("requireEmailVerify") === "on",
          maxUploadSizeMB:    parseInt(formData.get("maxUploadSizeMB") as string) || 50,
          defaultVisibility:  formData.get("defaultVisibility") as string || "public",
          announcementBanner: formData.get("announcementBanner") as string || "",
        });
      } catch (error) {
        console.warn("[Admin] Failed to save settings:", error);
      }
    }
    revalidatePath("/admin/settings");
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight">System Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide configuration</p>
      </div>

      <form action={saveSettings} className="space-y-6">
        {/* Platform */}
        <div className="space-y-4 p-5 bg-secondary/30 rounded-2xl border border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform</p>

          {[
            { name: "maintenanceMode",    label: "Maintenance Mode",      desc: "Redirect all visitors to a maintenance page",           warning: true  },
            { name: "allowRegistrations", label: "Allow Registrations",   desc: "New users can create accounts",                        warning: false },
            { name: "requireEmailVerify", label: "Require Email Verify",  desc: "Users must verify email before accessing the archive", warning: false },
          ].map((s) => (
            <label key={s.name} className={`flex items-center justify-between gap-4 p-3 rounded-xl border cursor-pointer transition-colors ${
              s.warning ? "border-destructive/20 bg-destructive/5 hover:bg-destructive/10" : "border-border hover:bg-secondary"
            }`}>
              <div>
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <input
                type="checkbox"
                name={s.name}
                defaultChecked={settings[s.name] ?? (s.name === "allowRegistrations")}
                className="w-5 h-5 rounded accent-primary cursor-pointer"
              />
            </label>
          ))}
        </div>

        {/* Upload */}
        <div className="space-y-4 p-5 bg-secondary/30 rounded-2xl border border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uploads</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Max Upload Size (MB)</label>
            <input type="number" name="maxUploadSizeMB" defaultValue={settings.maxUploadSizeMB ?? 50}
              min={1} max={200}
              className="w-32 h-10 px-3 bg-secondary border border-border rounded-xl text-sm text-foreground
                         outline-none focus:border-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Default Visibility</label>
            <select name="defaultVisibility" defaultValue={settings.defaultVisibility ?? "public"}
              className="h-10 px-3 bg-secondary border border-border rounded-xl text-sm text-foreground outline-none">
              <option value="public">Public</option>
              <option value="institution">Institution only</option>
            </select>
          </div>
        </div>

        {/* Announcement banner */}
        <div className="space-y-3 p-5 bg-secondary/30 rounded-2xl border border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Announcement Banner</p>
          <textarea name="announcementBanner" rows={2}
            defaultValue={settings.announcementBanner ?? ""}
            placeholder="Leave blank to hide the banner. Shown to all logged-in users."
            className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-sm
                       text-foreground placeholder:text-muted-foreground resize-none outline-none
                       focus:border-ring" />
        </div>

        <button type="submit"
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold
                     hover:bg-primary/90 transition-colors">
          Save Settings
        </button>
      </form>
    </div>
  );
}
