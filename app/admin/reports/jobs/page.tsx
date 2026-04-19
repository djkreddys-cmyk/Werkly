import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminJobsReportsPage() {
  return (
    <AdminShell
      eyebrow="Jobs Reports"
      title="Review mandate performance and stage movement."
      description="Track job-wise applications, open and closed mandates, recruiter ownership, and stage movement across active roles."
    >
      <AdminReportsPanel module="jobs" />
    </AdminShell>
  );
}
