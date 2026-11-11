import type { ReactNode } from "react";

export const metadata = { title: "getpidief social preview", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body style={{ margin: 0 }}>{children}</body></html>;
}
