import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminJobsReportsPage() {
  return (
    <AdminShell
      eyebrow="Jobs Reports"
      title="Choose the jobs report you want to review."
      description="Open job performance or stage movement on individual report screens based on the current CRM process."
    >
      <AdminReportsPanel module="jobs" report="index" />
    </AdminShell>
  );
}
