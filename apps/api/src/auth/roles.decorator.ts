import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../generated/prisma';
import { ROLES_KEY } from './roles.guard';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
