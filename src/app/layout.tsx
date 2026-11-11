import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider, ThemeScript } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import { TanstackQueryProvider } from "@/components/layouts/TanstackQueryProvider";
import { PostHogProvider } from "@/components/providers/PostHogProvider";

// ── Fonts ─────────────────────────────────────────────────────────────────────

// Self-hosted variable fonts keep builds independent of Google Fonts and avoid
// a browser-side third-party font request. Licenses live beside each font.
const geist = localFont({ src: "./fonts/geist/geist.woff2", variable: "--font-display", display: "swap", weight: "100 900" });
const inter = localFont({ src: "./fonts/inter/inter.woff2", variable: "--font-body", display: "swap", weight: "100 900" });
const geistMono = localFont({ src: "./fonts/geist-mono/geist-mono.woff2", variable: "--font-mono", display: "swap", weight: "100 900" });

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${inter.variable} ${geistMono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="bg-void text-primary antialiased">
        <SessionProvider>
          <ThemeProvider>
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