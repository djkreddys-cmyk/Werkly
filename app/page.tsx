import Image from "next/image";
import Link from "next/link";
import qrCode from "../qr-1775155944413.png";
import { RevealSection } from "@/components/reveal-section";
import { ResumeBuilderClient } from "@/components/resume-builder-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { RecruitmentHero } from "@/components/recruitment-hero";

const approachPoints = [
  "Understanding client business models and workforce strategy",
  "Delivering customized IT and Non-IT talent acquisition solutions",
  "Ensuring speed without compromising candidate quality",
  "Maintaining long-term partnerships through trust, consistency, and performance",
];

const processSteps = [
  {
    title: "Business Understanding",
    description:
      "We start with the client's business context, workforce priorities, and hiring need.",
  },
  {
    title: "Structured Execution",
    description:
      "Search, screening, and shortlisting run through defined delivery processes built for quality, speed, and role relevance.",
  },
  {
    title: "Outcome-Focused Delivery",
    description:
      "Mandates are closed with clear coordination, timely execution, and measurable outcomes across business and technology teams.",
  },
  {
    title: "Delivery Principles",
    description:
      "Defined ownership, consistent communication, timely execution, and measurable outcomes across each engagement.",
  },
];

const sectors = [
  "Technology, Digital & Product",
  "IT Services, Infrastructure & Support",
  "Pharma & Life Sciences",
  "Biotech & Nutraceuticals",
  "Food & Beverages",
  "Oil & Gas",
  "Engineering & Manufacturing",
  "Building Materials & Construction Systems",
  "Automotive & Mobility",
  "Aerospace & Defense",
  "Hospitality, HVAC, and Related Industries",
];

export default function Home() {
  return (
    <div id="top" className="public-site relative">
      <SiteHeader />
      <main className="pt-[72px]">
        <RecruitmentHero />

        <section className="section-shell py-16 sm:py-20">
          <RevealSection>
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow">What We Do Best</p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-slate-950 sm:text-5xl">
              A clearer path from hiring need to shortlist.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <article className="accent-card p-7 text-center">
              <p className="eyebrow">Hiring Breadth</p>
              <p className="mt-4 text-base leading-7 muted-copy">
                Dedicated support across technology, life sciences, industrial, engineering, operations, and business-critical roles.
              </p>
            </article>
            <article className="accent-card p-7 text-center">
              <p className="eyebrow">Search Discipline</p>
              <p className="mt-4 text-base leading-7 muted-copy">
                Structured execution from brief intake to shortlist delivery and stakeholder coordination.
              </p>
            </article>
            <article className="accent-card p-7 text-center">
              <p className="eyebrow">Client Reach</p>
              <p className="mt-4 text-base leading-7 muted-copy">
                Hyderabad headquarters with Vijayawada branch support for active mandates across growing teams.
              </p>
            </article>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="accent-card p-7">
              <p className="eyebrow">What We Cover</p>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                One hiring partner for specialist, operational, and leadership mandates.
              </h3>
              <p className="mt-4 text-base leading-7 muted-copy">
                Werkly supports organizations that need reliable hiring execution across software, digital, support, engineering, manufacturing, commercial, and business functions. We work as a structured partner, not just a sourcing layer.
              </p>
            </article>
            <article className="accent-card p-7">
              <p className="eyebrow">Engagement Style</p>
              <ul className="mt-4 space-y-3 text-base leading-7 muted-copy">
                <li>Role-aligned search and screening</li>
                <li>Faster shortlist movement with clear coordination</li>
                <li>Flexible support for single roles and bulk mandates</li>
                <li>Consistent communication through the hiring cycle</li>
              </ul>
            </article>
          </div>
          </RevealSection>
        </section>

        <section id="expertise" className="section-shell anchor-section py-8 sm:py-12">
          <RevealSection delay={40}>
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow">Sectors</p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-slate-950 sm:text-5xl">
              Specialist understanding. Across industries.
            </h2>
            <p className="mt-5 text-base leading-7 muted-copy sm:text-lg">
              Werkly brings role context into search and selection so briefs move faster, screening gets sharper, and closures happen with better alignment across IT and Non-IT teams.
            </p>
          </div>
          <div className="sector-directory mt-12 grid gap-x-10 sm:grid-cols-2 xl:grid-cols-3">
            {sectors.map((sector, index) => (
              <div key={sector} className="flex items-start gap-4 border-b border-[var(--color-line)] py-6">
                <span className="pt-1 text-xs font-semibold text-[var(--color-accent-strong)]">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="text-lg font-semibold leading-snug text-[var(--color-ink)]">{sector}</h3>
              </div>
            ))}
          </div>
          </RevealSection>
        </section>

        <section id="process" className="anchor-section py-12 sm:py-14">
          <div className="section-shell">
            <RevealSection delay={80}>
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch">
              <div className="accent-card p-7 sm:p-8">
                <p className="eyebrow">Process</p>
                <h2 className="mt-4 max-w-lg section-title">
                  A structured delivery model built for faster, clearer hiring decisions across functions.
                </h2>
                <ul className="space-y-3 pt-5">
                  {approachPoints.map((point) => (
                    <li key={point} className="text-base leading-7 muted-copy">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-4">
                {processSteps.map((step, index) => (
                  <article key={step.title} className="accent-card flex gap-4 p-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-cyan)] text-sm font-semibold text-white">
                      0{index + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-950">{step.title}</h3>
                      <p className="mt-2 text-base leading-7 muted-copy">{step.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            </RevealSection>
          </div>
        </section>

        <section id="contact" className="section-shell anchor-section py-16 sm:py-24">
          <RevealSection delay={120}>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
            <div className="accent-card p-6 sm:p-8">
              <p className="eyebrow">Client Engagement</p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-slate-950 sm:text-4xl">
                Engage Werkly for structured, results-driven hiring support.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 muted-copy sm:text-lg">
                We support organizations that need strong search and selection delivery, clear turnaround discipline, and long-term recruitment partnerships across IT and Non-IT hiring.
              </p>
              <p className="mt-4 text-sm leading-6 muted-copy">
                Use the Enquiry button in the navigation to open either the candidate form or the company requirements form.
              </p>
            </div>
            <div className="accent-card p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
                <div className="min-w-0 space-y-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Company</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">Werkly Consulting Pvt LTD</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Branches</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">Hyderabad, Vijayawada</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Hiring Enquiries</p>
                  <a className="mt-2 block text-lg font-semibold text-slate-950" href="mailto:hr@werkly.in">
                    hr@werkly.in
                  </a>
                </div>
                </div>
                <div className="mx-auto w-[180px] max-w-full rounded-xl border border-[var(--color-line)] bg-[#f8faf9] p-3 text-center">
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Scan to Connect</p>
                  <div className="mt-4 flex justify-center">
                    <div className="overflow-hidden rounded-2xl border-2 border-[var(--color-accent)]/35 bg-white p-2 shadow-md">
                      <Image
                        src={qrCode}
                        alt="QR code to connect with Werkly on social channels"
                        width={128}
                        height={128}
                        className="h-32 w-32 rounded-lg object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </RevealSection>
        </section>

        <section className="section-shell py-12 sm:py-20">
          <RevealSection delay={140}>
            <div className="mx-auto max-w-4xl text-center">
              <p className="eyebrow">Candidate Resources</p>
              <h2 className="mt-4 section-title">Clear guidance for decisions before, during, and after an interview.</h2>
              <p className="muted-copy mt-5 text-base leading-8 sm:text-lg">
                Werkly&apos;s career library explains practical steps candidates can use without promising a job outcome.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                {
                  href: "/career-guides/write-a-recruiter-friendly-resume",
                  label: "Resume guidance",
                  title: "Write a recruiter-friendly resume",
                  copy: "Structure experience, skills, and evidence so a reviewer can understand your fit quickly.",
                },
                {
                  href: "/career-guides/interview-preparation-checklist",
                  label: "Interview preparation",
                  title: "Prepare examples, questions, and logistics",
                  copy: "Use a practical checklist for role research, evidence-based answers, and interview setup.",
                },
                {
                  href: "/career-guides/evaluate-a-job-offer",
                  label: "Career decisions",
                  title: "Evaluate an offer beyond salary",
                  copy: "Compare role scope, pay structure, manager expectations, location, and joining conditions.",
                },
              ].map((guide) => (
                <article key={guide.href} className="accent-card flex flex-col p-7">
                  <p className="eyebrow">{guide.label}</p>
                  <h3 className="mt-4 text-2xl font-semibold leading-snug text-[var(--color-ink)]">{guide.title}</h3>
                  <p className="muted-copy mt-4 flex-1 text-base leading-7">{guide.copy}</p>
                  <Link href={guide.href} className="mt-6 font-semibold text-[var(--color-dark)]">
                    Read the guide →
                  </Link>
                </article>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/career-guides"
                className="inline-flex rounded-2xl border border-[var(--color-dark)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-dark)]"
              >
                View all career guides
              </Link>
            </div>
          </RevealSection>
        </section>

        <section id="resume-builder" className="anchor-section">
          <RevealSection delay={160}>
            <ResumeBuilderClient mode="compact" />
          </RevealSection>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}
