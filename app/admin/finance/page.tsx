import { AdminFinancePanel } from "@/components/admin-finance-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminFinancePage() {
  return (
    <AdminShell
      eyebrow="Finance"
      title="Manage invoices, income, and expenditure."
      description="Generate recruitment invoices and update payment details."
    >
      <AdminFinancePanel view="invoices" />
    </AdminShell>
  );
}
