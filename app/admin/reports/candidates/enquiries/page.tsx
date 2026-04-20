import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminCandidatesEnquiriesReportPage() {
  return (
    <AdminShell
      eyebrow="Candidate Enquiries"
      title="Review general website candidate enquiries."
      description="Keep candidate enquiry records on a separate screen from job applicant pipeline so the team can review general interest independently."
    >
      <AdminReportsPanel module="candidates" report="candidates-enquiries" />
    </AdminShell>
  );
}
