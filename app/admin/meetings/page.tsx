import dynamic from "next/dynamic";
import { AdminShell } from "@/components/admin-shell";
import { AdminPanelLoading } from "@/components/admin-panel-loading";

const AdminMeetingsPanel = dynamic(
  () =>
    import("@/components/admin-meetings-panel").then(
      (module) => module.AdminMeetingsPanel
    ),
  {
    loading: () => <AdminPanelLoading label="Loading meetings..." />,
  }
);

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
