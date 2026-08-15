"use client";

type SsoBrand = "google" | "apple" | "microsoft";

const STYLES: Record<
  SsoBrand,
  { bg: string; border: string; fg: string; darkInvertApple?: boolean }
> = {
  google: {
    bg: "#ffffff",
    border: "#747775",
    fg: "#1f1f1f",
  },
  microsoft: {
    bg: "#ffffff",
    border: "#8c8c8c",
    fg: "#5e5e5e",
  },
  apple: {
    bg: "#000000",
    border: "#000000",
    fg: "#ffffff",
    darkInvertApple: true,
  },
};

function Mark({ brand }: { brand: SsoBrand }) {
  if (brand === "google") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/sso/google_g.svg" alt="" width={18} height={18} />
    );
  }
  if (brand === "microsoft") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/sso/microsoft.svg" alt="" width={18} height={18} />
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M16.37 12.64c.03-2.27 1.86-3.36 1.94-3.41-1.06-1.55-2.71-1.76-3.29-1.78-1.4-.14-2.74.82-3.45.82-.71 0-1.81-.8-2.98-.78-1.53.02-2.95.89-3.74 2.26-1.6 2.77-.41 6.87 1.14 9.12.76 1.1 1.66 2.33 2.84 2.29 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.27 1.23-2.5 1.25-2.56-.03-.01-2.39-.92-2.42-3.64zM14.7 6.37c.63-.76 1.05-1.82.94-2.87-0.91.04-2.01.6-2.66 1.37-.58.67-1.1 1.76-.96 2.79 1.02.08 2.06-.52 2.68-1.29z"
      />
    </svg>
  );
}

export function SsoBrandButton({
  brand,
  label,
  onClick,
  busy,
  disabled,
  className = "",
}: {
  brand: SsoBrand;
  label: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const style = STYLES[brand];
  const appleDark =
    brand === "apple"
      ? "dark:bg-white dark:border-white dark:text-black"
      : "";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-full border px-4 text-[15px] font-semibold disabled:opacity-60 ${appleDark} ${className}`}
      style={{
        background: style.bg,
        borderColor: style.border,
        color: style.fg,
      }}
    >
      {busy ? (
        "Redirecting…"
      ) : (
        <>
          <Mark brand={brand} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export function ssoBrandForProvider(
  id: string
): SsoBrand | null {
  if (id === "google") return "google";
  if (id === "outlook") return "microsoft";
  if (id === "apple" || id === "apple_eventkit") return "apple";
  return null;
}

export function ssoConnectLabel(id: string, reconnect: boolean): string {
  const verb = reconnect ? "Reconnect" : "Connect";
  if (id === "google") return `${verb} Google Calendar`;
  if (id === "outlook") return `${verb} Outlook`;
  if (id === "apple" || id === "apple_eventkit") return `${verb} Apple Calendar`;
  return verb;
}
