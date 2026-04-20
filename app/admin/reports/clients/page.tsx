import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminClientsReportsPage() {
  return (
    <AdminShell
      eyebrow="Clients Reports"
      title="Choose the client report you want to review."
      description="Open client coverage, follow-up reports, and transfer approvals on their own report screens for cleaner CRM reporting."
    >
      <AdminReportsPanel module="clients" report="index" />
    </AdminShell>
  );
}
