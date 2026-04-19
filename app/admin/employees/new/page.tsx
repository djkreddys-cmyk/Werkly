import { AdminEmployeesPanel } from "@/components/admin-crm-dashboard";
import { AdminShell } from "@/components/admin-shell";

export default function AdminNewEmployeesPage() {
  return (
    <AdminShell
      eyebrow="Employee Creation"
      title="Create internal employee logins."
      description="Add internal users and reset passwords from a dedicated employee creation page."
    >
      <AdminEmployeesPanel viewMode="new" />
    </AdminShell>
  );
}
