import dynamic from "next/dynamic";
import { AdminShell } from "@/components/admin-shell";
import { AdminPanelLoading } from "@/components/admin-panel-loading";

const AdminCandidatesPanel = dynamic(
  () =>
    import("@/components/admin-candidates-panel").then(
      (module) => module.AdminCandidatesPanel
    ),
  {
    loading: () => <AdminPanelLoading label="Loading candidates..." />,
  }
);

export default function AdminCandidatesPage() {
  return (
    <AdminShell
      eyebrow="Job Applicants"
      title="Track candidates who applied to specific jobs."
      description="Review job applicants in one CRM table, search by mandate or recruiter, and move each profile through applied, shortlisted, interview, offer, and joined stages."
    >
      <AdminCandidatesPanel />
    </AdminShell>
  );
}
