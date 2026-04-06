import { AdminLoginForm } from "@/components/admin-login-form";
import { AdminShell } from "@/components/admin-shell";

export default function AdminLoginPage() {
  return (
    <AdminShell
      eyebrow="Werkly CRM"
      title="Sign in to the internal recruitment workspace."
      description="Use employee credentials to access client assignments, active openings, candidate activity, and end-of-day follow-up reporting."
      showMenu={false}
    >
      <AdminLoginForm />
    </AdminShell>
  );
}
