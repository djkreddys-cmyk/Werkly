import { AdminJobsDashboard } from "@/components/admin-jobs-dashboard";
import { AdminShell } from "@/components/admin-shell";

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
