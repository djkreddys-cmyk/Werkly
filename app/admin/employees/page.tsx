import { AdminEmployeesPanel } from "@/components/admin-crm-dashboard";
import { AdminShell } from "@/components/admin-shell";

export default function AdminEmployeesPage() {
  return (
    <AdminShell
      eyebrow="Werkly CRM"
      title="Create employee logins and manage internal access."
      description="Set up recruiter accounts, assign internal roles, and keep user access organized before clients and jobs are distributed."
    >
      <AdminEmployeesPanel />
    </AdminShell>
  );
}
