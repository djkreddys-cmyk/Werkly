import { AdminResumeBuildersPanel } from "@/components/admin-resume-builders-panel";
import { AdminShell } from "@/components/admin-shell";

export default function AdminCandidateResumeBuildersPage() {
  return (
    <AdminShell
      eyebrow="Resume Builders"
      title="Review candidates who built resumes on the website."
      description="Every generated website resume is captured here with candidate contact details and a downloadable final resume copy."
    >
      <AdminResumeBuildersPanel />
    </AdminShell>
  );
}
