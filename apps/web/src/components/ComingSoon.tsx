import Link from "next/link";
import { Button } from "@/components/Button";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-500)]">
        Coming soon
      </p>
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
      <p className="text-[var(--text-secondary)] leading-relaxed">{description}</p>
      <Link href="/dashboard">
        <Button variant="outline">Back to Home</Button>
      </Link>
    </div>
  );
}
