import { APP_STORE_LINK_NAME, APP_STORE_URL } from "@/lib/app-store";

type AppStoreBadgeProps = {
  className?: string;
};

/**
 * Official Apple "Download on the App Store" badge.
 * Artwork is not restyled. Height stays at Apple's 40px minimum.
 */
export function AppStoreBadge({ className = "" }: AppStoreBadgeProps) {
  return (
    <a
      href={APP_STORE_URL}
      aria-label={APP_STORE_LINK_NAME}
      className={`inline-flex shrink-0 rounded-md ${className}`}
    >
      {/* Official badge files. Served as-is so the artwork is not recompressed. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/app-store-badge-white.svg"
        alt=""
        width={120}
        height={40}
        className="app-store-badge-on-dark h-10 w-[120px]"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/app-store-badge-black.svg"
        alt=""
        width={120}
        height={40}
        className="app-store-badge-on-light h-10 w-[120px]"
      />
    </a>
  );
}
