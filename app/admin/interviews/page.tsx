import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

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
