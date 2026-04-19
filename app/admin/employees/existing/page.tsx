import { AdminEmployeesPanel } from "@/components/admin-crm-dashboard";
import { AdminShell } from "@/components/admin-shell";

export default function AdminExistingEmployeesPage() {
  return (
    <AdminShell
      eyebrow="Existing Employees"
      title="Review all internal employees."
      description="Check employee records, status, and password reset actions on a dedicated existing employees page."
    >
      <AdminEmployeesPanel viewMode="existing" />
    </AdminShell>
  );
}
