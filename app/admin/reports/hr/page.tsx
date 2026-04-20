import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminHrReportsPage() {
  return (
    <AdminShell
      eyebrow="HR Reports"
      title="Choose the HR report you want to review."
      description="Open attendance or employee activity on separate HR report screens so filters, exports, and day-wise review stay focused."
    >
      <AdminReportsPanel module="hr" report="index" />
    </AdminShell>
  );
}
