import type { MetadataRoute } from "next";
import { getJobs } from "@/lib/jobs";
import { SITE_URL, absoluteUrl, isJobIndexable } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/jobs"),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  try {
    const jobs = await getJobs();
    const jobPages: MetadataRoute.Sitemap = jobs.filter(isJobIndexable).map((job) => ({
      url: absoluteUrl(`/jobs/${encodeURIComponent(job.slug)}`),
      lastModified: job.postedAt || undefined,
      changeFrequency: "daily",
      priority: 0.8,
    }));

    return [...staticPages, ...jobPages];
  } catch {
    return staticPages;
  }
}

