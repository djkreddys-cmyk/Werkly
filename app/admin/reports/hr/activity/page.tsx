import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminHrActivityReportPage() {
  return (
    <AdminShell
      eyebrow="Employee Activity"
      title="Review employee visibility and current activity."
      description="Track date of joining, screen time, idle time, last seen, first login, last logout, and employee status on a separate HR activity screen."
    >
      <AdminReportsPanel module="hr" report="hr-activity" />
    </AdminShell>
  );
}
