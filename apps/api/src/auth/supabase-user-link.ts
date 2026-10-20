export type LinkableUser = {
  id: string;
  email: string;
  supabaseUserId: string | null;
  /** Present on Prisma rows. A non-empty hash means Nest password login still works. */
  passwordHash?: string | null;
};

export type SupabaseUserLinkDecision =
  | {
      action: 'use';
      userId: string;
      attachSupabaseId?: string;
      updateEmail?: string;
    }
  | { action: 'create' }
  | { action: 'conflict' };

function hasPassword(user: LinkableUser): boolean {
  return typeof user.passwordHash === 'string' && user.passwordHash.length > 0;
}

/**
 * Prefer the Supabase subject over email so Hide My Email vs a later
 * provider email does not silently attach the wrong Nest user.
 * Never sign a Supabase user into a Nest row that already belongs to a
 * different subject, and never attach them to a password account. An open
 * password signup could otherwise reserve the victim's email.
 */
export function decideSupabaseUserLink(input: {
  supabaseUserId: string;
  email: string;
  bySub: LinkableUser | null;
  byEmail: LinkableUser | null;
}): SupabaseUserLinkDecision {
  const { supabaseUserId, email, bySub, byEmail } = input;

  if (bySub) {
    const emailTakenByOther = !!byEmail && byEmail.id !== bySub.id;
    const updateEmail =
      bySub.email !== email && !emailTakenByOther ? email : undefined;
    return { action: 'use', userId: bySub.id, updateEmail };
  }

  if (byEmail) {
    if (byEmail.supabaseUserId === supabaseUserId) {
      return { action: 'use', userId: byEmail.id };
    }
    if (!byEmail.supabaseUserId && !hasPassword(byEmail)) {
      return {
        action: 'use',
        userId: byEmail.id,
        attachSupabaseId: supabaseUserId,
      };
    }
    return { action: 'conflict' };
  }

  return { action: 'create' };
}
