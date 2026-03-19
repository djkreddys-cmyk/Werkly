import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const services = [
  {
    title: "Executive & Mid-Level Hiring",
    description:
      "Targeted recruitment support for organizations looking to fill priority roles with speed and better profile quality.",
  },
  {
    title: "Candidate Placement Support",
    description:
      "Guidance for professionals seeking the right role with stronger communication, better alignment, and interview support.",
  },
  {
    title: "Sector-Focused Search",
    description:
      "Consultancy support across pharma, biotech, nutraceuticals, hospitality, operations, and allied industries.",
  },
];

const processSteps = [
  {
    title: "Requirement Discovery",
    description:
      "We understand the role, business need, or candidate profile before we begin outreach and matching.",
  },
  {
    title: "Shortlisting & Screening",
    description:
      "Profiles are screened carefully so employers meet stronger candidates and job seekers see relevant opportunities.",
  },
  {
    title: "Interview & Closure",
    description:
      "We support coordination, communication, and final steps to help both sides move forward confidently.",
  },
];

const sectors = [
  "Pharma & Life Sciences",
  "Biotech & Nutraceuticals",
  "Hospitality & Operations",
  "Allied Business Functions",
];

export default function Home() {
  return (
    <div id="top" className="relative">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-[var(--color-dark)]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                'linear-gradient(rgba(16,35,63,0.56), rgba(16,35,63,0.78)), url("https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80")',
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(228,212,188,0.12),transparent_40%)]" />
          <div className="section-shell relative py-18 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-4xl text-center text-white hero-frame rounded-[1.8rem] border border-white/10 bg-[rgba(10,22,42,0.2)] px-6 py-14 backdrop-blur-[2px] sm:px-10 sm:py-16 lg:px-14">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-accent)]">
                Werkly Job Consultancy
              </p>
              <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-[0.94] sm:text-6xl lg:text-[5.2rem]">
                Connecting top talent with the right companies.
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-white/82 sm:text-[1.15rem]">
                Werkly supports employers with structured hiring solutions and helps candidates discover better opportunities through a professional, responsive consultancy process.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href="#contact"
                  className="inline-flex min-w-[170px] items-center justify-center rounded-xl bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-dark)] transition hover:opacity-95"
                >
                  Get Started
                </a>
                <a
                  href="#services"
                  className="inline-flex min-w-[170px] items-center justify-center rounded-xl border border-[var(--color-accent)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-[rgba(228,212,188,0.1)]"
                >
                  Our Services
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="section-shell py-14 sm:py-18">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Services</p>
            <h2 className="mt-4 section-title">Professional recruitment support with a clear and modern approach.</h2>
            <p className="mt-4 text-base leading-7 muted-copy sm:text-lg">
              We work with both employers and candidates to make the hiring journey simpler, more focused, and more dependable.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {services.map((service) => (
              <article key={service.title} className="story-card p-7">
                <h3 className="text-2xl font-semibold text-slate-950">{service.title}</h3>
                <p className="mt-4 text-base leading-7 muted-copy">{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="process" className="section-shell py-14 sm:py-18">
          <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div className="space-y-4">
              <p className="eyebrow">Our Process</p>
              <h2 className="section-title">Simple, structured, and built around better fit.</h2>
              <p className="text-base leading-7 muted-copy sm:text-lg">
                Every mandate follows a focused process that improves communication, shortlisting quality, and overall hiring confidence.
              </p>
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

        <section id="roles" className="bg-[var(--color-dark)] py-14 sm:py-18">
          <div className="section-shell">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                Industry Focus
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-white sm:text-5xl">
                Sector knowledge that supports stronger hiring decisions.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/72 sm:text-lg">
                We support recruitment across industries where fit, communication, and screening quality matter most.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {sectors.map((sector) => (
                <article key={sector} className="rounded-[1.3rem] border border-[rgba(228,212,188,0.24)] bg-[rgba(228,212,188,0.07)] p-6 text-white">
                  <h3 className="text-xl font-semibold">{sector}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="section-shell py-14 sm:py-18">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="story-card p-8 sm:p-9">
              <p className="eyebrow">Contact Us</p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-slate-950 sm:text-5xl">
                Start a hiring conversation or share your job profile.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 muted-copy sm:text-lg">
                Employers can contact us with role details and timelines. Candidates can reach out with resumes, preferred sectors, and job locations.
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
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Website</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">www.werkly.in</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Consultancy Scope</p>
                  <p className="mt-2 text-base leading-7 muted-copy">
                    Hiring and placement support for employers and job seekers across multiple growth sectors.
                  </p>
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
