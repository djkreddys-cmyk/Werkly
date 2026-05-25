import { AdminShell } from "@/components/admin-shell";
import { AdminClientsWorkspace } from "@/components/admin-clients-workspace";

export default function AdminNewClientsPage() {
  return (
    <AdminShell
      eyebrow="Clients"
      title="Manage leads and existing clients in one workspace."
      description="The New Client page has moved into the Existing Clients view as an Add New Client popup."
    >
      <AdminClientsWorkspace initialView="existing" />
    </AdminShell>
  );
}
