import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminClientsFollowupsReportPage() {
  return (
    <AdminShell
      eyebrow="Client Follow-Ups"
      title="Review onboarding and client follow-up commitments."
      description="Filter client follow-up status by employee, client, related job, and date range on a separate follow-up report screen."
    >
      <AdminReportsPanel module="clients" report="clients-followups" />
    </AdminShell>
  );
}
