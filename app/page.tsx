import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const services = [
  {
    title: "Search Strategy",
    description:
      "We shape the brief, tighten the scorecard, and map the market before outreach starts.",
  },
  {
    title: "Candidate Curation",
    description:
      "Every profile is screened for motivation, communication, and role alignment before it reaches your team.",
  },
  {
    title: "Hiring Operations",
    description:
      "Interview coordination, feedback loops, and close plans stay organized so momentum does not drop.",
  },
];

const processSteps = [
  "Clarify the role, team context, compensation band, and hiring must-haves.",
  "Launch focused outreach with tight screening and weekly hiring updates.",
  "Guide interviews and offers so the best candidates actually convert.",
];

const featuredRoles = [
  {
    title: "Founding Recruiter",
    team: "Seed to Series A startups",
    note: "Build the hiring engine from the ground up.",
  },
  {
    title: "Operations Lead",
    team: "High-growth service teams",
    note: "Own systems, delivery rigor, and team enablement.",
  },
  {
    title: "Growth Associate",
    team: "Modern GTM teams",
    note: "Blend research, outreach, and experiment velocity.",
  },
];

const stats = [
  { value: "7-21 days", label: "for first qualified shortlist" },
  { value: "Senior to entry", label: "roles supported across functions" },
  { value: "High-touch", label: "candidate communication at every stage" },
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
              <p className="eyebrow">Recruitment partner for growing teams</p>
              <div className="space-y-6">
                <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-none text-slate-950 sm:text-6xl lg:text-7xl">
                  Hire the right people before the market moves on.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
                  Werkly helps ambitious teams close roles with sharper briefs, stronger candidate calibration, and a hiring experience that feels premium from first touch to final offer.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Start a Search
                </a>
                <a
                  href="#roles"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-950"
                >
                  Explore Roles
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
                <p className="text-sm uppercase tracking-[0.22em] text-white/70">This is where we help most</p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-[1.4rem] bg-white/10 p-4">
                    <p className="text-sm text-white/65">Early-stage teams</p>
                    <p className="mt-1 text-lg font-semibold">Need a recruiting partner without building a full in-house function yet.</p>
                  </div>
                  <div className="rounded-[1.4rem] bg-white/10 p-4">
                    <p className="text-sm text-white/65">Growth teams</p>
                    <p className="mt-1 text-lg font-semibold">Need tighter process and better candidate conversion, not more noise.</p>
                  </div>
                  <div className="rounded-[1.4rem] bg-white/10 p-4">
                    <p className="text-sm text-white/65">Candidates</p>
                    <p className="mt-1 text-lg font-semibold">Get clearer communication, better context, and roles worth responding to.</p>
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
              <h2 className="section-title">A more deliberate way to run hiring.</h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              We partner with founders and hiring teams that want fewer resumes, stronger calibration, and a process candidates actually enjoy.
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
              <h2 className="section-title">Built for speed, but never at the cost of fit.</h2>
              <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Werkly keeps hiring simple enough to move fast and structured enough to make better decisions.
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
                <p className="eyebrow text-white/60">Open roles focus</p>
                <h2 className="font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
                  Typical searches we support.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-white/70 sm:text-lg">
                Use this as a signal for the kind of teams and hiring scopes we work well with. We can adapt the search around your stage.
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
                Tell us what you need to hire next.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Share the role, team size, and timeline. We will help you scope the search and recommend the right starting point.
              </p>
            </div>
            <div className="story-card">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Email</p>
                  <a className="mt-2 block text-lg font-semibold text-slate-950" href="mailto:hello@werkly.in">
                    hello@werkly.in
                  </a>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Domain</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">werkly.in</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Best for</p>
                  <p className="mt-2 text-base leading-7 text-slate-700">
                    Startups, service businesses, and teams making their first few critical hires.
                  </p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Response time</p>
                  <p className="mt-2 text-base leading-7 text-slate-700">
                    Usually within 1 business day for new hiring conversations.
                  </p>
                </div>
              </div>
              <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm leading-7 text-slate-600">
                  Prefer to launch fast? Start with a shortlist brief, target location, compensation range, and the one trait you refuse to compromise on.
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
