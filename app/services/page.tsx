import type { Metadata } from "next";
import { ContentSection, PublicContentPage, RelatedLinks } from "@/components/public-content-page";

export const metadata: Metadata = {
  title: "IT and Non-IT Recruitment Services",
  description:
    "Understand Werkly's recruitment process for role intake, sourcing, screening, shortlisting, interview coordination, and hiring follow-up.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <PublicContentPage
      eyebrow="Employer Services"
      title="A clear recruitment process from role brief to joining follow-up."
      intro="Werkly provides search and selection support tailored to the role, hiring volume, market, and internal decision process of each employer."
    >
      <div className="mx-auto max-w-5xl">
        <ContentSection title="Role intake and search planning">
          <p>
            Search quality depends on the initial brief. We review the role purpose, reporting line, responsibilities, essential and preferred skills, relevant industries, location, employment type, compensation context, notice-period tolerance, and interview stages. This helps distinguish true requirements from preferences and identifies likely search constraints early.
          </p>
          <p>
            The resulting search plan can combine database review, professional networks, referrals, job platforms, and targeted outreach. Channel selection depends on seniority, skill availability, location, and the urgency of the mandate rather than a single fixed sourcing method.
          </p>
        </ContentSection>
        <ContentSection title="Candidate screening and shortlist preparation">
          <p>
            Initial screening compares resume evidence and candidate discussion with the agreed brief. Depending on the role, this may include relevant experience, applied skills, project or industry context, current responsibilities, location, availability, compensation expectations, and motivation for change.
          </p>
          <p>
            A shortlist is intended to help the employer decide whom to interview; it is not a guarantee that every candidate will meet every preference. We highlight material gaps or pending information rather than presenting assumptions as facts.
          </p>
        </ContentSection>
        <ContentSection title="Interview and stage coordination">
          <p>
            Werkly can coordinate availability, meeting details, reminders, feedback follow-up, and candidate stage communication. Clear scheduling reduces missed interviews and gives both sides an opportunity to prepare. Employers retain control of assessment criteria and final hiring decisions.
          </p>
          <ul>
            <li>Single specialist and replacement hiring</li>
            <li>Multiple-role and recurring recruitment support</li>
            <li>IT, engineering, manufacturing, operations, HR, finance, sales, and support functions</li>
            <li>Interview scheduling, offer follow-up, and joining coordination when agreed</li>
          </ul>
        </ContentSection>
        <ContentSection title="What employers can expect">
          <p>
            Before engagement, the scope, commercial terms, responsibilities, and communication contacts should be agreed. During delivery, we aim to provide realistic progress information—including when the market response is limited or requirements conflict. Reliable recruitment requires timely feedback from the hiring team and accurate information for candidates.
          </p>
          <p>
            To discuss a requirement, share the position title, location, experience range, key responsibilities, must-have skills, employment type, number of openings, target timeline, and appropriate company contact through the enquiry form or official email.
          </p>
        </ContentSection>
        <RelatedLinks
          links={[
            { href: "/contact", label: "Contact Werkly", description: "Use verified company channels for hiring and candidate enquiries." },
            { href: "/jobs", label: "Current openings", description: "Review active positions published through Werkly." },
          ]}
        />
      </div>
    </PublicContentPage>
  );
}

