import { AdminSettingsPanel } from "@/components/admin-settings-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminSettingsKpiPage() {
  return (
    <AdminShell
      eyebrow="KPI Settings"
      title="Manage recruiter, delivery, and leadership targets."
      description="Set daily target values on a separate KPI settings page."
    >
      <AdminSettingsPanel section="kpi" />
    </AdminShell>
  );
}
