import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "getpidief — Academic Resource Network",
    short_name: "getpidief",
    description: "Discover, share, and study with millions of verified academic resources.",
    start_url: "/explore",
    display: "standalone",
    background_color: "#060C19",
    theme_color: "#060C19",
    orientation: "portrait-primary",
    scope: "/",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png",       sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png",       sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable.png",  sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    screenshots: [
      {
        src: "/images/screenshot-desktop.png",
        sizes: "1280x800",
        type: "image/png",
        // @ts-ignore — form_factor not yet in TS types
        form_factor: "wide",
        label: "getpidief on desktop",
      },
      {
        src: "/images/screenshot-mobile.png",
        sizes: "390x844",
        type: "image/png",
        label: "getpidief on mobile",
      },
    ],
    shortcuts: [
      {
        name: "Explore Archive",
        url: "/explore",
        description: "Browse the academic archive",
        icons: [{ src: "/icons/shortcut-explore.png", sizes: "96x96" }],
      },
      {
        name: "Upload Document",
        url: "/dashboard/uploads",
        description: "Contribute a new resource",
        icons: [{ src: "/icons/shortcut-upload.png", sizes: "96x96" }],
      },
      {
        name: "My Library",
        url: "/dashboard/library",
        description: "View your saved resources",
        icons: [{ src: "/icons/shortcut-library.png", sizes: "96x96" }],
      },
    ],
  };
}
