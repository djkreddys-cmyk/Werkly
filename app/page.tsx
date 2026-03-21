import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const approachPoints = [
  "Understanding client business models and workforce strategy",
  "Delivering customized talent acquisition solutions",
  "Ensuring speed without compromising quality",
  "Maintaining long-term partnerships through trust and performance",
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
      "Search, screening, and shortlisting run through defined delivery processes built for quality and speed.",
  },
  {
    title: "Outcome-Focused Delivery",
    description:
      "Mandates are closed with clear coordination, timely execution, and measurable outcomes.",
  },
  {
    title: "Delivery Principles",
    description:
      "Defined ownership, consistent communication, timely execution, and measurable outcomes across each engagement.",
  },
];

const sectors = [
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
    <div id="top" className="relative">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-[var(--color-dark)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(241,166,75,0.16),transparent_24%),radial-gradient(circle_at_80%_24%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,rgba(8,96,108,0.98),rgba(8,96,108,1))]" />
          <div className="section-shell relative py-16 sm:py-20 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
              <div className="text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--color-accent)]">
                  Werkly Consulting Pvt LTD
                </p>
                <h1 className="mt-6 max-w-2xl font-[family-name:var(--font-display)] text-[3.3rem] leading-[0.98] sm:text-[4.35rem] lg:text-[4.85rem]">
                  Nextgen HR solutions for Non-IT businesses.
                </h1>
                <p className="mt-5 max-w-xl text-[1.03rem] leading-8 text-white/80 sm:text-[1.08rem]">
                  Structured search and selection support for companies that need faster hiring closures, stronger candidate quality, and better sector alignment.
                </p>
                <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                  <a
                    href="#contact"
                    className="inline-flex min-w-[182px] items-center justify-center rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-dark)] transition hover:opacity-95"
                  >
                    Request Enquiry
                  </a>
                  <a
                    href="#expertise"
                    className="inline-flex min-w-[182px] items-center justify-center rounded-xl border border-white/25 bg-white/6 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
                  >
                    View Sectors
                  </a>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-[1.05fr_0.95fr]">
                <div className="hero-frame overflow-hidden rounded-[1.8rem] border border-white/12 bg-white/8 p-3">
                  <Image
                    src="/consultancy-team-primary.svg"
                    alt="Three consultants collaborating at a meeting table"
                    width={1200}
                    height={900}
                    className="h-full w-full rounded-[1.3rem] object-cover"
                    priority
                  />
                </div>
                <div className="grid gap-5">
                  <div className="hero-frame overflow-hidden rounded-[1.55rem] border border-white/12 bg-white/8 p-3">
                    <Image
                      src="/consultancy-team-secondary.svg"
                      alt="Two professionals reviewing a consultancy plan together"
                      width={900}
                      height={720}
                      className="h-full w-full rounded-[1rem] object-cover"
                    />
                  </div>
                  <div className="rounded-[1.55rem] border border-[rgba(241,166,75,0.28)] bg-white/8 p-6 text-white">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                      Established in 2025
                    </p>
                    <p className="mt-3 text-lg leading-8 text-white/86">
                      Forward-thinking search and selection support for Non-IT hiring mandates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <article className="rounded-[1.45rem] border border-white/12 bg-white/8 p-6 text-white backdrop-blur-sm">
                <p className="eyebrow text-[var(--color-accent)]">Sector Focus</p>
                <p className="mt-3 text-base leading-7 text-white/82">
                  Dedicated support across life sciences, industrial, engineering, and operations-driven roles.
                </p>
              </article>
              <article className="rounded-[1.45rem] border border-white/12 bg-white/8 p-6 text-white backdrop-blur-sm">
                <p className="eyebrow text-[var(--color-accent)]">Search Discipline</p>
                <p className="mt-3 text-base leading-7 text-white/82">
                  Structured execution from brief intake to shortlist delivery and stakeholder coordination.
                </p>
              </article>
              <article className="rounded-[1.45rem] border border-white/12 bg-white/8 p-6 text-white backdrop-blur-sm">
                <p className="eyebrow text-[var(--color-accent)]">Client Reach</p>
                <p className="mt-3 text-base leading-7 text-white/82">
                  Hyderabad headquarters with Vijayawada branch support for active hiring mandates.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section-shell py-16 sm:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow">What We Do Best</p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-slate-950 sm:text-5xl">
              Sector-led recruitment support designed for clarity, speed, and hiring confidence.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <article className="accent-card p-7 text-center">
              <p className="eyebrow">Structured Delivery</p>
              <p className="mt-4 text-base leading-7 muted-copy">
                Recruitment support built around business operations, workforce priorities, and defined ownership.
              </p>
            </article>
            <article className="accent-card p-7 text-center">
              <p className="eyebrow">Turnkey Search</p>
              <p className="mt-4 text-base leading-7 muted-copy">
                Clear execution from search and screening to shortlist presentation, coordination, and closure.
              </p>
            </article>
            <article className="accent-card p-7 text-center">
              <p className="eyebrow">Industry Context</p>
              <p className="mt-4 text-base leading-7 muted-copy">
                Domain-specific delivery across Non-IT sectors where capability fit and business context matter.
              </p>
            </article>
          </div>
        </section>

        <section id="expertise" className="section-shell anchor-section py-8 sm:py-12">
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow">Sectors</p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-slate-950 sm:text-5xl">
              Recruitment support built around the sectors you actually hire for.
            </h2>
            <p className="mt-5 text-base leading-7 muted-copy sm:text-lg">
              Werkly brings domain context into search and selection so briefs move faster, screening gets sharper, and closures happen with better alignment.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {sectors.map((sector) => (
              <article key={sector} className="accent-card flex min-h-[172px] flex-col justify-between p-6">
                <p className="eyebrow">Non-IT Vertical</p>
                <h3 className="mt-5 text-2xl font-semibold leading-snug text-[var(--color-ink)]">
                  {sector}
                </h3>
                <div className="mt-6 h-px w-16 bg-[var(--color-brand-cyan)]/35" />
              </article>
            ))}
          </div>
        </section>

        <section id="process" className="anchor-section py-16 sm:py-24">
          <div className="section-shell">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div className="accent-card p-7 sm:p-8">
                <p className="eyebrow">Process</p>
                <h2 className="mt-4 max-w-lg section-title">
                  A structured delivery model built for faster, clearer hiring decisions.
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
          </div>
        </section>

        <section id="contact" className="section-shell anchor-section py-16 sm:py-24">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="accent-card p-8 sm:p-9">
              <p className="eyebrow">Client Engagement</p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-slate-950 sm:text-5xl">
                Engage Werkly for structured, results-driven recruitment support.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 muted-copy sm:text-lg">
                We support organizations that need strong search and selection delivery, clear turnaround discipline, and long-term recruitment partnerships.
              </p>
              <p className="mt-4 text-sm leading-6 muted-copy">
                Use the Enquiry button in the navigation to open either the candidate form or the company requirements form.
              </p>
            </div>
            <div className="accent-card p-8">
              <div className="space-y-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Company</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">Werkly Consulting Pvt LTD</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Headquarters</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">Hyderabad</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Branch Office</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">Vijayawada</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Hiring Enquiries</p>
                  <a className="mt-2 block text-lg font-semibold text-slate-950" href="mailto:hr@werkly.in">
                    hr@werkly.in
                  </a>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">General Enquiries</p>
                  <a className="mt-2 block text-lg font-semibold text-slate-950" href="mailto:info@werkly.in">
                    info@werkly.in
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
