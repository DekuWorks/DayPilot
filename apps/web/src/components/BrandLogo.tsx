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
  // Prefer optimized raster mark (real bevelled brand asset) over SVG approximation.
  const src =
    size <= 40
      ? "/brand/daypilot-logo-mark-64.png"
      : size <= 96
        ? "/brand/daypilot-logo-mark-128.png"
        : "/brand/daypilot-logo-mark.png";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 font-bold text-[var(--text-primary)] hover:opacity-90 transition-opacity ${className}`}
    >
      <Image
        src={src}
        alt="DayPilot"
        width={size}
        height={size}
        className="shrink-0 rounded-[22%]"
        style={{ width: size, height: size }}
        priority
      />
      {showWordmark && (
        <span className="text-xl md:text-2xl tracking-tight">DayPilot</span>
      )}
    </Link>
  );
}
