import { getJobs } from "@/lib/jobs";
import { SITE_URL, absoluteUrl, isJobIndexable } from "@/lib/seo";
import { careerGuides } from "@/lib/career-guides";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry({
  url,
  lastModified,
  changeFrequency,
  priority,
}: {
  url: string;
  lastModified?: string;
  changeFrequency: "daily" | "weekly";
  priority: number;
}) {
  return [
    "<url>",
    `<loc>${escapeXml(url)}</loc>`,
    lastModified ? `<lastmod>${escapeXml(lastModified)}</lastmod>` : "",
    `<changefreq>${changeFrequency}</changefreq>`,
    `<priority>${priority}</priority>`,
    "</url>",
  ]
    .filter(Boolean)
    .join("");
}

export async function GET() {
  const entries = [
    urlEntry({ url: SITE_URL, changeFrequency: "weekly", priority: 1 }),
    urlEntry({ url: absoluteUrl("/jobs"), changeFrequency: "daily", priority: 0.9 }),
    urlEntry({ url: absoluteUrl("/about"), changeFrequency: "weekly", priority: 0.7 }),
    urlEntry({ url: absoluteUrl("/services"), changeFrequency: "weekly", priority: 0.8 }),
    urlEntry({ url: absoluteUrl("/career-guides"), changeFrequency: "weekly", priority: 0.8 }),
    urlEntry({ url: absoluteUrl("/contact"), changeFrequency: "weekly", priority: 0.6 }),
    urlEntry({ url: absoluteUrl("/privacy-policy"), changeFrequency: "weekly", priority: 0.3 }),
    urlEntry({ url: absoluteUrl("/terms"), changeFrequency: "weekly", priority: 0.3 }),
    urlEntry({ url: absoluteUrl("/editorial-policy"), changeFrequency: "weekly", priority: 0.4 }),
    ...careerGuides.map((guide) =>
      urlEntry({
        url: absoluteUrl(`/career-guides/${guide.slug}`),
        lastModified: guide.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      })
    ),
  ];

  try {
    const jobs = await getJobs();
    entries.push(
      ...jobs.filter(isJobIndexable).map((job) =>
        urlEntry({
          url: absoluteUrl(`/jobs/${encodeURIComponent(job.slug)}`),
          lastModified: job.postedAt || undefined,
          changeFrequency: "daily",
          priority: 0.8,
        })
      )
    );
  } catch {
    // The core pages remain discoverable if the jobs service is temporarily unavailable.
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
