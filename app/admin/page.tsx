import dynamic from "next/dynamic";
import { AdminShell } from "@/components/admin-shell";
import { AdminPanelLoading } from "@/components/admin-panel-loading";

const AdminDashboardOverview = dynamic(
  () =>
    import("@/components/admin-dashboard-overview").then(
      (module) => module.AdminDashboardOverview
    ),
  {
    loading: () => <AdminPanelLoading label="Loading dashboard..." />,
  }
);

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
