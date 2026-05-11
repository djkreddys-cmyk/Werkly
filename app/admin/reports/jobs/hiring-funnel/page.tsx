import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminJobsHiringFunnelReportPage() {
  return (
    <AdminShell
      eyebrow="Hiring Funnel"
      title="Measure job pipeline conversion."
      description="Review applied, shortlisted, interview, offer, joined, and rejection movement across selected jobs, clients, recruiters, and dates."
    >
      <AdminReportsPanel module="jobs" report="jobs-hiring-funnel" />
    </AdminShell>
  );
}
