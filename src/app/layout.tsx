import type { Metadata, Viewport } from "next";
import { Inter, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth/config";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TanstackQueryProvider } from "@/components/layouts/TanstackQueryProvider";
import { PostHogProvider } from "@/components/layouts/PostHogProvider";

// ── Fonts ─────────────────────────────────────────────────────────────────────

const geist = Geist({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    template: "%s — getpidief",
    default: "getpidief — The Academic Resource Network",
  },
  description:
    "Discover, share, and study with millions of verified academic resources — curated by students, trusted by scholars.",
  keywords: [
    "academic resources",
    "past exams",
    "lecture notes",
    "study materials",
    "university",
    "students",
    "research papers",
    "getpidief",
  ],
  authors: [{ name: "getpidief" }],
  creator: "getpidief",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://getpidief.me"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://getpidief.me",
    siteName: "getpidief",
    title: "getpidief — The Academic Resource Network",
    description:
      "Discover, share, and study with millions of verified academic resources.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "getpidief",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@getpidief",
    creator: "@getpidief",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "getpidief",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#060C19",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// ── Root Layout ───────────────────────────────────────────────────────────────

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${inter.variable} ${geistMono.variable}`}
    >
      <body className="bg-void text-primary antialiased">
        <SessionProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <TanstackQueryProvider>
              <PostHogProvider>
                {children}

                {/* 🔥 Sonner Toaster */}
                <Toaster
                  position="top-right"
                  richColors
                  closeButton
                  toastOptions={{
                    className: "font-body",
                  }}
                />
              </PostHogProvider>
            </TanstackQueryProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}