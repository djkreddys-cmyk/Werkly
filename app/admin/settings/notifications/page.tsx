import { AdminSettingsPanel } from "@/components/admin-settings-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminSettingsNotificationsPage() {
  return (
    <AdminShell
      eyebrow="Notification Settings"
      title="Manage reminder channels and delivery preferences."
      description="Configure browser, email, and WhatsApp reminder settings on a separate page."
    >
      <AdminSettingsPanel section="notifications" />
    </AdminShell>
  );
}
