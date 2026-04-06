import { AdminCrmDashboard } from "@/components/admin-crm-dashboard";
import { AdminJobsDashboard } from "@/components/admin-jobs-dashboard";
import { AdminShell } from "@/components/admin-shell";

export default function AdminJobsPage() {
  return (
    <AdminShell
      eyebrow="Werkly CRM"
      title="Manage openings, assignments, and team follow-ups."
      description="This internal workspace can grow into your CRM: post openings, assign clients to employees, review applied candidates, and build follow-up reporting in one place."
    >
      <div className="space-y-6">
        <AdminCrmDashboard />
        <AdminJobsDashboard />
      </div>
    </AdminShell>
  );
}
