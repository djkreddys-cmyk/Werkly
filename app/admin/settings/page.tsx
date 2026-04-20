import { AdminSettingsPanel } from "@/components/admin-settings-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminSettingsPage() {
  return (
    <AdminShell
      eyebrow="CRM Settings"
      title="Manage KPI targets and reminder preferences."
      description="Configure recruiter productivity targets, browser reminder behavior, and the future delivery channels used by the CRM notification center."
    >
      <AdminSettingsPanel />
    </AdminShell>
  );
}
