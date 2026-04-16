import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import * as jose from 'jose';
import type { UserRole } from '../generated/prisma';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type SupabaseJwtPayload = jwt.JwtPayload & {
  email?: string;
  user_metadata?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    given_name?: string;
    family_name?: string;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
      },
    });
    await this.prisma.subscription.create({
      data: { userId: user.id },
    });
    return this.issueTokenPair(
      user.id,
      user.email,
      user.role,
      user.firstName,
      user.lastName,
      user.avatarUrl ?? null,
    );
  }

  /**
   * Option C (hybrid): Flutter signs in with Supabase; exchanges access token for Nest JWTs.
   *
   * Verification supports:
   * - **Legacy:** `SUPABASE_JWT_SECRET` + HS256 (Dashboard “JWT secret” / symmetric).
   * - **Current Supabase:** `SUPABASE_URL` + JWKS at `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
   *   (ES256 / asymmetric — the “Key ID” in the dashboard is not a secret; use project URL).
   *
   * If both are set, HS256 is tried first, then JWKS (helps during migration).
   */
  async exchangeFromSupabaseAccessToken(accessToken: string) {
    const secret = this.config.get<string>('SUPABASE_JWT_SECRET');
    const supabaseUrl = this.config
      .get<string>('SUPABASE_URL')
      ?.trim()
      .replace(/\/$/, '');

    let payload: SupabaseJwtPayload | undefined;

    if (secret) {
      try {
        payload = jwt.verify(accessToken, secret, {
          algorithms: ['HS256'],
        }) as SupabaseJwtPayload;
      } catch {
        // Token may be ES256 after JWT signing migration — try JWKS if configured.
      }
    }

    if (!payload && supabaseUrl) {
      try {
        const JWKS = jose.createRemoteJWKSet(
          new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
        );
        const { payload: p } = await jose.jwtVerify(accessToken, JWKS, {
          issuer: `${supabaseUrl}/auth/v1`,
        });
        payload = p as SupabaseJwtPayload;
      } catch {
        throw new UnauthorizedException('Invalid Supabase access token');
      }
    }

    if (!payload) {
      if (!secret && !supabaseUrl) {
        throw new UnauthorizedException(
          'Configure SUPABASE_URL (JWKS) or SUPABASE_JWT_SECRET (legacy HS256) on the API',
        );
      }
      throw new UnauthorizedException('Invalid Supabase access token');
    }
    const email = payload.email?.toLowerCase().trim();
    if (!email) {
      throw new UnauthorizedException('Token has no email claim');
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const meta = payload.user_metadata ?? {};
      let firstName =
        meta.first_name ??
        meta.given_name ??
        (meta.full_name?.split(/\s+/).filter(Boolean)[0] ?? 'User');
      let lastName =
        meta.last_name ??
        meta.family_name ??
        (meta.full_name?.split(/\s+/).slice(1).join(' ') || ' ');
      if (lastName.trim().length === 0) lastName = ' ';
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: null,
          firstName: String(firstName).trim() || 'User',
          lastName: lastName.trim(),
        },
      });
      await this.prisma.subscription.create({
        data: { userId: user.id },
      });
    }

    await this.audit.log({
      action: 'auth.supabase_exchange',
      entityType: 'user',
      entityId: user.id,
      userId: user.id,
    });

    return this.issueTokenPair(
      user.id,
      user.email,
      user.role,
      user.firstName,
      user.lastName,
      user.avatarUrl,
    );
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    await this.audit.log({
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      userId: user.id,
    });
    return this.issueTokenPair(
      user.id,
      user.email,
      user.role,
      user.firstName,
      user.lastName,
      user.avatarUrl,
    );
  }

  async refresh(refreshToken: string) {
    const payload = this.jwtService.verify(refreshToken, {
      ignoreExpiration: false,
    });
    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const hash = this.hashRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, tokenHash: hash },
    });
    if (!stored) {
      throw new UnauthorizedException('Refresh token not found');
    }
    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh token expired');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokenPair(
      user.id,
      user.email,
      user.role,
      user.firstName,
      user.lastName,
      user.avatarUrl,
    );
  }

  async logout(refreshToken: string | null) {
    if (!refreshToken) return;
    try {
      const payload = this.jwtService.decode(refreshToken);
      if (payload?.type === 'refresh' && payload.sub) {
        const hash = this.hashRefreshToken(refreshToken);
        await this.prisma.refreshToken.deleteMany({
          where: { userId: payload.sub, tokenHash: hash },
        });
      }
    } catch {
      // ignore
    }
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    role: UserRole,
    firstName: string,
    lastName: string,
    avatarUrl?: string | null,
  ) {
    const accessToken = this.jwtService.sign(
      { sub: userId, email, role, type: 'access' },
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: '7d' },
    );
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
    const tokenHash = this.hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 min in seconds
      user: {
        id: userId,
        email,
        role,
        firstName,
        lastName,
        avatarUrl: avatarUrl ?? null,
      },
    };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async validateUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
      },
    });
  }

  async updateProfile(userId: string, dto: { avatarUrl?: string | null }) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.avatarUrl !== undefined && {
          avatarUrl: dto.avatarUrl || null,
        }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
      },
    });
    return updated;
  }
}
