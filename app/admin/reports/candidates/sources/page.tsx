import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminCandidatesSourcesReportPage() {
  return (
    <AdminShell
      eyebrow="Source Mix"
      title="Review candidate source mix separately."
      description="Measure candidate volume by source on a dedicated screen so sourcing channels can be reviewed without mixing pipeline tables."
    >
      <AdminReportsPanel module="candidates" report="candidates-sources" />
    </AdminShell>
  );
}
