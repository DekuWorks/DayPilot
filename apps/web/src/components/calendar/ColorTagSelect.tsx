"use client";

import type { Workspace } from "@/lib/workspaces-supabase";
import {
  WORKSPACE_COLOR_PALETTE,
  normalizeColorHex,
  usedWorkspaceColors,
} from "@/lib/workspace-colors";

const fieldClass =
  "w-full px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand-500)] focus:border-[var(--brand-500)]";

export function WorkspaceSelect({
  workspaces,
  value,
  onChange,
}: {
  workspaces: Workspace[];
  value: string;
  onChange: (workspaceId: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
        Workspace
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClass} appearance-none pr-10`}
        >
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
        {value && (
          <span
            className="pointer-events-none absolute right-9 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
            style={{
              background:
                workspaces.find((w) => w.id === value)?.color ?? "transparent",
            }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

export function ColorTagSelect({
  workspaces,
  workspaceId,
  value,
  onChange,
}: {
  workspaces: Workspace[];
  workspaceId: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const used = usedWorkspaceColors(workspaces, workspaceId);
  const current = normalizeColorHex(value);

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
        Colour tag
      </label>
      <div className="relative">
        <select
          value={current ?? ""}
          onChange={(e) => {
            const next = e.target.value;
            if (used.has(next)) return;
            onChange(next);
          }}
          className={`${fieldClass} appearance-none pr-10`}
        >
          {WORKSPACE_COLOR_PALETTE.map((option) => {
            const taken = used.has(option.hex);
            const owner = taken
              ? workspaces.find(
                  (w) => normalizeColorHex(w.color) === option.hex
                )
              : undefined;
            return (
              <option
                key={option.hex}
                value={option.hex}
                disabled={taken}
              >
                {taken
                  ? `${option.name} — used by ${owner?.name ?? "another workspace"}`
                  : option.name}
              </option>
            );
          })}
        </select>
        <span
          className="pointer-events-none absolute right-9 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
          style={{ background: current ?? "transparent" }}
          aria-hidden
        />
      </div>
      <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
        Used colours stay visible but locked to one workspace.
      </p>
    </div>
  );
}

export { fieldClass };
