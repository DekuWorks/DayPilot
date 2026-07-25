export type ButtonVariant = "primary" | "secondary" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export function buttonClassName({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-[var(--radius-md)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background-primary)] disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-[var(--brand-500)] text-[var(--text-inverse)] hover:bg-[var(--brand-400)] active:bg-[var(--brand-600)] shadow-sm hover:shadow-[0_0_24px_rgba(66,232,95,0.25)] active:scale-[0.98]",
    secondary:
      "bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--brand-500)] hover:text-[var(--brand-500)] active:scale-[0.98]",
    outline:
      "border border-[var(--brand-500)] text-[var(--brand-500)] bg-transparent hover:bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] active:scale-[0.98]",
  };

  const sizes = {
    sm: "px-4 py-2 text-[var(--text-caption)] min-h-9",
    md: "px-5 py-2.5 text-[var(--text-button)] min-h-11",
    lg: "px-6 py-3 text-[var(--text-body)] min-h-12",
  };

  return `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;
}
