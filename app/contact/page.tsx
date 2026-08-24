import type { Metadata } from "next";
import Link from "next/link";
import { PublicContentPage } from "@/components/public-content-page";

export const metadata: Metadata = {
  title: "Contact Werkly Consulting",
  description:
    "Contact Werkly Consulting through verified channels for recruitment requirements, job enquiries, privacy requests, or suspected impersonation.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PublicContentPage
      eyebrow="Contact"
      title="Use an official Werkly channel for every enquiry."
      intro="Contact us about employer requirements, a published vacancy, candidate information, or a privacy request. Include only the information needed for us to respond."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="accent-card p-7">
          <p className="eyebrow">Email</p>
          <h2 className="mt-4 text-xl font-semibold text-[var(--color-ink)]">Hiring and candidate enquiries</h2>
          <a href="mailto:hr@werkly.in" className="mt-4 block font-semibold text-[var(--color-dark)] underline">
            hr@werkly.in
          </a>
          <p className="muted-copy mt-4 text-sm leading-7">
            Mention the job title or job ID when asking about a published position. Employers can include role, location, experience, and hiring timeline.
          </p>
        </section>
        <section className="accent-card p-7">
          <p className="eyebrow">Phone and WhatsApp</p>
          <h2 className="mt-4 text-xl font-semibold text-[var(--color-ink)]">Speak with Werkly</h2>
          <a href="tel:+917036797909" className="mt-4 block font-semibold text-[var(--color-dark)] underline">
            +91 70367 97909
          </a>
          <a href="https://wa.me/917036797909" className="mt-2 block font-semibold text-[var(--color-dark)] underline">
            Official WhatsApp
          </a>
          <p className="muted-copy mt-4 text-sm leading-7">
            Do not send identity documents or sensitive financial information through an unverified number.
          </p>
        </section>
        <section className="accent-card p-7">
          <p className="eyebrow">Online</p>
          <h2 className="mt-4 text-xl font-semibold text-[var(--color-ink)]">Forms and current jobs</h2>
          <Link href="/#contact" className="mt-4 block font-semibold text-[var(--color-dark)] underline">
            Open enquiry options
          </Link>
          <Link href="/jobs" className="mt-2 block font-semibold text-[var(--color-dark)] underline">
            View current openings
          </Link>
          <p className="muted-copy mt-4 text-sm leading-7">
            Applications should be made against a real published role whenever possible so the team can identify the correct requirement.
          </p>
        </section>
      </div>
      <section className="mt-10 border-t border-[var(--color-line)] pt-8">
        <h2 className="text-2xl font-semibold text-[var(--color-ink)]">Recruitment safety</h2>
        <div className="content-copy muted-copy mt-4 space-y-4 text-base leading-8">
          <p>
            Werkly does not guarantee selection and does not ask candidates to pay an individual for an interview or job offer. Employer decisions, background checks, and written offer terms must be verified through official channels. Report suspicious messages, payment requests, or impersonation to hr@werkly.in with screenshots and the sender details.
          </p>
          <p>
            For requests concerning access, correction, or deletion of personal information, use the same email with the subject “Privacy Request.” We may need to verify identity before acting on a request so that information is not disclosed to the wrong person.
          </p>
        </div>
      </section>
    </PublicContentPage>
  );
}
