import type { Metadata } from "next";
import { ContentSection, PublicContentPage } from "@/components/public-content-page";

export const metadata: Metadata = {
  title: "Website Terms of Use",
  description: "Terms governing use of the Werkly website, job information, candidate submissions, and external links.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PublicContentPage
      eyebrow="Legal"
      title="Website Terms of Use"
      intro="These terms apply when using werkly.in, viewing vacancies, submitting information, or using website tools. Last updated: 24 August 2026."
    >
      <div className="mx-auto max-w-5xl">
        <ContentSection title="Website purpose">
          <p>
            Werkly provides recruitment information, career resources, employer enquiry options, job listings, and candidate submission tools. Website content is general information and may change as roles, employer requirements, and services change. Use of the site does not create an employment relationship or guarantee an interview, shortlist, offer, placement, response time, or compensation outcome.
          </p>
        </ContentSection>
        <ContentSection title="Job listings and applications">
          <p>
            We aim to publish accurate information supplied or approved for recruitment, but vacancies may be amended, paused, filled, withdrawn, or closed without notice. Candidates are responsible for providing truthful, current information and ensuring they have the right to share submitted documents. Employers remain responsible for selection decisions, employment terms, and workplace representations.
          </p>
          <p>
            Do not submit unlawful material, malicious files, another person&apos;s resume without authority, or unnecessary sensitive information. Werkly may reject, remove, restrict, or investigate submissions that appear fraudulent, abusive, insecure, or unrelated to a legitimate recruitment purpose.
          </p>
        </ContentSection>
        <ContentSection title="No candidate fee or guaranteed job">
          <p>
            Werkly does not guarantee employment and candidates should not pay an individual to obtain an interview or offer. If someone claims to represent Werkly and requests payment, bank credentials, passwords, or remote access to a device, stop the interaction and report it through the contact page. Always confirm written offers and employer details independently.
          </p>
        </ContentSection>
        <ContentSection title="Content and acceptable use">
          <p>
            Website text, design, branding, and original guides are owned by or licensed to Werkly and may not be republished as a competing service without permission. Reasonable linking and quotation with attribution are permitted where lawful. Users must not scrape personal data, interfere with security, overwhelm services, impersonate others, or use the website for spam or unlawful discrimination.
          </p>
        </ContentSection>
        <ContentSection title="External services and limitation">
          <p>
            Links, advertisements, meeting tools, social platforms, and other third-party services are controlled by their providers. Werkly is not responsible for their availability or separate terms. To the extent permitted by applicable law, Werkly is not liable for indirect loss arising solely from reliance on general website content, a third-party service, or a vacancy that changes or closes.
          </p>
          <p>
            Nothing in these terms excludes rights or responsibilities that cannot lawfully be excluded. Questions can be sent to <a href="mailto:hr@werkly.in" className="font-semibold text-[var(--color-dark)] underline">hr@werkly.in</a>. Continued use after a published update means the updated terms apply from their stated date.
          </p>
        </ContentSection>
      </div>
    </PublicContentPage>
  );
}

