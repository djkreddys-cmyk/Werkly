export function AdminPanelLoading({ label = "Loading workspace..." }: { label?: string }) {
  return (
    <section className="border-b border-[var(--color-line)] py-4">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-dark)]" />
        <p className="muted-copy text-sm">{label}</p>
      </div>
    </section>
  );
}
