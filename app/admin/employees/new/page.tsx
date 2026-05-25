import { redirect } from "next/navigation";

export default function AdminNewEmployeesPage() {
  redirect("/admin/employees/existing");
}
