import { AdminJobsDashboard } from "@/components/admin-jobs-dashboard";
import { AdminShell } from "@/components/admin-shell";

export default function AdminExistingJobsPage() {
  return (
    <AdminShell
      eyebrow="Existing Jobs"
      title="Review published roles and drafts."
      description="Search, edit, and manage all existing job postings from one place."
    >
      <AdminJobsDashboard viewMode="existing" />
    </AdminShell>
  );
}
