import Image from "next/image";
import Link from "next/link";

export function RecruitmentHero() {
  return (
    <section className="recruitment-hero" aria-labelledby="recruitment-heading">
      <div className="recruitment-hero-image">
        <Image src="/werkly-recruitment-hero.webp" alt="" fill sizes="100vw" preload className="object-cover" />
      </div>
      <div className="recruitment-hero-shade" />
      <div className="section-shell relative z-10">
        <div className="recruitment-hero-copy">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#f1b965]">People. Potential. Possibilities.</p>
          <h1 id="recruitment-heading" className="mt-6 font-[family-name:var(--font-display)] text-[clamp(2.6rem,4.6vw,4.8rem)] font-semibold leading-[1.06] tracking-[-0.045em] text-white">
            The right talent.<br /><span className="text-[#f1b965]">The next opportunity.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-white/85 sm:text-lg">Connecting IT and Non-IT professionals with teams ready to grow. Discover your next role or find recruitment support built around your business.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/jobs" className="hero-primary-action">Explore jobs <span aria-hidden="true">↗</span></Link>
            <Link href="/contact" className="hero-secondary-action">Hire with Werkly <span aria-hidden="true">↗</span></Link>
          </div>
          <p className="mt-7 text-xs font-medium tracking-wide text-white/65">IT & Non-IT recruitment <span aria-hidden="true" className="px-2">/</span> Search · Screen · Coordinate</p>
        </div>
      </div>
      <div className="relative z-10 border-t border-white/15 bg-[#082b30]/90">
        <div className="section-shell grid divide-y divide-white/15 md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            { href: "/jobs", label: "FOR CANDIDATES", title: "Find your next move", detail: "Explore current opportunities" },
            { href: "/services", label: "FOR EMPLOYERS", title: "Build your team", detail: "Discover our recruitment services" },
            { href: "/career-guides", label: "CAREER RESOURCES", title: "Prepare with confidence", detail: "Resume, interview and offer guidance" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group flex items-center justify-between gap-4 py-6 md:px-6 md:first:pl-0">
              <div><p className="text-[0.65rem] font-bold tracking-[0.2em] text-[#f1b965]">{item.label}</p><h2 className="mt-2 text-lg font-semibold text-white">{item.title}</h2><p className="mt-1 text-sm text-white/70">{item.detail}</p></div>
              <span aria-hidden="true" className="text-xl text-white transition-transform group-hover:translate-x-1">↗</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
