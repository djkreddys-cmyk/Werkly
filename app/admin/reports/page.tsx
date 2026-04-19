import { AdminReportsPanel } from "@/components/admin-reports-panel";
import { AdminShell } from "@/components/admin-shell";

type AdminReportsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminReportsPage({
  searchParams,
}: AdminReportsPageProps) {
  const resolvedSearchParams = await searchParams;
  const reportView = Array.isArray(resolvedSearchParams.view)
    ? resolvedSearchParams.view[0]
    : resolvedSearchParams.view;

  return (
    <AdminShell
      eyebrow="Reports"
      title="Review recruiter follow-ups and hiring movement."
      description="Use stage totals and recruiter-wise workload reporting to understand delivery progress, ownership, and end-of-day follow-up coverage."
    >
      <AdminReportsPanel reportView={reportView} />
    </AdminShell>
  );
}
