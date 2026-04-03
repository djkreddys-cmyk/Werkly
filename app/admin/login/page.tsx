import { AdminLoginForm } from "@/components/admin-login-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      <SiteHeader />
      <main className="pt-[76px]">
        <section className="hero-surface border-b border-[var(--color-line)]">
          <div className="section-shell py-16 sm:py-20">
            <AdminLoginForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
