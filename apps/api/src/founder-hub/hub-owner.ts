export type AdminRow = { id: string; role: string };

export type HubOwnerResolution =
  | { userId: string; source: 'env' | 'single_admin' }
  | { userId: null; source: 'none' | 'ambiguous' | 'env_not_admin' };

/**
 * The hub owner is a DayPilot administrator already stored on the user row.
 * FOUNDER_HUB_OWNER_USER_ID is an optional server env when more than one
 * ADMIN exists. It is never read from the client, and it is not an email.
 * This function does not invent an id.
 */
export function resolveHubOwner(input: {
  admins: AdminRow[];
  envUserId?: string | null;
}): HubOwnerResolution {
  const admins = input.admins.filter((row) => row.role === 'ADMIN');
  const envUserId = input.envUserId?.trim() || '';
  if (envUserId) {
    return admins.some((row) => row.id === envUserId)
      ? { userId: envUserId, source: 'env' }
      : { userId: null, source: 'env_not_admin' };
  }
  if (admins.length === 1) {
    return { userId: admins[0].id, source: 'single_admin' };
  }
  if (admins.length === 0) return { userId: null, source: 'none' };
  return { userId: null, source: 'ambiguous' };
}
