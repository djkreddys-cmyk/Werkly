import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminClientsLeadConversionReportPage() {
  return (
    <AdminShell
      eyebrow="Lead Conversion"
      title="Track client lead progress and conversion."
      description="Review lead source, owner, onboarding stage, follow-up status, linked jobs, applications, joining output, and conversion outcome."
    >
      <AdminReportsPanel module="clients" report="clients-lead-conversion" />
    </AdminShell>
  );
}
