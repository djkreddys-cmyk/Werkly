import dynamic from "next/dynamic";
import { AdminShell } from "@/components/admin-shell";
import { AdminPanelLoading } from "@/components/admin-panel-loading";

const AdminReportsPanel = dynamic(
  () =>
    import("@/components/admin-reports-panel").then(
      (module) => module.AdminReportsPanel
    ),
  {
    loading: () => <AdminPanelLoading label="Loading reports..." />,
  }
);

export default function AdminReportsPage() {
  return (
    <AdminShell
      eyebrow="Reports"
      title="Open the right CRM report for each module."
      description="Choose HR, Jobs, Candidates, or Clients reports separately so each screen stays focused on the data that belongs to that module."
    >
      <AdminReportsPanel module="overview" />
    </AdminShell>
  );
}
