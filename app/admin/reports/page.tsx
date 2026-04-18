import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminReportsPage() {
  return (
    <AdminShell
      eyebrow="Reports"
      title="Review recruiter follow-ups and hiring movement."
      description="Use stage totals and recruiter-wise workload reporting to understand delivery progress, ownership, and end-of-day follow-up coverage."
    >
      <AdminReportsPanel />
    </AdminShell>
  );
}
