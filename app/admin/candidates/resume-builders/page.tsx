import { AdminShell } from "@/components/admin-shell";
import { AdminCandidatesWorkspace } from "@/components/admin-candidates-workspace";

export default function AdminCandidateResumeBuildersPage() {
  return (
    <AdminShell
      eyebrow="Candidates"
      title="Manage every candidate source in one workspace."
      description="Switch between job applicants, resume builder submissions, and candidate enquiries without leaving the Candidates page."
    >
      <AdminCandidatesWorkspace initialView="resume-builders" />
    </AdminShell>
  );
}
