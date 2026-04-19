import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminReportsPage() {
  return (
    <AdminShell
      eyebrow="Reports"
      title="Open the right CRM report for each module."
      description="Choose HR, Jobs, Candidates, or Clients reports separately so each screen stays focused on the data that belongs to that module."
    >
      <AdminReportsPanel module="overview" />
    </AdminShell>
  );
}
