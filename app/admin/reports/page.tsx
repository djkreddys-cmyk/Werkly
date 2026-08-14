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
      eyebrow="ERP Reporting"
      title="Management reports, exceptions, and operational decisions."
      description="Start with the executive summary, clear urgent exceptions, then drill into jobs, candidates, clients, recruiters, HR, and monthly trends."
    >
      <AdminReportsPanel module="overview" />
    </AdminShell>
  );
}
