import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const services = [
  {
    title: "Permanent Hiring",
    description:
      "We help companies close full-time roles with targeted sourcing, screening, and interview coordination.",
  },
  {
    title: "Executive & Mid-Senior Search",
    description:
      "From leadership hires to specialist roles, we run focused searches with strong market mapping and shortlist quality.",
  },
  {
    title: "Candidate Consulting",
    description:
      "We guide job seekers with role matching, interview readiness, and better visibility into active opportunities.",
  },
];

const processSteps = [
  "Understand the company brief or candidate profile, including skills, location, and hiring priorities.",
  "Match the right opportunities through targeted sourcing, pre-screening, and market outreach.",
  "Support interviews, feedback, and final closure so hiring and job search decisions move faster.",
];

const featuredRoles = [
  {
    title: "Pharma & Life Sciences",
    team: "Research, quality, production",
    note: "Specialized hiring support for regulated, technical, and growth-stage life sciences teams.",
  },
  {
    title: "Biotech & Nutraceuticals",
    team: "Innovation-led businesses",
    note: "Shortlists shaped for companies building in healthcare, wellness, and advanced science-led markets.",
  },
  {
    title: "Operations, Hospitality & Allied Industries",
    team: "Business-critical roles",
    note: "Reliable recruitment support for frontline, operational, and business support teams.",
  },
];

const stats = [
  { value: "Employers", label: "get screened candidates, faster closures, and smoother hiring coordination" },
  { value: "Job Seekers", label: "get clearer opportunities, role matching, and interview support" },
  { value: "Multiple Sectors", label: "covered across pharma, biotech, operations, and allied hiring" },
];

export default function Home() {
  return (
    <div id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,#ffffff_0%,rgba(255,255,255,0.65)_35%,transparent_70%)]" />
      <SiteHeader />
      <main>
        <section className="section-shell py-10 sm:py-16">
          <div className="glass-panel grid overflow-hidden rounded-[2rem] border border-white/70 shadow-[0_24px_80px_rgba(18,32,47,0.12)] lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8 px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
              <p className="eyebrow">Job consultancy for employers and candidates</p>
              <div className="space-y-6">
                <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-none text-slate-950 sm:text-6xl lg:text-7xl">
                  Connecting the right talent with the right opportunity.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
                  Werkly is a job consultancy that supports companies with dependable hiring solutions and helps candidates discover roles that align with their experience, goals, and growth plans.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(15,23,42,0.22)] transition hover:bg-slate-800"
                >
                  Hire With Werkly
                </a>
                <a
                  href="#roles"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
                >
                  Explore Sectors
                </a>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.value} className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4">
                    <p className="text-2xl font-semibold text-slate-950">{stat.value}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative flex min-h-[360px] items-end bg-[linear-gradient(160deg,#132235_0%,#1f3149_52%,#ea7b61_145%)] p-6 sm:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,184,96,0.3),transparent_24%),radial-gradient(circle_at_80%_35%,rgba(255,255,255,0.14),transparent_18%)]" />
              <div className="relative ml-auto w-full max-w-md rounded-[2rem] border border-white/15 bg-white/10 p-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                <p className="text-sm uppercase tracking-[0.22em] text-white/70">How we add value</p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-[1.4rem] bg-white/10 p-4">
                    <p className="text-sm text-white/65">Employers</p>
                    <p className="mt-1 text-lg font-semibold">Get qualified profiles, shortlist support, and a consultancy partner who understands hiring urgency.</p>
                  </div>
                  <div className="rounded-[1.4rem] bg-white/10 p-4">
                    <p className="text-sm text-white/65">Job seekers</p>
                    <p className="mt-1 text-lg font-semibold">Access curated openings, better communication, and guidance before interviews.</p>
                  </div>
                  <div className="rounded-[1.4rem] bg-white/10 p-4">
                    <p className="text-sm text-white/65">Industry coverage</p>
                    <p className="mt-1 text-lg font-semibold">Support across pharma, biotech, nutraceuticals, hospitality, construction systems, and allied sectors.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="section-shell py-14 sm:py-20">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="eyebrow">Services</p>
              <h2 className="section-title">Consultancy support built for both hiring teams and candidates.</h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Whether you are filling a role or looking for your next move, Werkly brings structured guidance, real screening, and responsive communication.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {services.map((service, index) => (
              <article key={service.title} className="story-card">
                <p className="text-sm font-semibold text-slate-400">0{index + 1}</p>
                <h3 className="mt-5 text-2xl font-semibold text-slate-950">{service.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-600">{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="process" className="section-shell py-14 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="space-y-4">
              <p className="eyebrow">Process</p>
              <h2 className="section-title">A practical hiring and placement process that keeps decisions moving.</h2>
              <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                We keep the process straightforward so employers see relevant candidates quickly and applicants stay informed at every stage.
              </p>
            </div>
            <div className="space-y-4">
              {processSteps.map((step, index) => (
                <div key={step} className="story-card flex gap-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-mist)] text-sm font-semibold text-slate-950">
                    0{index + 1}
                  </div>
                  <p className="pt-2 text-base leading-7 text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="roles" className="section-shell py-14 sm:py-20">
          <div className="rounded-[2rem] bg-slate-950 px-6 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <p className="eyebrow text-white/60">Industry focus</p>
                <h2 className="font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
                  The sectors where we actively support hiring.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-white/70 sm:text-lg">
                Our consultancy model is shaped around sectors where role fit, responsiveness, and screening quality matter most.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {featuredRoles.map((role) => (
                <article key={role.title} className="rounded-[1.75rem] border border-white/12 bg-white/6 p-6">
                  <p className="text-sm uppercase tracking-[0.18em] text-white/55">{role.team}</p>
                  <h3 className="mt-5 text-2xl font-semibold">{role.title}</h3>
                  <p className="mt-4 text-base leading-7 text-white/72">{role.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="section-shell py-14 sm:py-20">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="story-card bg-[linear-gradient(180deg,#fffdf9_0%,#fff7f1_100%)]">
              <p className="eyebrow">Contact</p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-slate-950">
                Tell us whether you are hiring or looking for a new role.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Companies can share role requirements and timelines. Candidates can share their profile, preferred location, and target opportunities.
              </p>
            </div>
            <div className="story-card">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Email</p>
                  <a className="mt-2 block text-lg font-semibold text-slate-950" href="mailto:hr@werkly.in">
                    hr@werkly.in
                  </a>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Domain</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">werkly.in</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Best for</p>
                  <p className="mt-2 text-base leading-7 text-slate-700">
                    Employers hiring across core business functions and candidates seeking structured job consultancy support.
                  </p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Response time</p>
                  <p className="mt-2 text-base leading-7 text-slate-700">
                    Usually within 1 business day for new hiring requests and candidate inquiries.
                  </p>
                </div>
              </div>
              <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm leading-7 text-slate-600">
                  Employers can share role details and team requirements. Candidates can reach out with resumes, experience summaries, and preferred job locations.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
