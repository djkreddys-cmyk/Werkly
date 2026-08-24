import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentSection, PublicContentPage, RelatedLinks } from "@/components/public-content-page";
import { StructuredData } from "@/components/structured-data";
import { careerGuides, getCareerGuide } from "@/lib/career-guides";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

type GuidePageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return careerGuides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getCareerGuide(slug);
  if (!guide) return { title: "Guide Not Found", robots: { index: false, follow: false } };

  const path = `/career-guides/${guide.slug}`;
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.description,
      url: path,
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
    },
  };
}

export default async function CareerGuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getCareerGuide(slug);
  if (!guide) notFound();

  const canonicalUrl = absoluteUrl(`/career-guides/${guide.slug}`);
  const related = careerGuides
    .filter((item) => item.slug !== guide.slug)
    .map((item) => ({
      href: `/career-guides/${item.slug}`,
      label: item.title,
      description: item.description,
    }));

  return (
    <>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.description,
          datePublished: guide.publishedAt,
          dateModified: guide.updatedAt,
          mainEntityOfPage: canonicalUrl,
          author: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/about") },
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            logo: { "@type": "ImageObject", url: absoluteUrl("/Werkly%20Logo.png") },
          },
        }}
      />
      <PublicContentPage
        eyebrow={guide.category}
        title={guide.title}
        intro={guide.description}
      >
        <article className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] pb-5 text-sm text-[var(--color-muted)]">
            <span>Published 24 August 2026</span>
            <span aria-hidden="true">•</span>
            <span>{guide.readingTime}</span>
            <span aria-hidden="true">•</span>
            <span>Reviewed by Werkly Consulting</span>
          </div>
          {guide.sections.map((section) => (
            <ContentSection key={section.heading} title={section.heading}>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </ContentSection>
          ))}
          <div className="mt-9 bg-[rgba(8,96,108,0.06)] p-6 text-sm leading-7 text-[var(--color-muted)]">
            This guide provides general career information, not a promise of placement, interview selection, compensation, or employment. Always verify role and employer details before making a decision.
          </div>
          <RelatedLinks links={related} />
          <p className="mt-8 text-sm text-[var(--color-muted)]">
            <Link href="/career-guides" className="font-semibold text-[var(--color-dark)]">
              ← View all career guides
            </Link>
          </p>
        </article>
      </PublicContentPage>
    </>
  );
}

