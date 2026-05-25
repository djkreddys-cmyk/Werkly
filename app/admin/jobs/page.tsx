import dynamic from "next/dynamic";
import { AdminShell } from "@/components/admin-shell";
import { AdminPanelLoading } from "@/components/admin-panel-loading";

const AdminJobsDashboard = dynamic(
  () =>
    import("@/components/admin-jobs-dashboard").then(
      (module) => module.AdminJobsDashboard
    ),
  {
    loading: () => <AdminPanelLoading label="Loading jobs workspace..." />,
  }
);

export default function AdminJobsPage() {
  return (
    <AdminShell
      eyebrow="Jobs Workspace"
      title="Manage openings, applications, and publishing."
      description="Create mandates, assign them to clients, review applied candidates, and control which jobs are live on the public website."
    >
      <AdminJobsDashboard />
    </AdminShell>
  );
}
