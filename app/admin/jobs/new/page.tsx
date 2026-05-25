import { redirect } from "next/navigation";

export default function AdminNewJobsPage() {
  redirect("/admin/jobs/existing");
}
