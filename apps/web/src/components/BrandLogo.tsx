import Image from "next/image";
import Link from "next/link";

export function BrandLogo({
  href = "/",
  size = 32,
  showWordmark = true,
  className = "",
  onClick,
}: {
  href?: string;
  size?: number;
  showWordmark?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 font-bold text-[var(--text-primary)] hover:opacity-90 transition-opacity ${className}`}
    >
      <Image
        src="/brand/daypilot-logo-mark.png"
        alt="DayPilot"
        width={size}
        height={size}
        className="shrink-0"
        style={{ width: size, height: size }}
        priority
        unoptimized
      />
      {showWordmark && (
        <span className="text-xl md:text-2xl tracking-tight">DayPilot</span>
      )}
    </Link>
  );
}
