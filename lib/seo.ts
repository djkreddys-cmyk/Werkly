import type { JobSummary } from "@/lib/jobs";

export const SITE_NAME = "Werkly Consulting Pvt LTD";
export const SITE_URL = "https://werkly.in";
export const DEFAULT_TITLE = `${SITE_NAME} | IT and Non-IT Hiring Partner`;
export const DEFAULT_DESCRIPTION =
  "Werkly Consulting Pvt LTD provides structured recruitment and HR consulting for IT, engineering, business, operations, and Non-IT hiring across India.";

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function cleanSeoText(value: string | undefined, fallback: string, maxLength = 160) {
  const text = (value || fallback)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function isJobIndexable(job: JobSummary) {
  if (job.status !== "open" || job.isHidden) {
    return false;
  }

  if (!job.lastDateToApply) {
    return true;
  }

  const validThrough = new Date(job.lastDateToApply);
  if (Number.isNaN(validThrough.getTime())) {
    return true;
  }

  validThrough.setHours(23, 59, 59, 999);
  return validThrough.getTime() >= Date.now();
}

export function normalizeEmploymentType(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
  const employmentTypes: Record<string, string> = {
    fulltime: "FULL_TIME",
    parttime: "PART_TIME",
    contract: "CONTRACTOR",
    contractor: "CONTRACTOR",
    temporary: "TEMPORARY",
    internship: "INTERN",
    intern: "INTERN",
    volunteer: "VOLUNTEER",
    perdiem: "PER_DIEM",
  };

  return employmentTypes[normalized] || value.toUpperCase().replace(/\s+/g, "_");
}

