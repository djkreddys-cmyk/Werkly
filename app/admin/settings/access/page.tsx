import { AdminSettingsPanel } from "@/components/admin-settings-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminSettingsAccessPage() {
  return (
    <AdminShell
      eyebrow="Access Control"
      title="Manage role defaults and employee-wise frontend permissions."
      description="Filter employees and give person-specific access like Add Candidate, Update Stage, or report download without changing everyone in the same role."
    >
      <AdminSettingsPanel section="access" />
    </AdminShell>
  );
}
