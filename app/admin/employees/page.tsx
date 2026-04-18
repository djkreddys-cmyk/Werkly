import { AdminEmployeesPanel } from "@/components/admin-crm-dashboard";
import { AdminShell } from "@/components/admin-shell";

export default function AdminEmployeesPage() {
  return (
    <AdminShell
      eyebrow="Employees"
      title="Create employee access and role ownership."
      description="Set up recruiter logins, define user roles, and keep internal access structured across hiring operations."
    >
      <AdminEmployeesPanel />
    </AdminShell>
  );
}
