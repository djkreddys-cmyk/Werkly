import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminJobsRecruiterWorkloadReportPage() {
  return (
    <AdminShell
      eyebrow="Recruiter Workload"
      title="Compare recruiter mandate and candidate load."
      description="Track jobs, applications, shortlist movement, interviews, offers, joining, and scheduled interviews by recruiter."
    >
      <AdminReportsPanel module="jobs" report="jobs-recruiter-workload" />
    </AdminShell>
  );
}
