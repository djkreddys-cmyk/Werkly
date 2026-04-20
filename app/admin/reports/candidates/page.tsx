import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminCandidatesReportsPage() {
  return (
    <AdminShell
      eyebrow="Candidates Reports"
      title="Choose the candidate report you want to review."
      description="Open job applicant pipeline, source mix, and website enquiries on separate candidate report screens."
    >
      <AdminReportsPanel module="candidates" report="index" />
    </AdminShell>
  );
}
