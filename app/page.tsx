import Image from "next/image";
import Link from "next/link";
import qrCode from "../qr-1775155944413.png";
import { RevealSection } from "@/components/reveal-section";
import { ResumeBuilderClient } from "@/components/resume-builder-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

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
        <section className="relative overflow-hidden bg-[#074852]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(241,166,75,0.2),transparent_24rem),radial-gradient(circle_at_90%_14%,rgba(255,255,255,0.09),transparent_26rem),linear-gradient(135deg,rgba(7,72,82,0.98),rgba(8,96,108,0.96))]" />
          <div className="section-shell relative py-14 sm:py-16 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
              <div className="motion-rise text-white">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                  Talent search and selection
                </p>
                <h1 className="mt-5 max-w-2xl font-[family-name:var(--font-display)] text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.045em] sm:text-[3.75rem] lg:text-[4.25rem]">
                  Better hiring starts with a clearer search.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-8 text-white/76 sm:text-lg">
                  Werkly helps IT and Non-IT teams define the requirement, reach relevant talent,
                  screen with context, and move qualified candidates through the hiring process.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/jobs" className="inline-flex items-center justify-center rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-[#17353d] transition hover:bg-[#f6b762]">
                    Explore current jobs
                  </Link>
                  <Link href="/services" className="inline-flex items-center justify-center rounded-xl border border-white/22 bg-white/6 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/12">
                    View recruitment services
                  </Link>
                </div>
                <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/12 pt-6 text-sm text-white/68">
                  <span><strong className="text-white">IT + Non-IT</strong> coverage</span>
                  <span><strong className="text-white">Role-aligned</strong> screening</span>
                  <span><strong className="text-white">India-wide</strong> opportunities</span>
                </div>
              </div>
              <div className="motion-rise motion-rise-delay-1 relative mx-auto w-full max-w-2xl lg:mx-0">
                <div className="overflow-hidden rounded-[1.5rem] border border-white/14 bg-white/8 p-3 shadow-[0_32px_70px_rgba(4,30,35,0.28)]">
                  <Image
                    src="/consultancy-team-primary.svg"
                    alt="Three consultants collaborating at a meeting table"
                    width={1200}
                    height={900}
                    className="aspect-[4/3] w-full rounded-[1.05rem] object-cover"
                    priority
                  />
                </div>
                <div className="absolute -bottom-5 left-4 right-4 rounded-2xl border border-white/20 bg-white px-5 py-4 shadow-xl sm:left-auto sm:right-5 sm:max-w-xs">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">Candidate-first coordination</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-ink)]">Clear role details, interview updates, and verified application channels.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell py-16 sm:py-20">
          <RevealSection>
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow">What We Do Best</p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-slate-950 sm:text-5xl">
              Recruitment support designed for clarity, speed, and hiring confidence across multiple functions.
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
              Recruitment support built around the sectors you actually hire for.
            </h2>
            <p className="mt-5 text-base leading-7 muted-copy sm:text-lg">
              Werkly brings role context into search and selection so briefs move faster, screening gets sharper, and closures happen with better alignment across IT and Non-IT teams.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {sectors.map((sector) => (
              <article key={sector} className="accent-card flex min-h-[172px] flex-col justify-between p-6">
                <p className="eyebrow">Hiring Vertical</p>
                <h3 className="mt-5 text-2xl font-semibold leading-snug text-[var(--color-ink)]">
                  {sector}
                </h3>
                <div className="mt-6 h-px w-16 bg-[var(--color-brand-cyan)]/35" />
              </article>
            ))}
          </div>
          </RevealSection>
        </section>

        <section id="process" className="anchor-section py-16 sm:py-24">
          <div className="section-shell">
            <RevealSection delay={80}>
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
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
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="accent-card p-8 sm:p-9">
              <p className="eyebrow">Client Engagement</p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-slate-950 sm:text-5xl">
                Engage Werkly for structured, results-driven hiring support.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 muted-copy sm:text-lg">
                We support organizations that need strong search and selection delivery, clear turnaround discipline, and long-term recruitment partnerships across IT and Non-IT hiring.
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
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Branches</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">Hyd, Vja</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Hiring Enquiries</p>
                  <a className="mt-2 block text-lg font-semibold text-slate-950" href="mailto:hr@werkly.in">
                    hr@werkly.in
                  </a>
                </div>
                <div className="rounded-[1.4rem] border-2 border-[var(--color-accent)]/45 bg-[linear-gradient(135deg,rgba(241,166,75,0.12),rgba(8,96,108,0.06))] p-5 text-center shadow-[0_18px_45px_rgba(15,47,54,0.08)]">
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Scan to Connect</p>
                  <div className="mt-4 flex justify-center">
                    <div className="overflow-hidden rounded-2xl border-2 border-[var(--color-accent)]/35 bg-white p-2 shadow-md">
                      <Image
                        src={qrCode}
                        alt="QR code to connect with Werkly on social channels"
                        width={144}
                        height={144}
                        className="h-36 w-36 rounded-xl object-contain"
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
