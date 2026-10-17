import { resolvePlanId } from '@daypilot/lib';

export const WAITLIST_STATUSES = ['open', 'handled', 'removed'] as const;

export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export function isWaitlistStatus(value: string): value is WaitlistStatus {
  return (WAITLIST_STATUSES as readonly string[]).includes(value);
}

export type FoundingDirectoryInput = {
  email?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  planId?: string | null;
  tier?: string | null;
  status?: string | null;
  founderNumber?: number | null;
  currentPeriodEnd?: Date | string | null;
  subscribedAt?: Date | string | null;
  claimCreatedAt?: Date | string | null;
};

export type WaitlistDirectoryInput = {
  id: string;
  email: string;
  requestedPlan?: string | null;
  plan?: string | null;
  status?: string | null;
  companyName?: string | null;
  teamSize?: string | null;
  createdAt: Date | string;
};

export type PeopleDirectory = {
  founding: {
    email: string | null;
    name: string | null;
    plan: string;
    status: string | null;
    founderNumber: number | null;
    currentPeriodEnd: string | null;
    subscribedAt: string | null;
    claimCreatedAt: string | null;
  }[];
  waitlist: {
    id: string;
    email: string;
    plan: string;
    status: string;
    companyName: string | null;
    teamSize: string | null;
    createdAt: string;
  }[];
};

function iso(value: Date | string | null | undefined): string | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function displayName(input: FoundingDirectoryInput): string | null {
  const explicit = input.name?.trim();
  if (explicit) return explicit;
  const joined = [input.firstName, input.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ');
  return joined || null;
}

/**
 * Owner directory. Copies only the fields the hub owner is allowed to see.
 * Extra keys on the input (tokens, password hashes) are dropped.
 */
export function toPeopleDirectory(input: {
  founding: FoundingDirectoryInput[];
  waitlist: WaitlistDirectoryInput[];
}): PeopleDirectory {
  return {
    founding: input.founding.map((row) => ({
      email: row.email?.trim() || null,
      name: displayName(row),
      plan: resolvePlanId(row.tier, row.planId),
      status: row.status ?? null,
      founderNumber: row.founderNumber ?? null,
      currentPeriodEnd: iso(row.currentPeriodEnd),
      subscribedAt: iso(row.subscribedAt),
      claimCreatedAt: iso(row.claimCreatedAt),
    })),
    waitlist: input.waitlist.map((row) => ({
      id: row.id,
      email: row.email.trim().toLowerCase(),
      plan: row.plan?.trim() || row.requestedPlan?.trim() || 'team',
      status: isWaitlistStatus(row.status ?? '')
        ? (row.status as string)
        : 'open',
      companyName: row.companyName?.trim() || null,
      teamSize: row.teamSize?.trim() || null,
      createdAt: iso(row.createdAt) ?? '',
    })),
  };
}
