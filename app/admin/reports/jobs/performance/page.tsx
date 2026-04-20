import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminJobsPerformanceReportPage() {
  return (
    <AdminShell
      eyebrow="Job Performance"
      title="Review mandate performance and recruiter ownership."
      description="Track open, draft, and closed jobs with applications, recruiter ownership, latest movement, and client coverage on a dedicated jobs report."
    >
      <AdminReportsPanel module="jobs" report="jobs-performance" />
    </AdminShell>
  );
}
