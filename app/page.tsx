import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const services = [
  {
    title: "Recruitment for Employers",
    description:
      "Structured hiring support for companies that need qualified candidates, faster shortlists, and smoother interview coordination.",
  },
  {
    title: "Career Support for Candidates",
    description:
      "Role guidance, profile alignment, and access to relevant openings for professionals looking for their next opportunity.",
  },
  {
    title: "Specialized Industry Hiring",
    description:
      "Focused support across pharma, biotech, nutraceuticals, hospitality, operations, and allied business functions.",
  },
];

const audiences = [
  {
    title: "For Employers",
    points: [
      "Clear role briefing and requirement mapping",
      "Screened candidate shortlists",
      "Interview coordination and hiring follow-through",
    ],
  },
  {
    title: "For Candidates",
    points: [
      "Relevant job matching",
      "Professional communication during the process",
      "Guidance before interviews and final rounds",
    ],
  },
];

const processSteps = [
  {
    step: "01",
    title: "Understand the requirement",
    description:
      "We begin with a clear understanding of the hiring requirement or the candidate profile, including priorities, experience, and fit.",
  },
  {
    step: "02",
    title: "Shortlist with precision",
    description:
      "We filter opportunities and profiles carefully so the process starts with stronger relevance and better alignment.",
  },
  {
    step: "03",
    title: "Support final closure",
    description:
      "From interview scheduling to final communication, we help both sides move through the process with clarity and professionalism.",
  },
];

const sectors = [
  {
    title: "Pharma & Life Sciences",
    note: "Hiring support across research, quality, production, regulatory, and commercial functions.",
  },
  {
    title: "Biotech & Nutraceuticals",
    note: "Consultancy support for science-led businesses building specialized and growth-focused teams.",
  },
  {
    title: "Operations & Hospitality",
    note: "Reliable sourcing for operational, customer-facing, and business support roles.",
  },
];

const highlights = [
  { value: "Screened Profiles", label: "shared with employers" },
  { value: "Responsive Process", label: "for both companies and candidates" },
  { value: "Sector Coverage", label: "across high-demand industries" },
];

export default function Home() {
  return (
    <div id="top" className="relative">
      <SiteHeader />
      <main>
        <section className="section-shell py-14 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-8">
              <p className="eyebrow">Professional job consultancy</p>
              <div className="space-y-6">
                <h1 className="max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-tight text-slate-950 sm:text-6xl lg:text-7xl">
                  Clean, dependable hiring support for employers and job seekers.
                </h1>
                <p className="max-w-2xl text-lg leading-8 muted-copy sm:text-xl">
                  Werkly helps companies hire with more clarity and helps candidates explore the right opportunities with better guidance, communication, and role alignment.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold !text-white transition hover:opacity-95"
                >
                  Speak With Us
                </a>
                <a
                  href="#services"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  View Services
                </a>
              </div>
            </div>
            <div className="story-card space-y-6 p-8">
              <p className="eyebrow">Why Werkly</p>
              <div className="space-y-5">
                {highlights.map((item) => (
                  <div key={item.value} className="border-b border-slate-200 pb-5 last:border-b-0 last:pb-0">
                    <p className="text-2xl font-semibold text-slate-950">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 muted-copy">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell pb-8 sm:pb-12">
          <div className="grid gap-6 lg:grid-cols-2">
            {audiences.map((audience) => (
              <article key={audience.title} className="story-card p-8">
                <p className="eyebrow">{audience.title}</p>
                <ul className="mt-5 space-y-4">
                  {audience.points.map((point) => (
                    <li key={point} className="text-base leading-7 text-slate-700">
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="services" className="section-shell py-14 sm:py-20">
          <div className="max-w-3xl space-y-4">
            <p className="eyebrow">Services</p>
            <h2 className="section-title">Straightforward consultancy services with a professional approach.</h2>
            <p className="text-base leading-7 muted-copy sm:text-lg">
              We keep the process simple, responsive, and focused on better fit for both companies and applicants.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {services.map((service) => (
              <article key={service.title} className="story-card">
                <h3 className="text-2xl font-semibold text-slate-950">{service.title}</h3>
                <p className="mt-4 text-base leading-7 muted-copy">{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="process" className="section-shell py-14 sm:py-20">
          <div className="rounded-[2rem] border border-slate-200 bg-[var(--color-soft)] px-6 py-10 sm:px-8 lg:px-10">
            <div className="max-w-3xl space-y-4">
              <p className="eyebrow">Process</p>
              <h2 className="section-title">A smoother path from requirement to placement.</h2>
              <p className="text-base leading-7 muted-copy sm:text-lg">
                Each step is built to reduce noise, improve fit, and keep communication clear throughout the hiring journey.
              </p>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {processSteps.map((item) => (
                <article key={item.step} className="rounded-[1.25rem] border border-slate-200 bg-white p-6">
                  <p className="text-sm font-semibold text-[var(--color-accent)]">{item.step}</p>
                  <h3 className="mt-4 text-xl font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-base leading-7 muted-copy">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="roles" className="section-shell py-14 sm:py-20">
          <div className="max-w-3xl space-y-4">
            <p className="eyebrow">Industry Focus</p>
            <h2 className="section-title">Sector knowledge that helps hiring move with confidence.</h2>
            <p className="text-base leading-7 muted-copy sm:text-lg">
              We support recruitment needs across industries where screening quality and role fit matter most.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {sectors.map((sector) => (
              <article key={sector.title} className="story-card">
                <h3 className="text-2xl font-semibold text-slate-950">{sector.title}</h3>
                <p className="mt-4 text-base leading-7 muted-copy">{sector.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="section-shell py-14 sm:py-20">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="story-card p-8 sm:p-10">
              <p className="eyebrow">Contact</p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-slate-950 sm:text-5xl">
                Let’s discuss your hiring need or career move.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 muted-copy sm:text-lg">
                Employers can reach out with role details, team requirements, and timelines. Candidates can share their profile, preferred sector, and target location.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href="mailto:hr@werkly.in"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold !text-white transition hover:opacity-95"
                >
                  Email HR Team
                </a>
                <a
                  href="mailto:info@werkly.in"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  General Enquiries
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
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Consultancy Focus</p>
                  <p className="mt-2 text-base leading-7 muted-copy">
                    Professional hiring support for employers and dependable guidance for job seekers across multiple sectors.
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
