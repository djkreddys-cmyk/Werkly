import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminCandidatesPipelineReportPage() {
  return (
    <AdminShell
      eyebrow="Candidate Pipeline"
      title="Review candidate stage, source, and recruiter ownership."
      description="Track job applicants with source, stage, client, recruiter, and applied date on a dedicated pipeline report screen."
    >
      <AdminReportsPanel module="candidates" report="candidates-pipeline" />
    </AdminShell>
  );
}
