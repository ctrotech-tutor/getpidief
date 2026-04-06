import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getpidief.me";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore", "/search", "/d/", "/u/"],
        disallow: [
          "/dashboard/",
          "/settings/",
          "/admin/",
          "/api/",
          "/onboarding/",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
