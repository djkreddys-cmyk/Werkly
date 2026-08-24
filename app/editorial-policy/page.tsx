import type { Metadata } from "next";
import { ContentSection, PublicContentPage } from "@/components/public-content-page";

export const metadata: Metadata = {
  title: "Editorial Policy",
  description: "The standards Werkly uses for original career guidance, accuracy, review, corrections, and commercial independence.",
  alternates: { canonical: "/editorial-policy" },
};

export default function EditorialPolicyPage() {
  return (
    <PublicContentPage
      eyebrow="Content Standards"
      title="Editorial Policy"
      intro="Werkly publishes practical recruitment and career information designed to help readers make informed decisions without promising outcomes."
    >
      <div className="mx-auto max-w-5xl">
        <ContentSection title="Purpose and authorship">
          <p>
            Career guides are prepared for questions commonly encountered in recruitment, including resume clarity, interview preparation, offer evaluation, and safe candidate communication. Content is developed and reviewed by Werkly Consulting rather than automatically copied from job descriptions, other publishers, or employer materials.
          </p>
        </ContentSection>
        <ContentSection title="Accuracy and practical limits">
          <p>
            We distinguish general guidance from facts about a particular vacancy or employer. Advice should be explainable, realistic, and usable without inventing statistics or guaranteeing selection. Employment practices and legal requirements can differ by employer, contract, state, and country; readers should obtain qualified advice for legal, tax, immigration, financial, or medical decisions.
          </p>
        </ContentSection>
        <ContentSection title="Review and corrections">
          <p>
            Guides show a published or updated date and are reviewed when a material process, policy, or factual issue changes. Spelling or formatting corrections may not receive a new date. If a reader identifies a material error, they can email hr@werkly.in with the page URL and supporting detail. We assess corrections based on evidence rather than commercial pressure.
          </p>
        </ContentSection>
        <ContentSection title="Advertising and independence">
          <p>
            Advertising may appear on some public pages. Advertisers do not approve Werkly&apos;s editorial guidance and payment for an advertisement does not guarantee favourable coverage, candidate selection, or inclusion in a job listing. Sponsored employer material, if introduced, should be identified so readers can distinguish it from independent guidance and ordinary vacancies.
          </p>
        </ContentSection>
        <ContentSection title="Responsible use">
          <p>
            Our content avoids encouraging resume fraud, hidden payment for employment, discriminatory screening, misuse of personal data, or deceptive interviewing. Readers should adapt general guidance to their own truthful experience and verify employer, role, compensation, and offer details through official channels.
          </p>
        </ContentSection>
      </div>
    </PublicContentPage>
  );
}

