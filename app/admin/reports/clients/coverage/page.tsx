import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminClientsCoverageReportPage() {
  return (
    <AdminShell
      eyebrow="Client Coverage"
      title="Review client ownership, linked jobs, and hiring volume."
      description="Track client onboarding, ownership, linked jobs, applications, joined count, and status on a dedicated client coverage screen."
    >
      <AdminReportsPanel module="clients" report="clients-coverage" />
    </AdminShell>
  );
}
