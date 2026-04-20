import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminJobsStageMovementReportPage() {
  return (
    <AdminShell
      eyebrow="Stage Movement"
      title="Review candidate stage movement by job."
      description="Audit every pipeline change with from stage, to stage, effective date, remarks, and changed time on a separate jobs report screen."
    >
      <AdminReportsPanel module="jobs" report="jobs-stage-movement" />
    </AdminShell>
  );
}
