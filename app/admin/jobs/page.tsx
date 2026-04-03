import { AdminJobsDashboard } from "@/components/admin-jobs-dashboard";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function AdminJobsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      <SiteHeader />
      <main className="pt-[76px]">
        <section className="hero-surface border-b border-[var(--color-line)]">
          <div className="section-shell py-16 sm:py-20">
            <div className="mb-10 max-w-3xl">
              <p className="eyebrow">Admin Console</p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-[var(--color-ink)] sm:text-5xl">
                Manage current openings from a Railway-ready dashboard.
              </h1>
              <p className="muted-copy mt-5 text-base leading-8 sm:text-lg">
                Publish roles, update existing openings, and keep your website in sync
                with the backend that runs on Railway.
              </p>
            </div>
            <AdminJobsDashboard />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
