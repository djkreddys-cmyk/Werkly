import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getJobBySlug } from "@/lib/jobs";
import { EnquiryModal } from "@/components/enquiry-modal";
import { JobShareButton } from "@/components/job-share-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StructuredData } from "@/components/structured-data";
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  cleanSeoText,
  isJobIndexable,
  normalizeEmploymentType,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

const getJob = cache(async (slug: string) => getJobBySlug(slug).catch(() => null));

type JobPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: JobPageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);

  if (!job) {
    return {
      title: "Job Not Found",
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = `/jobs/${encodeURIComponent(job.slug)}`;
  const description = cleanSeoText(
    job.description || job.summary,
    `${job.title} job opportunity in ${job.location}. Review the experience, skills, and role details and apply through Werkly.`
  );
  const title = `${job.title} Job in ${job.location}`;
  const indexable = isJobIndexable(job);

  return {
    title,
    description,
    keywords: [job.title, job.location, job.sector, ...job.skills].filter(Boolean),
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "website",
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonicalPath,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
    },
    robots: {
      index: indexable,
      follow: indexable,
    },
  };
}

function toIsoDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value.length === 10 ? `${value}T23:59:59+05:30` : value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default async function JobDetailPage({ params }: JobPageProps) {
  const { slug } = await params;
  const job = await getJob(slug);

  if (!job) {
    notFound();
  }

  const introCopy =
    job.description?.trim() ||
    `${job.title} opportunity in ${job.location} for ${job.sector} professionals with ${job.experience} experience.`;

  const jobDescription = [
    introCopy,
    job.responsibilities.length ? `Responsibilities: ${job.responsibilities.join("; ")}` : "",
    job.requirements.length ? `Requirements: ${job.requirements.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const jobPosting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: jobDescription,
    identifier: {
      "@type": "PropertyValue",
      name: SITE_NAME,
      value: job.jobCode || job.id,
    },
    datePosted: toIsoDate(job.postedAt),
    validThrough: toIsoDate(job.lastDateToApply),
    employmentType: normalizeEmploymentType(job.employmentType),
    hiringOrganization: {
      "@type": "Organization",
      name: SITE_NAME,
      sameAs: SITE_URL,
      logo: absoluteUrl("/Werkly%20Logo.png"),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressCountry: "IN",
      },
    },
    industry: job.sector,
    skills: job.skills.join(", ") || undefined,
    experienceRequirements: job.experience,
    totalJobOpenings: job.positionsCount,
    directApply: true,
    url: absoluteUrl(`/jobs/${encodeURIComponent(job.slug)}`),
  };

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      <StructuredData
        data={[
          jobPosting,
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: SITE_URL,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Jobs",
                item: absoluteUrl("/jobs"),
              },
              {
                "@type": "ListItem",
                position: 3,
                name: job.title,
                item: absoluteUrl(`/jobs/${encodeURIComponent(job.slug)}`),
              },
            ],
          },
        ]}
      />
      <SiteHeader />
      <main className="pt-[76px]">
        <section className="hero-surface border-b border-[var(--color-line)]">
          <div className="section-shell py-16 sm:py-20">
            <Link
              href="/jobs"
              className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-accent-strong)]"
            >
              Back to Jobs
            </Link>
            <p className="eyebrow mt-6">{job.sector}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-[var(--color-ink)] sm:text-5xl">
              {job.title}
            </h1>
            {job.jobCode ? (
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
                Job ID {job.jobCode}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--color-muted)]">
              <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
                {job.location}
              </span>
              <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
                {job.experience}
              </span>
              <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
                {job.employmentType}
              </span>
              <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
                {job.positionsCount ?? 1} {(job.positionsCount ?? 1) === 1 ? "opening" : "openings"}
              </span>
              {job.packagePerAnnum ? (
                <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
                  {job.packagePerAnnum}
                </span>
              ) : null}
              {job.lastDateToApply ? (
                <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
                  Apply by {new Date(job.lastDateToApply).toLocaleDateString("en-IN")}
                </span>
              ) : null}
            </div>
            <p className="muted-copy mt-6 max-w-3xl text-base leading-8 sm:text-lg">{introCopy}</p>
            <div className="mt-7">
              <JobShareButton
                title={job.title}
                slug={job.slug}
                jobCode={job.jobCode}
                sector={job.sector}
                location={job.location}
                experience={job.experience}
                employmentType={job.employmentType}
                positionsCount={job.positionsCount}
                lastDateToApply={job.lastDateToApply}
                salary={job.salary}
                packagePerAnnum={job.packagePerAnnum}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-dark)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-dark)] shadow-sm transition hover:bg-[rgba(8,96,108,0.07)]"
              />
            </div>
          </div>
        </section>

        <section className="section-shell py-16 sm:py-20">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <article className="accent-card p-7">
                <p className="eyebrow">Job Description</p>
                <ul className="mt-5 space-y-4 text-base leading-7 text-[var(--color-ink)]">
                  {job.responsibilities.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="accent-card p-7">
                <p className="eyebrow">Key Skills</p>
                <ul className="mt-5 space-y-4 text-base leading-7 text-[var(--color-ink)]">
                  {job.requirements.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-dark)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>

            <aside className="space-y-5">
              <article className="accent-card p-7">
                <p className="eyebrow">Role Snapshot</p>
                <div className="mt-5 space-y-4 text-base">
                  <div>
                    <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Salary</p>
                    <p className="mt-1 font-semibold text-[var(--color-ink)]">
                      {job.salary ?? "Competitive"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Package Per Annum</p>
                    <p className="mt-1 font-semibold text-[var(--color-ink)]">
                      {job.packagePerAnnum ?? "Discussed with shortlisted candidates"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Open Positions</p>
                    <p className="mt-1 font-semibold text-[var(--color-ink)]">
                      {job.positionsCount ?? 1}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Last Date to Apply</p>
                    <p className="mt-1 font-semibold text-[var(--color-ink)]">
                      {job.lastDateToApply
                        ? new Date(job.lastDateToApply).toLocaleDateString("en-IN")
                        : "Open until filled"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Applied People</p>
                    <p className="mt-1 font-semibold text-[var(--color-ink)]">
                      {job.applicationsCount}
                    </p>
                  </div>
                </div>
              </article>

              <article className="accent-card p-7">
                <p className="eyebrow">Apply</p>
                <p className="muted-copy mt-4 text-base leading-7">
                  Use Werkly&apos;s enquiry flow to apply for this job and share your resume
                  directly with the recruitment team.
                </p>
                <div className="mt-5">
                  <EnquiryModal
                    triggerLabel="Apply Now"
                    jobSlug={job.slug}
                    jobTitle={job.title}
                    triggerClassName="inline-flex items-center justify-center rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
                  />
                </div>
              </article>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
