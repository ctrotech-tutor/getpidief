import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const SETTINGS_NAV = [
  { href: "/settings",              label: "Profile",        icon: "👤" },
  { href: "/settings/academic",     label: "Academic",       icon: "🎓" },
  { href: "/settings/security",     label: "Security",       icon: "🔒" },
  { href: "/settings/notifications",label: "Notifications",  icon: "🔔" },
  { href: "/settings/privacy",      label: "Privacy",        icon: "🛡️" },
];

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-screen-lg mx-auto px-4 lg:px-6 py-8">
      <h1 className="font-heading font-bold text-foreground text-2xl tracking-tight mb-8">Settings</h1>

      <div className="flex gap-8 flex-col sm:flex-row">
        {/* Sidebar nav */}
        <nav className="sm:w-52 shrink-0">
          <div className="space-y-0.5">
            {SETTINGS_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                           text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-card border border-border rounded-2xl p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
