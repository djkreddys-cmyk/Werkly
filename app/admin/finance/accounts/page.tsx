import { AdminFinancePanel } from "@/components/admin-finance-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminFinanceAccountsPage() {
  return (
    <AdminShell
      eyebrow="Finance"
      title="Manage Werkly accounts."
      description="Add bank details and track income and expenditure by account."
    >
      <AdminFinancePanel view="accounts" />
    </AdminShell>
  );
}
