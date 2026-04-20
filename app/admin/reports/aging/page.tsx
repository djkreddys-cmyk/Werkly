import { AdminOperationsReports } from "@/components/admin-operations-reports";
import { AdminShell } from "@/components/admin-shell";

export default function AdminAgingReportPage() {
  return (
    <AdminShell
      eyebrow="Aging Report"
      title="Track stale work before it slips."
      description="Review aging across open jobs, clients waiting on follow-up, and candidates stuck in stage from one operational report."
    >
      <AdminOperationsReports type="aging" />
    </AdminShell>
  );
}
