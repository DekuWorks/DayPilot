export type LinkableUser = {
  id: string;
  email: string;
  supabaseUserId: string | null;
};

export type SupabaseUserLinkDecision =
  | {
      action: 'use';
      userId: string;
      attachSupabaseId?: string;
      updateEmail?: string;
    }
  | { action: 'create' };

/**
 * Prefer the Supabase subject over email so Hide My Email vs a later
 * provider email does not silently attach the wrong Nest user.
 * Never overwrite a supabaseUserId that already belongs to someone else.
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
    if (!byEmail.supabaseUserId) {
      return {
        action: 'use',
        userId: byEmail.id,
        attachSupabaseId: supabaseUserId,
      };
    }
    if (byEmail.supabaseUserId === supabaseUserId) {
      return { action: 'use', userId: byEmail.id };
    }
    return { action: 'use', userId: byEmail.id };
  }

  return { action: 'create' };
}
