import { AdminCandidatesPanel } from "@/components/admin-candidates-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminCandidatesPage() {
  return (
    <AdminShell
      eyebrow="Job Applicants"
      title="Track candidates who applied to specific jobs."
      description="Review job applicants in one CRM table, search by mandate or recruiter, and move each profile through applied, shortlisted, interview, offer, and joined stages."
    >
      <AdminCandidatesPanel />
    </AdminShell>
  );
}
