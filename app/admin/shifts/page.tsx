import { AdminShell } from "@/components/admin-shell";
import { AdminShiftsPanel } from "@/components/admin-shifts-panel";

export default function AdminShiftsPage() {
  return (
    <AdminShell
      eyebrow="Shift Management"
      title="Create shifts and assign them to staff."
      description="Maintain multiple shift templates, assign them by effective dates, and keep future shift changes organized from one HR screen."
    >
      <AdminShiftsPanel />
    </AdminShell>
  );
}
