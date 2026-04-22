import { AdminActivityCenter } from "@/components/admin-activity-center";
import { AdminShell } from "@/components/admin-shell";

export default function AdminSettingsActivityPage() {
  return (
    <AdminShell
      eyebrow="Activity Center"
      title="Review operational activity with employee-wise and date-wise filters."
      description="Track audit logs, candidate movement, transfer reviews, and notifications from a dedicated settings page."
    >
      <AdminActivityCenter />
    </AdminShell>
  );
}
