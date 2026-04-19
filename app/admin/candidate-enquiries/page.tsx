import { AdminCandidateEnquiriesPanel } from "@/components/admin-candidate-enquiries-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminCandidateEnquiriesPage() {
  return (
    <AdminShell
      eyebrow="Candidate Enquiries"
      title="Review website candidate enquiries separately from job applicants."
      description="Track candidates who submitted their profile through the website enquiry form without applying against a specific job opening."
    >
      <AdminCandidateEnquiriesPanel />
    </AdminShell>
  );
}
