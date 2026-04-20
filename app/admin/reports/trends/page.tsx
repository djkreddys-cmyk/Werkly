import { AdminOperationsReports } from "@/components/admin-operations-reports";
import { AdminShell } from "@/components/admin-shell";

export default function AdminTrendReportPage() {
  return (
    <AdminShell
      eyebrow="Trend Report"
      title="Review monthly CRM movement."
      description="See trend visibility for jobs, clients, candidates, and team activity on a separate operations trend screen."
    >
      <AdminOperationsReports type="trends" />
    </AdminShell>
  );
}
