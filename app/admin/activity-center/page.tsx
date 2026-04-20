import { AdminActivityCenter } from "@/components/admin-activity-center";
import { AdminShell } from "@/components/admin-shell";

export default function AdminActivityCenterPage() {
  return (
    <AdminShell
      eyebrow="Activity Center"
      title="Track operational movement across the CRM."
      description="Review audit logs, candidate movement, transfer approvals, and notifications from one activity center instead of checking each module separately."
    >
      <AdminActivityCenter />
    </AdminShell>
  );
}
