import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Pure guards for DELETE /auth/me — kept separate so Jest can cover without Prisma.
 */
export function assertDeleteAccountConfirm(confirm: string): void {
  if (confirm !== 'DELETE') {
    throw new BadRequestException('Confirmation must be DELETE');
  }
}

export function requireUserForDeletion<T>(user: T | null | undefined): T {
  if (!user) {
    throw new NotFoundException('User not found');
  }
  return user;
}

export function assertSupabaseAdminEnv(opts: {
  supabaseUrl?: string | null;
  serviceRoleKey?: string | null;
}): { supabaseUrl: string; serviceRoleKey: string } {
  const supabaseUrl = opts.supabaseUrl?.trim().replace(/\/$/, '') ?? '';
  const serviceRoleKey = opts.serviceRoleKey?.trim() ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new ServiceUnavailableException(
      'Account deletion requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the API',
    );
  }
  return { supabaseUrl, serviceRoleKey };
}
