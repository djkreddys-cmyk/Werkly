import type { Metadata } from "next";
import { ContentSection, PublicContentPage } from "@/components/public-content-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Werkly Consulting collects, uses, stores, and shares website, candidate, and employer information.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <PublicContentPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="This policy explains how Werkly Consulting Pvt LTD handles information submitted through this website and during recruitment activity. Last updated: 24 August 2026."
    >
      <div className="mx-auto max-w-5xl">
        <ContentSection title="Information we collect">
          <p>
            Candidates may provide name, email address, phone number, location, employment history, skills, compensation information, notice period, preferences, resume, documents, and messages. Employers and contacts may provide business contact details, company information, vacancy requirements, agreements, and communication records. The website may also receive technical information such as IP address, browser, device, referring page, and interaction data through hosting, security, analytics, consent, and advertising services.
          </p>
        </ContentSection>
        <ContentSection title="How information is used">
          <p>
            We use information to respond to enquiries; assess and coordinate applications; match candidates with relevant roles; communicate interview, status, offer, or joining information; deliver recruitment services; maintain records; prevent misuse; improve the website; meet contractual and legal obligations; and manage consent or advertising where applicable.
          </p>
          <p>
            A resume submitted for a specific vacancy may be shared with the employer or authorised hiring stakeholders for that vacancy. Where a candidate submits a general profile, we may contact the candidate before or when considering it for a relevant opportunity. We do not sell candidate resumes as a consumer data product.
          </p>
        </ContentSection>
        <ContentSection title="Advertising, cookies, and third-party services">
          <p>
            This website uses service providers for hosting, analytics, security, forms, email, and potentially advertising. Google AdSense may use cookies or similar technologies to serve and measure ads. Depending on location and consent choices, ads may be personalised or non-personalised. Users can review <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noreferrer" className="font-semibold text-[var(--color-dark)] underline">how Google uses information for advertising</a> and manage ad personalisation through Google&apos;s own controls.
          </p>
          <p>
            The site may display a consent message where required. Browser settings can block or remove cookies, although some site functions may be affected. External links are governed by the privacy practices of the destination service.
          </p>
        </ContentSection>
        <ContentSection title="Sharing, retention, and security">
          <p>
            Information may be shared with relevant employers, authorised recruiters, technology providers processing data for us, professional advisers, or authorities where required. Access is limited according to business need. We use reasonable administrative and technical measures, but no internet transmission or storage system can be guaranteed completely secure.
          </p>
          <p>
            Records are retained for the active recruitment purpose, service administration, dispute prevention, legal obligations, and a reasonable period for future relevant opportunities where permitted. Retention varies by record type and relationship. Information is deleted or de-identified when it is no longer reasonably required, subject to legal and backup limitations.
          </p>
        </ContentSection>
        <ContentSection title="Choices and contact">
          <p>
            A person may request access, correction, or deletion of personal information, withdraw a consent where processing relies on consent, or ask not to be considered for future roles. Some information may need to be retained where required for legal, security, or legitimate record-keeping purposes. We may verify identity before completing a request.
          </p>
          <p>
            Send privacy questions to <a href="mailto:hr@werkly.in" className="font-semibold text-[var(--color-dark)] underline">hr@werkly.in</a> with “Privacy Request” in the subject. Include enough information to locate the relevant record, but do not email passwords, bank details, or unnecessary identity documents.
          </p>
        </ContentSection>
      </div>
    </PublicContentPage>
  );
}
