import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminClientsReportsPage() {
  return (
    <AdminShell
      eyebrow="Clients Reports"
      title="Review client ownership, linked jobs, and transfer approvals."
      description="Track client allocation, linked mandates, candidate volume, and transfer approval status in one dedicated client reports page."
    >
      <AdminReportsPanel module="clients" />
    </AdminShell>
  );
}
