import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminHrReportsPage() {
  return (
    <AdminShell
      eyebrow="HR Reports"
      title="Review attendance, employee activity, and screen time."
      description="Track first login, last logout, worked hours, current employee status, and CRM screen activity for HR operations."
    >
      <AdminReportsPanel module="hr" />
    </AdminShell>
  );
}
