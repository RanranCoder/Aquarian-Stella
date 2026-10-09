import type { MetadataRoute } from "next";

const BASE_URL = "https://stella.ranran.org.cn";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/onboarding", "/profile", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}