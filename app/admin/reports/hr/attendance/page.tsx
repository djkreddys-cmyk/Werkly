import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminHrAttendanceReportPage() {
  return (
    <AdminShell
      eyebrow="HR Attendance"
      title="Review attendance, worked hours, and screen time."
      description="Track first login, last logout, worked hours, screen-active time, idle time, and auto logout details on a dedicated attendance report screen."
    >
      <AdminReportsPanel module="hr" report="hr-attendance" />
    </AdminShell>
  );
}
