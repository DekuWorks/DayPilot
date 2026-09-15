import {
  assertDeleteAccountConfirm,
  assertSupabaseAdminEnv,
  requireUserForDeletion,
} from './delete-account';

describe('delete-account helpers', () => {
  it('accepts typed DELETE confirmation', () => {
    expect(() => assertDeleteAccountConfirm('DELETE')).not.toThrow();
  });

  it('rejects non-DELETE confirmation', () => {
    expect(() => assertDeleteAccountConfirm('delete')).toThrow(
      /Confirmation must be DELETE/,
    );
  });

  it('requires an existing user', () => {
    expect(() => requireUserForDeletion(null)).toThrow(/User not found/);
    expect(requireUserForDeletion({ id: 'u1' })).toEqual({ id: 'u1' });
  });

  it('requires Supabase admin env when deleting auth users', () => {
    expect(() =>
      assertSupabaseAdminEnv({ supabaseUrl: '', serviceRoleKey: 'x' }),
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(
      assertSupabaseAdminEnv({
        supabaseUrl: 'https://example.supabase.co/',
        serviceRoleKey: 'service-role',
      }),
    ).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      serviceRoleKey: 'service-role',
    });
  });
});
