/** Shared workspace/calendar colour palette — same hexes as Flutter workspace_colors.dart */

export type WorkspaceColorOption = {
  id: string;
  name: string;
  hex: string;
};

export const WORKSPACE_COLOR_PALETTE: readonly WorkspaceColorOption[] = [
  { id: "orange", name: "Orange", hex: "#F97316" },
  { id: "blue", name: "Blue", hex: "#3B82F6" },
  { id: "purple", name: "Purple", hex: "#7C3AED" },
  { id: "lavender", name: "Lavender", hex: "#C084FC" },
  { id: "green", name: "Green", hex: "#3D9B6A" },
  { id: "teal", name: "Teal", hex: "#14B8A6" },
  { id: "pink", name: "Pink", hex: "#EC4899" },
  { id: "amber", name: "Amber", hex: "#F59E0B" },
  { id: "red", name: "Red", hex: "#EF4444" },
  { id: "sky", name: "Sky", hex: "#38BDF8" },
] as const;

export const DEFAULT_WORKSPACE_SEEDS = [
  { name: "Personal", type: "personal", color: "#F97316" },
  { name: "Work", type: "work", color: "#3B82F6" },
  { name: "Side Projects", type: "side", color: "#7C3AED" },
  { name: "School", type: "school", color: "#C084FC" },
] as const;

export function normalizeColorHex(raw?: string | null): string | null {
  if (!raw) return null;
  let hex = raw.trim();
  if (!hex) return null;
  if (hex.startsWith("#")) hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length === 8) hex = hex.slice(2);
  if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return `#${hex.toUpperCase()}`;
}

export function usedWorkspaceColors(
  workspaces: Array<{ id: string; color: string }>,
  exceptId?: string | null
): Set<string> {
  const used = new Set<string>();
  for (const ws of workspaces) {
    if (exceptId && ws.id === exceptId) continue;
    const hex = normalizeColorHex(ws.color);
    if (hex) used.add(hex);
  }
  return used;
}

export function isWorkspaceColorTaken(
  hex: string,
  workspaces: Array<{ id: string; color: string }>,
  exceptId?: string | null
): boolean {
  const normalized = normalizeColorHex(hex);
  if (!normalized) return false;
  return usedWorkspaceColors(workspaces, exceptId).has(normalized);
}

export function firstFreeWorkspaceColor(
  workspaces: Array<{ id: string; color: string }>,
  exceptId?: string | null
): string {
  const used = usedWorkspaceColors(workspaces, exceptId);
  const free = WORKSPACE_COLOR_PALETTE.find((c) => !used.has(c.hex));
  return free?.hex ?? WORKSPACE_COLOR_PALETTE[0].hex;
}

export function paletteOptionForHex(hex?: string | null): WorkspaceColorOption | undefined {
  const normalized = normalizeColorHex(hex);
  if (!normalized) return undefined;
  return WORKSPACE_COLOR_PALETTE.find((c) => c.hex === normalized);
}
