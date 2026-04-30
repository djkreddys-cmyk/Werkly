import { AdminClientsPanel } from "@/components/admin-crm-dashboard";
import { AdminShell } from "@/components/admin-shell";

export default function AdminClientLeadsPage() {
  return (
    <AdminShell
      eyebrow="Client Leads"
      title="Track client leads and follow-up commitments."
      description="Work lead-stage client accounts separately from onboarded clients, review next follow-up dates, and update ownership or lead movement from one dedicated screen."
    >
      <AdminClientsPanel viewMode="leads" />
    </AdminShell>
  );
}
