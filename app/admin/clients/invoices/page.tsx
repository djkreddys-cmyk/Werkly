import { AdminClientInvoicesPanel } from "@/components/admin-client-invoices-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminClientInvoicesPage() {
  return (
    <AdminShell
      eyebrow="Client Invoices"
      title="Generate invoices against recruitment fillups."
      description="Select a client, pull joined candidates from CRM, review billing details, and create a printable invoice."
    >
      <AdminClientInvoicesPanel />
    </AdminShell>
  );
}
