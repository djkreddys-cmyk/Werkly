import { getJobs, type JobSummary } from "@/lib/jobs";
import { PublicJobsTable } from "@/components/public-jobs-table";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

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
    <div className="min-h-screen bg-[var(--color-paper)]">
      <SiteHeader />
      <main className="pt-[76px]">
        <section className="hero-surface border-b border-[var(--color-line)]">
          <div className="section-shell py-16 sm:py-20">
            <p className="eyebrow">Current Openings</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-[var(--color-ink)] sm:text-5xl">
              Explore active IT and Non-IT hiring opportunities from Werkly.
            </h1>
            <p className="muted-copy mt-5 max-w-3xl text-base leading-8 sm:text-lg">
              Review live openings in technology, business, engineering, operations, and leadership functions through one clear public jobs board.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="accent-card p-5">
                <p className="eyebrow">Filter First</p>
                <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                  Use sector, location, and employment filters to quickly verify the roles relevant to your profile.
                </p>
              </article>
              <article className="accent-card p-5">
                <p className="eyebrow">Clear Visibility</p>
                <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                  See job IDs, position details, experience expectations, and deadlines in a cleaner table layout.
                </p>
              </article>
              <article className="accent-card p-5">
                <p className="eyebrow">Direct Apply Flow</p>
                <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                  Open any role to review the full mandate and continue into the application process with better clarity.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-shell py-16 sm:py-20">
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
