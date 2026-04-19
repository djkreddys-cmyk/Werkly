import { AdminJobsDashboard } from "@/components/admin-jobs-dashboard";
import { AdminShell } from "@/components/admin-shell";

export default function AdminNewJobsPage() {
  return (
    <AdminShell
      eyebrow="New Job"
      title="Create and publish a new opening."
      description="Add a new mandate, assign it to the right client and recruiter, and prepare it for publishing."
    >
      <AdminJobsDashboard viewMode="new" />
    </AdminShell>
  );
}
