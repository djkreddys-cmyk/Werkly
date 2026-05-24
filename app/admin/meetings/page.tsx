import { AdminMeetingsPanel } from "@/components/admin-meetings-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminMeetingsPage() {
  return (
    <AdminShell
      eyebrow="Team Meetings"
      title="Create secure internal room links for team conversations."
      description="Generate meeting links, invite active employees, and open internal rooms from the CRM without relying on public meeting URLs."
    >
      <AdminMeetingsPanel />
    </AdminShell>
  );
}
