import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminClientsTransfersReportPage() {
  return (
    <AdminShell
      eyebrow="Client Transfers"
      title="Review client ownership transfer approvals."
      description="Track pending, approved, and rejected client transfer requests on a dedicated transfer report screen."
    >
      <AdminReportsPanel module="clients" report="clients-transfers" />
    </AdminShell>
  );
}
