import { AdminShell } from "@/components/admin-shell";
import { AdminSavedViewsPanel } from "@/components/admin-saved-views-panel";

export default function AdminSettingsSavedViewsPage() {
  return (
    <AdminShell
      eyebrow="Saved Views"
      title="Review saved filters and current-view presets."
      description="Manage reusable filter combinations so recruiters and admins can reopen the right CRM view faster."
    >
      <AdminSavedViewsPanel />
    </AdminShell>
  );
}
