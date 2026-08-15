/** Source-calendar chip colours — same mapping as Flutter calendar_chip_color.dart */

export const CALENDAR_FALLBACK_PALETTE = [
  "#E74C3C",
  "#27AE60",
  "#3B82F6",
  "#94A3B8",
  "#38BDF8",
  "#A855F7",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
  "#F97316",
] as const;

export const NATIVE_CALENDAR_COLOR = "#39FF14";

export type CalendarChipStyle = {
  fill: string;
  accent: string;
  foreground: string;
};

export function calendarChipStyle(input: {
  calendarColor?: string | null;
  externalCalendarId?: string | null;
  calendarId?: string | null;
  source?: string | null;
  lightSurface?: boolean;
}): CalendarChipStyle {
  const parsed = parseCalendarHex(input.calendarColor);
  const source = input.source ?? "native";
  let accent: string;
  if (parsed) {
    accent = parsed;
  } else if (source === "native" || source === "booking") {
    accent = NATIVE_CALENDAR_COLOR;
  } else {
    const key = (input.externalCalendarId || input.calendarId || source).trim();
    accent = key
      ? CALENDAR_FALLBACK_PALETTE[stableHash(key) % CALENDAR_FALLBACK_PALETTE.length]
      : NATIVE_CALENDAR_COLOR;
  }

  const mix = input.lightSurface ? 0.22 : 0.32;
  const base = input.lightSurface ? "#ffffff" : "#111111";
  const fill = mixHex(accent, base, mix);
  return {
    fill,
    accent,
    foreground: contrastingOn(fill),
  };
}

export function parseCalendarHex(raw?: string | null): string | null {
  if (!raw) return null;
  let hex = raw.trim();
  if (!hex) return null;
  if (hex.startsWith("#")) hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length === 8) hex = hex.slice(2);
  if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return `#${hex.toUpperCase()}`;
}

export function stableHash(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

function mixHex(fg: string, bg: string, amount: number): string {
  const a = hexToRgb(fg);
  const b = hexToRgb(bg);
  if (!a || !b) return fg;
  const r = Math.round(b.r + (a.r - b.r) * amount);
  const g = Math.round(b.g + (a.g - b.g) * amount);
  const bl = Math.round(b.b + (a.b - b.b) * amount);
  return rgbToHex(r, g, bl);
}

function contrastingOn(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#0A0B0D";
  const srgb = [rgb.r, rgb.g, rgb.b].map((c) => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  const l = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return l > 0.55 ? "#0A0B0D" : "#FFFFFF";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const parsed = parseCalendarHex(hex);
  if (!parsed) return null;
  const n = parsed.slice(1);
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}
