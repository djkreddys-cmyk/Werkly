import { AdminShell } from "@/components/admin-shell";
import { AdminClientsWorkspace } from "@/components/admin-clients-workspace";

export default function AdminClientLeadsPage() {
  return (
    <AdminShell
      eyebrow="Clients"
      title="Manage leads and existing clients in one workspace."
      description="Switch between client leads and onboarded clients, then add new records from the selected view."
    >
      <AdminClientsWorkspace initialView="leads" />
    </AdminShell>
  );
}
