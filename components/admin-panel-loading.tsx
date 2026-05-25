export function AdminPanelLoading({ label = "Loading workspace..." }: { label?: string }) {
  return (
    <section className="accent-card p-6">
      <p className="muted-copy text-sm">{label}</p>
    </section>
  );
}
