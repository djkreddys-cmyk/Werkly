import { AdminCandidateProfilePanel } from "@/components/admin-candidate-profile-panel";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminCandidateProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminShell
      eyebrow="Candidate Profile"
      title="Review complete candidate ownership and movement."
      description="Open one candidate record with linked job details, recruiter assignment, current pipeline stage, and timeline visibility."
    >
      <AdminCandidateProfilePanel applicationId={id} />
    </AdminShell>
  );
}
