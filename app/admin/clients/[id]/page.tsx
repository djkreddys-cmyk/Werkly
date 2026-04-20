import { AdminClientProfilePanel } from "@/components/admin-client-profile-panel";
import { AdminShell } from "@/components/admin-shell";

type ClientProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminClientProfilePage({
  params,
}: ClientProfilePageProps) {
  const { id } = await params;

  return (
    <AdminShell
      eyebrow="Client Profile"
      title="Review client onboarding, ownership, and follow-up activity."
      description="Open one client account to see company details, linked jobs, and follow-up history in a proper CRM view."
    >
      <AdminClientProfilePanel clientId={id} />
    </AdminShell>
  );
}
