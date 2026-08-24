import { getJobs, type JobSummary } from "@/lib/jobs";
import { PublicJobsTable } from "@/components/public-jobs-table";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StructuredData } from "@/components/structured-data";
import { SITE_NAME, absoluteUrl, isJobIndexable } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  let jobs: JobSummary[] = [];
  let jobsError = "";

  try {
    jobs = await getJobs();
  } catch (error) {
    jobsError = error instanceof Error ? error.message : "Unable to load public jobs.";
  }

  return (
    <div className="public-site min-h-screen bg-[var(--color-paper)]">
      {jobs.length ? (
        <StructuredData
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Current job openings at ${SITE_NAME}`,
            itemListElement: jobs.filter(isJobIndexable).map((job, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: job.title,
              url: absoluteUrl(`/jobs/${encodeURIComponent(job.slug)}`),
            })),
          }}
        />
      ) : null}
      <SiteHeader />
      <main className="pt-[72px]">
        <section className="public-page-hero">
          <div className="section-shell py-12 sm:py-16 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="eyebrow">Current Openings</p>
                <h1 className="mt-4 max-w-4xl font-[family-name:var(--font-display)] text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--color-ink)] sm:text-5xl lg:text-[3.6rem]">
                  Find the role that fits your experience and next step.
                </h1>
                <p className="muted-copy mt-5 max-w-3xl text-base leading-8 sm:text-lg">
                  Search active opportunities, review the complete role, and apply through a verified Werkly channel.
                </p>
              </div>
              <div className="flex gap-6 border-l-0 border-[var(--color-line)] lg:border-l lg:pl-8">
                <div>
                  <p className="text-3xl font-semibold text-[var(--color-dark)]">{jobs.length}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">Live roles</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-[var(--color-dark)]">IT + Non-IT</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">Hiring coverage</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell py-10 sm:py-14">
          {jobsError ? (
            <div className="accent-card p-8 text-center">
              <p className="eyebrow">Current Openings</p>
              <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                Public jobs could not be loaded.
              </h2>
              <p className="mt-4 text-base leading-7 text-red-700">{jobsError}</p>
            </div>
          ) : jobs.length === 0 ? (
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
            <PublicJobsTable jobs={jobs} />
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
