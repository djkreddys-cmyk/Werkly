import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminCandidatesReportsPage() {
  return (
    <AdminShell
      eyebrow="Candidates Reports"
      title="Review candidate pipeline and enquiry conversion."
      description="Track stage-wise candidate movement, application sources, website enquiries, and recruiter ownership in a separate candidate reports view."
    >
      <AdminReportsPanel module="candidates" />
    </AdminShell>
  );
}
