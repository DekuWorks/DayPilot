export function AuthLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-primary)]">
      <p className="text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}
