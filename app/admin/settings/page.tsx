import { AdminSettingsPanel } from "@/components/admin-settings-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminSettingsPage() {
  return (
    <AdminShell
      eyebrow="CRM Settings"
      title="Settings home with KPI, notification, and access control pages."
      description="Open separate settings pages for KPI targets, reminder channels, and employee-wise access control."
    >
      <AdminSettingsPanel section="index" />
    </AdminShell>
  );
}
