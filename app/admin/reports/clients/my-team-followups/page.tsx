import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminClientsMyTeamFollowupsReportPage() {
  return (
    <AdminShell
      eyebrow="My Team Follow-Ups"
      title="Review client follow-ups for your reporting team."
      description="Reporting managers can track client follow-up commitments owned by themselves and their direct reports."
    >
      <AdminReportsPanel module="clients" report="clients-team-followups" />
    </AdminShell>
  );
}
