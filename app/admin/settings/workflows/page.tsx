import { AdminShell } from "@/components/admin-shell";
import { AdminWorkflowSettings } from "@/components/admin-workflow-settings";

export default function AdminSettingsWorkflowsPage() {
  return (
    <AdminShell
      eyebrow="Workflow Settings"
      title="Manage approvals and SLA rules."
      description="Control approval-backed workflows and escalation logic from one settings page."
    >
      <AdminWorkflowSettings />
    </AdminShell>
  );
}
