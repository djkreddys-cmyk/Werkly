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
      title="Command center for hiring, clients, and follow-ups."
      description="Monitor live work, overdue client commitments, approvals, and team execution from one operational dashboard."
    >
      <AdminDashboardOverview />
    </AdminShell>
  );
}
