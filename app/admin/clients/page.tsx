import { AdminClientsPanel } from "@/components/admin-crm-dashboard";
import { AdminShell } from "@/components/admin-shell";

export default function AdminClientsPage() {
  return (
    <AdminShell
      eyebrow="Clients"
      title="Onboard clients and assign delivery responsibility."
      description="Register client accounts, upload signed agreements, and map each account to the right internal owner before hiring starts."
    >
      <AdminClientsPanel />
    </AdminShell>
  );
}
