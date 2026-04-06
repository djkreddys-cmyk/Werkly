import { AdminJobsDashboard } from "@/components/admin-jobs-dashboard";
import { AdminShell } from "@/components/admin-shell";

export default function AdminJobsPage() {
  return (
    <AdminShell
      eyebrow="Werkly CRM"
      title="Manage openings, applications, and delivery activity."
      description="Post roles, edit active mandates, review applied candidates, and keep hiring execution structured inside the internal CRM."
    >
      <AdminJobsDashboard />
    </AdminShell>
  );
}
