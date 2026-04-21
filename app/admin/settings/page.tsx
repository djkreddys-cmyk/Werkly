import { AdminSettingsPanel } from "@/components/admin-settings-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminSettingsPage() {
  return (
    <AdminShell
      eyebrow="CRM Settings"
      title="Manage KPI targets, reminder preferences, and frontend access control."
      description="Configure recruiter productivity targets, browser reminder behavior, and role-wise module plus field restrictions from one CRM settings page."
    >
      <AdminSettingsPanel />
    </AdminShell>
  );
}
