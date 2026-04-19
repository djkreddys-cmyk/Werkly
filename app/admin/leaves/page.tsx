import { AdminLeavesPanel } from "@/components/admin-leaves-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminLeavesPage() {
  return (
    <AdminShell
      eyebrow="Leaves"
      title="Manage leave types, balances, and employee requests."
      description="Create leave categories, assign balances to employees, and review submitted leave requests in one workspace."
    >
      <AdminLeavesPanel />
    </AdminShell>
  );
}
