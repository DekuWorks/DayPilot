export type AdminRow = { id: string; role: string };

export type HubOwnerResolution =
  | { userId: string; source: 'env' | 'single_admin' }
  | { userId: null; source: 'none' | 'ambiguous' | 'env_not_admin' };

/**
 * Hub owner, in order:
 * 1. FOUNDER_HUB_OWNER_USER_ID when that id is a stored user. Signup leaves
 *    role USER, so the designated owner does not also have to be ADMIN.
 * 2. The only user whose role is ADMIN, when the env id is unset.
 * The id is never read from the client, and it is not an email.
 * This function does not invent an id.
 */
export function resolveHubOwner(input: {
  admins: AdminRow[];
  envUserId?: string | null;
  /** True when envUserId matches a user row. Omitted means "not confirmed". */
  envUserExists?: boolean;
}): HubOwnerResolution {
  const admins = input.admins.filter((row) => row.role === 'ADMIN');
  const envUserId = input.envUserId?.trim() || '';
  if (envUserId) {
    const designated =
      admins.some((row) => row.id === envUserId) ||
      input.envUserExists === true;
    return designated
      ? { userId: envUserId, source: 'env' }
      : { userId: null, source: 'env_not_admin' };
  }
  if (admins.length === 1) {
    return { userId: admins[0].id, source: 'single_admin' };
  }
  if (admins.length === 0) return { userId: null, source: 'none' };
  return { userId: null, source: 'ambiguous' };
}
