import { AdminClientsPanel } from "@/components/admin-crm-dashboard";
import { AdminShell } from "@/components/admin-shell";

export default function AdminNewClientsPage() {
  return (
    <AdminShell
      eyebrow="New Client"
      title="Register a new client account."
      description="Capture client details, assign ownership, and complete onboarding in a dedicated page."
    >
      <AdminClientsPanel viewMode="new" />
    </AdminShell>
  );
}
