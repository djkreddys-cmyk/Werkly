import { AdminDashboardOverview } from "@/components/admin-dashboard-overview";
import { AdminShell } from "@/components/admin-shell";

export default function AdminDashboardPage() {
  return (
    <AdminShell
      eyebrow="Werkly CRM"
      title="Run jobs, clients, and employee operations from one workspace."
      description="This dashboard gives you a cleaner CRM starting point for hiring activity, client onboarding, team access, and day-to-day recruitment execution."
    >
      <AdminDashboardOverview />
    </AdminShell>
  );
}
