import { decideSupabaseUserLink } from './supabase-user-link';

const apple = {
  id: 'nest_apple',
  email: 'relay@privaterelay.appleid.com',
  supabaseUserId: 'sub-apple',
};

const gmail = {
  id: 'nest_gmail',
  email: 'user@gmail.com',
  supabaseUserId: null as string | null,
};

describe('decideSupabaseUserLink', () => {
  it('finds an existing user by Supabase subject first', () => {
    expect(
      decideSupabaseUserLink({
        supabaseUserId: 'sub-apple',
        email: 'relay@privaterelay.appleid.com',
        bySub: apple,
        byEmail: apple,
      }),
    ).toEqual({ action: 'use', userId: 'nest_apple' });
  });

  it('updates email when the same subject returns a new unused address', () => {
    expect(
      decideSupabaseUserLink({
        supabaseUserId: 'sub-apple',
        email: 'new@icloud.com',
        bySub: apple,
        byEmail: null,
      }),
    ).toEqual({
      action: 'use',
      userId: 'nest_apple',
      updateEmail: 'new@icloud.com',
    });
  });

  it('does not steal an email already owned by another Nest user', () => {
    expect(
      decideSupabaseUserLink({
        supabaseUserId: 'sub-apple',
        email: 'user@gmail.com',
        bySub: apple,
        byEmail: { ...gmail, supabaseUserId: 'sub-google' },
      }),
    ).toEqual({ action: 'use', userId: 'nest_apple' });
  });

  it('attaches a missing supabase id onto the email match', () => {
    expect(
      decideSupabaseUserLink({
        supabaseUserId: 'sub-google',
        email: 'user@gmail.com',
        bySub: null,
        byEmail: gmail,
      }),
    ).toEqual({
      action: 'use',
      userId: 'nest_gmail',
      attachSupabaseId: 'sub-google',
    });
  });

  it('creates when neither subject nor email exists', () => {
    expect(
      decideSupabaseUserLink({
        supabaseUserId: 'sub-new',
        email: 'new@example.com',
        bySub: null,
        byEmail: null,
      }),
    ).toEqual({ action: 'create' });
  });
});
