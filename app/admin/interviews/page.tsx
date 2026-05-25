import dynamic from "next/dynamic";
import { AdminShell } from "@/components/admin-shell";
import { AdminPanelLoading } from "@/components/admin-panel-loading";

const AdminReportsPanel = dynamic(
  () =>
    import("@/components/admin-reports-panel").then(
      (module) => module.AdminReportsPanel
    ),
  {
    loading: () => <AdminPanelLoading label="Loading interview scheduler..." />,
  }
);

export default function AdminInterviewSchedulerPage() {
  return (
    <AdminShell
      eyebrow="Interview Scheduler"
      title="Review scheduled interviews across candidates."
      description="Track interview time, candidate, job, client, recruiter, mode, panel, and reminder details in one scheduler view."
    >
      <AdminReportsPanel module="candidates" report="interview-scheduler" />
    </AdminShell>
  );
}
