import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getJobBySlug } from "@/lib/jobs";
import { EnquiryModal } from "@/components/enquiry-modal";
import { JobShareButton } from "@/components/job-share-button";
import { LinkedInJobShareButton } from "@/components/linkedin-job-share-button";
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
    title: { absolute: `${title} | ${SITE_NAME}` },
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
    <div className="public-site min-h-screen bg-[var(--color-paper)]">
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
      <main className="pt-[72px]">
        <section className="public-page-hero">
          <div className="section-shell py-10 sm:py-14 lg:py-16">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-dark)] transition hover:text-[var(--color-accent-strong)]"
            >
              ← Back to all jobs
            </Link>
            <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="eyebrow">{job.sector}</p>
                  {job.jobCode ? <span className="text-xs font-semibold text-[var(--color-muted)]">Job ID {job.jobCode}</span> : null}
                </div>
                <h1 className="mt-4 max-w-4xl font-[family-name:var(--font-display)] text-[2.4rem] font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--color-ink)] sm:text-5xl lg:text-[3.5rem]">
                  {job.title}
                </h1>
                <p className="muted-copy mt-5 max-w-3xl text-base leading-8 sm:text-lg">{introCopy}</p>
                <div className="mt-6 flex flex-wrap gap-2 text-sm text-[var(--color-muted)]">
                  {[job.location, job.experience, job.employmentType, `${job.positionsCount ?? 1} ${(job.positionsCount ?? 1) === 1 ? "opening" : "openings"}`].map((item) => (
                    <span key={item} className="rounded-full border border-[var(--color-line)] bg-white px-3.5 py-1.5">{item}</span>
                  ))}
                </div>
              </div>
              <aside className="rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[0_14px_36px_rgba(15,47,54,0.08)]">
                <p className="text-sm font-semibold text-[var(--color-ink)]">Interested in this opportunity?</p>
                <p className="muted-copy mt-2 text-sm leading-6">Apply through Werkly and attach your latest resume for the recruitment team.</p>
                <div className="mt-5 grid gap-3">
                  <EnquiryModal
                    triggerLabel="Apply for this job"
                    jobSlug={job.slug}
                    jobTitle={job.title}
                    triggerClassName="inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-dark)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-accent-strong)]"
                  />
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-dark)] bg-white px-5 py-3 text-sm font-bold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
                  />
                  <LinkedInJobShareButton title={job.title} slug={job.slug} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#0a66c2] bg-white px-5 py-3 text-sm font-bold text-[#0a66c2] transition hover:bg-[#eef6ff]" />
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="section-shell py-10 sm:py-14">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="space-y-5">
              {job.responsibilities.length ? <article className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[0_10px_28px_rgba(15,47,54,0.05)] sm:p-8">
                <p className="eyebrow">The role</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-ink)]">Responsibilities</h2>
                <ul className="mt-5 space-y-4 text-base leading-7 text-[var(--color-ink)]">
                  {job.responsibilities.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article> : null}
              {job.requirements.length ? <article className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[0_10px_28px_rgba(15,47,54,0.05)] sm:p-8">
                <p className="eyebrow">Candidate profile</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-ink)]">Skills and requirements</h2>
                <ul className="mt-5 space-y-4 text-base leading-7 text-[var(--color-ink)]">
                  {job.requirements.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-dark)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article> : null}
              {!job.responsibilities.length && !job.requirements.length ? (
                <article className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[0_10px_28px_rgba(15,47,54,0.05)] sm:p-8">
                  <p className="eyebrow">Role information</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-[var(--color-ink)]">Detailed brief available during screening</h2>
                  <p className="muted-copy mt-4 max-w-3xl text-base leading-8">
                    The employer&apos;s detailed responsibilities and skill priorities are being confirmed. Apply with Job ID {job.jobCode || job.id} and the Werkly team will verify the current brief before progressing your profile.
                  </p>
                </article>
              ) : null}
            </div>

            <aside className="space-y-5 lg:sticky lg:top-24">
              <article className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[0_10px_28px_rgba(15,47,54,0.05)]">
                <p className="eyebrow">Role snapshot</p>
                <dl className="mt-5 divide-y divide-[var(--color-line)] text-base">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Salary</dt>
                    <dd className="mt-1 pb-4 font-semibold text-[var(--color-ink)]">
                      {job.salary ?? "Competitive"}
                    </dd>
                  </div>
                  <div className="pt-4">
                    <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Package per annum</dt>
                    <dd className="mt-1 pb-4 font-semibold text-[var(--color-ink)]">
                      {job.packagePerAnnum ?? "Discussed with shortlisted candidates"}
                    </dd>
                  </div>
                  <div className="pt-4">
                    <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Open positions</dt>
                    <dd className="mt-1 pb-4 font-semibold text-[var(--color-ink)]">
                      {job.positionsCount ?? 1}
                    </dd>
                  </div>
                  <div className="pt-4">
                    <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Apply by</dt>
                    <dd className="mt-1 pb-4 font-semibold text-[var(--color-ink)]">
                      {job.lastDateToApply
                        ? new Date(job.lastDateToApply).toLocaleDateString("en-IN")
                        : "Open until filled"}
                    </dd>
                  </div>
                  <div className="pt-4">
                    <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Applications received</dt>
                    <dd className="mt-1 font-semibold text-[var(--color-ink)]">
                      {job.applicationsCount}
                    </dd>
                  </div>
                </dl>
              </article>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
