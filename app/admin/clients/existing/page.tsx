import { AdminClientsPanel } from "@/components/admin-crm-dashboard";
import { AdminShell } from "@/components/admin-shell";

export default function AdminExistingClientsPage() {
  return (
    <AdminShell
      eyebrow="Existing Clients"
      title="Review all onboarded clients."
      description="Browse current clients, linked jobs, owners, and agreement status on a dedicated page."
    >
      <AdminClientsPanel viewMode="existing" />
    </AdminShell>
  );
}
