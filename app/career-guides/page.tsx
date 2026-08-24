import type { Metadata } from "next";
import Link from "next/link";
import { PublicContentPage } from "@/components/public-content-page";
import { careerGuides } from "@/lib/career-guides";

export const metadata: Metadata = {
  title: "Career Guides for Job Seekers",
  description:
    "Practical, original guidance from Werkly on resumes, interview preparation, job offers, and making informed career decisions.",
  alternates: { canonical: "/career-guides" },
  openGraph: {
    title: "Career Guides for Job Seekers | Werkly",
    description: "Clear and practical guidance for resumes, interviews, and career decisions.",
    url: "/career-guides",
  },
};

export default function CareerGuidesPage() {
  return (
    <PublicContentPage
      eyebrow="Career Resources"
      title="Practical guidance for more informed job searches."
      intro="These guides are written to help candidates present experience accurately, prepare with evidence, and evaluate opportunities beyond surface-level details."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {careerGuides.map((guide) => (
          <article key={guide.slug} className="accent-card flex flex-col p-7">
            <p className="eyebrow">{guide.category}</p>
            <h2 className="mt-4 text-2xl font-semibold leading-snug text-[var(--color-ink)]">
              <Link href={`/career-guides/${guide.slug}`} className="hover:text-[var(--color-dark)]">
                {guide.title}
              </Link>
            </h2>
            <p className="muted-copy mt-4 flex-1 text-base leading-7">{guide.description}</p>
            <div className="mt-6 flex items-center justify-between border-t border-[var(--color-line)] pt-4 text-sm">
              <span className="text-[var(--color-muted)]">{guide.readingTime}</span>
              <Link
                href={`/career-guides/${guide.slug}`}
                className="font-semibold text-[var(--color-dark)]"
              >
                Read guide →
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-10 border-l-2 border-[var(--color-accent)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[var(--color-ink)]">How this content is prepared</h2>
        <p className="muted-copy mt-3 max-w-4xl text-base leading-7">
          Werkly&apos;s guides focus on questions that arise during recruitment conversations. They provide general educational information, avoid guaranteed-outcome claims, and are reviewed for clarity and practical relevance. Read our{" "}
          <Link href="/editorial-policy" className="font-semibold text-[var(--color-dark)] underline">
            editorial policy
          </Link>{" "}
          for the standards behind this library.
        </p>
      </div>
    </PublicContentPage>
  );
}

