import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const serviceHighlights = [
  {
    title: "Tailor-Made HR Solutions",
    description:
      "Customized recruitment support that strengthens workforce capability and streamlines business operations.",
  },
  {
    title: "Turnkey Search & Selection",
    description:
      "Structured execution for Non-IT hiring mandates with clear ownership, speed, and measurable outcomes.",
  },
  {
    title: "Domain-Specific Delivery",
    description:
      "Specialized consultants aligned to industry verticals for better fit, faster delivery, and consistent quality.",
  },
];

const serviceSupport = [
  {
    title: "Turnaround Discipline",
    description: "Defined timelines and structured follow-ups to keep hiring momentum intact.",
  },
  {
    title: "Quality Screening",
    description: "Shortlists are filtered for relevance, capability, and alignment with client priorities.",
  },
  {
    title: "Client Alignment",
    description: "Execution stays mapped to business goals, not just open positions.",
  },
];

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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(231,220,199,0.16),transparent_24%),linear-gradient(180deg,rgba(23,56,47,0.86),rgba(23,56,47,1))]" />
          <div className="section-shell relative py-14 sm:py-18 lg:py-22">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div className="text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-accent)]">
                  Werkly Consulting Pvt LTD
                </p>
                <h1 className="mt-5 max-w-2xl font-[family-name:var(--font-display)] text-[3.35rem] leading-[0.98] sm:text-[4.35rem] lg:text-[4.7rem]">
                  Tailor-made HR solutions for Non-IT businesses.
                </h1>
                <p className="mt-5 max-w-xl text-[1.02rem] leading-8 text-white/82 sm:text-[1.06rem]">
                  Headquartered in Hyderabad, Werkly delivers structured search and selection solutions across the Non-IT sector.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <a
                    href="#contact"
                    className="inline-flex min-w-[170px] items-center justify-center rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-dark)] transition hover:opacity-95"
                  >
                    Discuss Your Hiring
                  </a>
                  <a
                    href="#expertise"
                    className="inline-flex min-w-[170px] items-center justify-center rounded-xl border border-[var(--color-accent)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-[rgba(231,220,199,0.1)]"
                  >
                    View Expertise
                  </a>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1.08fr_0.92fr]">
                <div className="hero-frame overflow-hidden rounded-[1.8rem] border border-white/10 bg-[rgba(255,255,255,0.06)] p-3">
                  <Image
                    src="/consultancy-team-primary.svg"
                    alt="Three consultants collaborating at a meeting table"
                    width={1200}
                    height={900}
                    className="h-full w-full rounded-[1.25rem] object-cover"
                    priority
                  />
                </div>
                <div className="grid gap-4">
                  <div className="hero-frame overflow-hidden rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.06)] p-3">
                    <Image
                      src="/consultancy-team-secondary.svg"
                      alt="Two professionals reviewing a consultancy plan together"
                      width={900}
                      height={720}
                      className="h-full w-full rounded-[1rem] object-cover"
                    />
                  </div>
                  <div className="rounded-[1.5rem] border border-[rgba(231,220,199,0.22)] bg-[rgba(231,220,199,0.08)] p-6 text-white">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                      Established in 2025
                    </p>
                    <p className="mt-3 text-lg leading-8 text-white/84">
                      Forward-thinking search and selection support for Non-IT hiring mandates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell py-6 sm:py-8">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="story-card p-6">
              <p className="eyebrow">Headquartered in Hyderabad</p>
              <p className="mt-3 text-base leading-7 muted-copy">
                Specialized recruitment support built around business operations and workforce strategy.
              </p>
            </article>
            <article className="story-card p-6">
              <p className="eyebrow">Results-Driven Delivery</p>
              <p className="mt-3 text-base leading-7 muted-copy">
                Structured processes, domain-specific teams, and measurable outcomes across every engagement.
              </p>
            </article>
            <article className="story-card p-6">
              <p className="eyebrow">Non-IT Sector Focus</p>
              <p className="mt-3 text-base leading-7 muted-copy">
                Search and selection support across industrial, manufacturing, life sciences, and operations-led sectors.
              </p>
            </article>
          </div>
        </section>

        <section id="services" className="section-shell anchor-section py-16 sm:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow">About Werkly</p>
            <h2 className="mt-4 section-title">
              Recruitment solutions built for precision, speed, and alignment.
            </h2>
            <p className="mt-4 text-base leading-7 muted-copy sm:text-lg">
              Werkly brings together specialized consultants who deliver end-to-end HR solutions across diverse Non-IT industries.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {serviceHighlights.map((service) => (
              <article key={service.title} className="story-card p-7">
                <h3 className="text-2xl font-semibold text-slate-950">{service.title}</h3>
                <p className="mt-4 text-base leading-7 muted-copy">{service.description}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {serviceSupport.map((item) => (
              <article key={item.title} className="story-card p-7">
                <p className="eyebrow">Service Support</p>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-base leading-7 muted-copy">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="process" className="section-shell anchor-section py-16 sm:py-24">
          <div className="grid gap-7 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <div className="story-card p-7 sm:p-8">
              <p className="eyebrow">Our Approach</p>
              <h2 className="mt-4 max-w-lg section-title">
                Recruitment at Werkly is about building capability and supporting business growth.
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
                <article key={step.title} className="story-card flex gap-4 p-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-sm font-semibold text-[var(--color-dark)]">
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
        </section>

        <section id="expertise" className="anchor-section bg-[var(--color-dark)] py-16 sm:py-24">
          <div className="section-shell">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                Our Expertise
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-white sm:text-5xl">
                Specialized recruitment solutions across key Non-IT verticals.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/72 sm:text-lg">
                Domain-specific teams execute turnkey recruitment assignments where industry context and delivery discipline matter.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sectors.map((sector) => (
                <article
                  key={sector}
                  className="rounded-[1.3rem] border border-[rgba(231,220,199,0.26)] bg-[rgba(231,220,199,0.08)] p-6 text-white"
                >
                  <h3 className="text-xl font-semibold">{sector}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="section-shell anchor-section py-16 sm:py-24">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="story-card p-8 sm:p-9">
              <p className="eyebrow">Client Engagement</p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-slate-950 sm:text-5xl">
                Engage Werkly for structured, results-driven recruitment support.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 muted-copy sm:text-lg">
                We support organizations that need strong search and selection delivery, clear turnaround discipline, and long-term recruitment partnerships.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href="mailto:hr@werkly.in"
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-dark)] transition hover:opacity-95"
                >
                  Contact HR
                </a>
                <a
                  href="mailto:info@werkly.in"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--color-line)] bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  General Enquiry
                </a>
              </div>
            </div>
            <div className="story-card p-8">
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
