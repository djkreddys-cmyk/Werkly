import { AdminFinancePanel } from "@/components/admin-finance-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminFinancePage() {
  return (
    <AdminShell
      eyebrow="Finance"
      title="Review generated invoices and receivables."
      description="Track every generated recruitment invoice after it is pushed from Client Invoices."
    >
      <AdminFinancePanel />
    </AdminShell>
  );
}
