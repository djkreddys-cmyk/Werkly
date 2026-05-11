import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminCandidatesRecruiterProductivityReportPage() {
  return (
    <AdminShell
      eyebrow="Recruiter Productivity"
      title="Review recruiter candidate movement and outcomes."
      description="Compare applications handled, shortlisted candidates, interviews, offers, joins, rejections, and conversion rate by recruiter."
    >
      <AdminReportsPanel module="candidates" report="candidates-recruiter-productivity" />
    </AdminShell>
  );
}
