import { AdminClientsPanel } from "@/components/admin-crm-dashboard";
import { AdminShell } from "@/components/admin-shell";

export default function AdminClientsPage() {
  return (
    <AdminShell
      eyebrow="Werkly CRM"
      title="Onboard clients and assign them to the right team members."
      description="Capture company records, main contacts, and account ownership so follow-ups and hiring mandates stay clearly mapped."
    >
      <AdminClientsPanel />
    </AdminShell>
  );
}
