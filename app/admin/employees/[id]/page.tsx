import { AdminEmployeeProfilePanel } from "@/components/admin-employee-profile-panel";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminEmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminShell
      eyebrow="Employee Profile"
      title="Review one employee in a dedicated CRM page."
      description="Open employee details, qualifications, experience, status updates, and timeline events without squeezing everything into a table row."
    >
      <AdminEmployeeProfilePanel employeeId={id} />
    </AdminShell>
  );
}
