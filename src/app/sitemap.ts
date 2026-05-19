import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const routes = ["/", "/hosting", "/domains", "/pricing", "/contact", "/login", "/register"];
  return routes.map((url) => ({
    url: `${base}${url}`,
    lastModified: new Date(),
  }));
}

