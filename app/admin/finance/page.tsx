import { AdminFinancePanel } from "@/components/admin-finance-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminFinancePage() {
  return (
    <AdminShell
      eyebrow="Finance"
      title="Manage invoices, income, and expenditure."
      description="Generate recruitment invoices, update payment details, and track complete finance records in one place."
    >
      <AdminFinancePanel />
    </AdminShell>
  );
}
