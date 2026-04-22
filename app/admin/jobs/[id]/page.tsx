import { AdminJobProfilePanel } from "@/components/admin-job-profile-panel";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminJobProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminShell
      eyebrow="Job Profile"
      title="Review one job in a proper detail page."
      description="Open recruiter ownership, linked client context, hiring snapshot, and timeline events on a full CRM page."
    >
      <AdminJobProfilePanel jobId={id} />
    </AdminShell>
  );
}
