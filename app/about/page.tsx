import type { Metadata } from "next";
import { ContentSection, PublicContentPage, RelatedLinks } from "@/components/public-content-page";

export const metadata: Metadata = {
  title: "About Werkly Consulting",
  description:
    "Learn how Werkly Consulting approaches IT and Non-IT recruitment, candidate communication, screening, and client delivery across India.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PublicContentPage
      eyebrow="About Werkly"
      title="Recruitment support grounded in role context and clear communication."
      intro="Werkly Consulting Pvt LTD is an India-based recruitment consultancy supporting IT, engineering, manufacturing, commercial, operations, and business hiring."
    >
      <div className="mx-auto max-w-5xl">
        <ContentSection title="What we are building">
          <p>
            Werkly was established in 2025 to provide focused search and selection support for employers that need more than a volume of profiles. Our work begins with the business need behind a vacancy: the outcome expected from the role, the experience that is essential, the skills that can be developed, and the practical conditions that candidates should understand.
          </p>
          <p>
            We support individual specialist positions as well as recurring and multi-role mandates. The delivery approach is the same in each case: clarify the brief, search relevant channels, screen against evidence, coordinate candidate communication, and keep hiring stakeholders informed about progress and constraints.
          </p>
        </ContentSection>
        <ContentSection title="How we work with candidates">
          <p>
            Candidates should know which role they are being considered for, what information is required, and what the next step means. Werkly records application and stage information to support this coordination. We encourage accurate resumes and transparent discussion of experience, location, notice period, and expectations.
          </p>
          <p>
            Werkly does not sell jobs or guarantee selection. Hiring decisions remain with the employer, and candidates should never pay an individual to obtain an interview or offer. Suspected impersonation or payment requests can be reported through our official contact details.
          </p>
        </ContentSection>
        <ContentSection title="How we work with employers">
          <p>
            A useful shortlist is based on agreed criteria rather than keyword similarity alone. We clarify reporting line, responsibilities, location, employment type, experience, compensation context, timeline, and decision process before or during search. When the market response differs from the brief, we communicate the evidence so the hiring team can make an informed adjustment.
          </p>
          <ul>
            <li>Role intake and search planning for IT and Non-IT positions</li>
            <li>Candidate sourcing, initial screening, and shortlist coordination</li>
            <li>Interview scheduling and stage communication</li>
            <li>Offer follow-up and joining coordination where included in the mandate</li>
          </ul>
        </ContentSection>
        <ContentSection title="Our operating principles">
          <p>
            We aim to communicate accurately, protect candidate information, avoid unsupported claims, and improve the quality of decisions on both sides of the hiring process. Speed matters in recruitment, but speed without role alignment creates repeated work. Our process is designed to balance turnaround with evidence and clarity.
          </p>
        </ContentSection>
        <RelatedLinks
          links={[
            { href: "/services", label: "Recruitment services", description: "See the scope and stages of Werkly's employer support." },
            { href: "/career-guides", label: "Career guides", description: "Read practical guidance prepared for candidates." },
          ]}
        />
      </div>
    </PublicContentPage>
  );
}

