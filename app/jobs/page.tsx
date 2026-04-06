import Link from "next/link";
import { headers } from "next/headers";
import type { JobSummary } from "@/lib/jobs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "www.werkly.in";
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";
  const response = await fetch(`${protocol}://${host}/api/jobs`, { cache: "no-store" }).catch(
    () => null
  );

  let jobs: JobSummary[] = [];
  if (response?.ok) {
    const data = (await response.json()) as { jobs?: JobSummary[] };
    jobs = data.jobs ?? [];
  }

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      <SiteHeader />
      <main className="pt-[76px]">
        <section className="hero-surface border-b border-[var(--color-line)]">
          <div className="section-shell py-16 sm:py-20">
            <p className="eyebrow">Current Openings</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-[var(--color-ink)] sm:text-5xl">
              Explore active hiring mandates across Werkly&apos;s Non-IT sectors.
            </h1>
            <p className="muted-copy mt-5 max-w-3xl text-base leading-8 sm:text-lg">
              Browse live roles, review job details, and apply through the hiring flow
              that best fits your profile.
            </p>
          </div>
        </section>

        <section className="section-shell py-16 sm:py-20">
          {jobs.length === 0 ? (
            <div className="accent-card p-8 text-center">
              <p className="eyebrow">Current Openings</p>
              <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                No live jobs are available right now.
              </h2>
              <p className="muted-copy mt-4 text-base leading-7">
                New openings posted from the admin CRM will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {jobs.map((job) => (
                <article key={job.id} className="accent-card flex h-full flex-col p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow">{job.sector}</p>
                      <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
                        {job.title}
                      </h2>
                      {job.jobCode ? (
                        <p className="mt-3 text-sm font-semibold text-[var(--color-accent-strong)]">
                          Job ID: {job.jobCode}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-dark)]">
                      {job.status}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--color-muted)]">
                    <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
                      {job.location}
                    </span>
                    <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
                      {job.experience}
                    </span>
                    <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
                      {job.employmentType}
                    </span>
                    {job.salary ? (
                      <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
                        {job.salary}
                      </span>
                    ) : null}
                    {job.lastDateToApply ? (
                      <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
                        Apply by {new Date(job.lastDateToApply).toLocaleDateString("en-IN")}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-[var(--color-line)] px-3 py-1">
                      Applied {job.applicationsCount}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-4 pt-8">
                    <p className="text-sm text-[var(--color-muted)]">
                      Posted {new Date(job.postedAt).toLocaleDateString("en-IN")}
                    </p>
                    <Link
                      href={`/jobs/${job.slug}`}
                      className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
                    >
                      View Details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
